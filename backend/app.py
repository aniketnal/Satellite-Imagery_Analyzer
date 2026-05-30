from flask import Flask, request, jsonify
from flask_cors import CORS
import ee
import json
import smtplib
import os
import ssl
from datetime import datetime, timedelta
from email.message import EmailMessage
from dotenv import load_dotenv
from supabase_db import (
    authenticate_user,
    get_all_analyses,
    get_all_users_with_analyses,
    get_user_analyses,
    record_authority_alert,
    register_user,
    save_analysis_for_user,
    seed_default_admin_user,
)

load_dotenv()

app = Flask(__name__)
CORS(app)

stored_geometry = None
ee_init_error = None


def initialize_earth_engine():
    global ee_init_error

    project = 'satellite-imagery-analyzer'
    try:
        if project:
            ee.Initialize(project=project)
        else:
            ee.Initialize()
        ee_init_error = None
    except Exception as exc:
        ee_init_error = str(exc)
        print("Earth Engine initialization failed:")
        print(ee_init_error)


def build_geometry_from_coordinates(coords):
    if not isinstance(coords, list) or len(coords) < 3:
        raise ValueError("Please provide at least 3 coordinate points.")

    fixed = []
    for point in coords:
        if not isinstance(point, list) or len(point) != 2:
            raise ValueError("Each coordinate must be [lat, lng].")
        fixed.append([point[1], point[0]])

    if fixed[0] != fixed[-1]:
        fixed.append(fixed[0])

    return ee.Geometry.Polygon([fixed]).simplify(50), fixed


def parse_period_years(period_value):
    if period_value == "current" or period_value is None:
        return 1

    try:
        years = int(period_value)
    except (TypeError, ValueError):
        years = 5

    return max(1, years)


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def _safe_float_env(name, default):
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return float(default)


def should_alert_authority(uss_score, vegetation_change_percent):
    uss_threshold = _safe_float_env("AUTHORITY_ALERT_USS_THRESHOLD", "1")
    deforestation_threshold = _safe_float_env("AUTHORITY_ALERT_DEFORESTATION_THRESHOLD", "-10")

    reasons = []
    if uss_score is not None and uss_score <= uss_threshold:
        reasons.append(
            f"USS score {uss_score} is at or below the configured alert threshold {uss_threshold}."
        )

    if vegetation_change_percent is not None and vegetation_change_percent <= deforestation_threshold:
        reasons.append(
            f"Vegetation change {vegetation_change_percent}% indicates heavy deforestation (threshold {deforestation_threshold}%)."
        )

    return reasons


def send_authority_alert(*, area_km2, period_years, veg_percent, urban_percent, water_percent, uss_data, reasons):
    recipient = os.getenv("AUTHORITY_ALERT_EMAIL", "nmc@gov.in")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_host = "smtp.gmail.com"
    smtp_port = 587
    sender = smtp_user or "no-reply@satellite-imagery-analyzer.local"

    if not smtp_user or not smtp_password:
        record_authority_alert(
            analysis_id=None,
            recipient_email=recipient,
            reasons=reasons,
            delivery_status="skipped",
            smtp_response="SMTP_USER and SMTP_PASSWORD must be configured to send alerts.",
        )
        return {
            "sent": False,
            "delivery": "skipped",
            "reason": "SMTP_USER and SMTP_PASSWORD must be configured to send alerts.",
        }

    message = EmailMessage()
    message["Subject"] = f"[Satellite Imagery Analyzer] Authority alert for area {area_km2:.2f} km²"
    message["From"] = sender
    message["To"] = recipient
    message.set_content(
        "\n".join([
            "An analysis has triggered an authority alert.",
            "",
            f"Area (km²): {area_km2:.2f}",
            f"Comparison period (years): {period_years}",
            f"USS score: {uss_data['uss_score']} / 100", 
            f"USS label: {uss_data['uss_label']}",
            f"Vegetation change (%): {veg_percent}",
            f"Urban change (%): {urban_percent}",
            f"Water change (%): {water_percent}",
            f"Temperature proxy (%): {uss_data['temperature_proxy_percent']}",
            "",
            "Trigger reasons:",
            *[f"- {reason}" for reason in reasons],
        ])
    )

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls(context=ssl.create_default_context())
            server.login(smtp_user, smtp_password)
            server.send_message(message)
    except Exception as exc:
        print("Authority alert email failed:")
        print(str(exc))
        record_authority_alert(
            analysis_id=None,
            recipient_email=recipient,
            reasons=reasons,
            delivery_status="failed",
            smtp_response=str(exc),
        )
        return {
            "sent": False,
            "delivery": "failed",
            "recipient": recipient,
            "reason": str(exc),
        }

    record_authority_alert(
        analysis_id=None,
        recipient_email=recipient,
        reasons=reasons,
        delivery_status="sent",
        smtp_response=None,
    )

    return {
        "sent": True,
        "delivery": "sent",
        "recipient": recipient,
    }


seed_default_admin_user()


def compute_uss_score(vegetation_change_percent, urban_change_percent, water_change_percent):
    """
    Compute a USS (Urban Sustainability Score) on a 1-100 scale.

    Higher USS means more urban sustainable conditions.
    Lower USS means less sustainable conditions and more environmental stress.
    """
    # Assumed weights; vegetation and water improve sustainability,
    # while urban growth and heat-pressure proxy reduce it.
    w1, w2, w3, w4 = 0.45, 0.30, 0.20, 0.05

    # Temperature is not directly available from Sentinel-2 here, so we use a
    # simple heat-pressure proxy based on urban expansion and vegetation loss.
    temperature_proxy = max(0.0, urban_change_percent + max(0.0, -vegetation_change_percent))

    sustainability_signal = (
        (w1 * vegetation_change_percent)
        + (w2 * water_change_percent)
        - (w3 * urban_change_percent)
        - (w4 * temperature_proxy)
    )

    score = clamp(round(50 + sustainability_signal * 2.5), 1, 100)

    if score >= 80:
        label = "Very sustainable"
    elif score >= 60:
        label = "Moderately sustainable"
    elif score >= 40:
        label = "Mixed sustainability"
    elif score >= 20:
        label = "Low sustainability"
    else:
        label = "Poor sustainability"

    interpretation = (
        "Higher USS means more urban sustainable and environmentally healthier. "
        "Lower USS means less sustainable with stronger environmental impact."
    )

    return {
        "uss_score": score,
        "uss_label": label,
        "uss_interpretation": interpretation,
        "uss_weights": {
            "w1": w1,
            "w2": w2,
            "w3": w3,
            "w4": w4,
        },
        "temperature_proxy_percent": round(temperature_proxy, 2),
    }


def get_gemini_insights(area_km2, period_years, vegetation_change, urban_change, water_change, uss_score=None, uss_label=None):
    try:
        uss_score_value = float(uss_score) if uss_score is not None else None
    except (TypeError, ValueError):
        uss_score_value = None

    uss_score_value = round(uss_score_value, 2) if uss_score_value is not None else None
    uss_label_value = uss_label or "Sustainability score"

    if uss_score_value is None:
        if vegetation_change >= 0 and urban_change <= 0 and water_change >= 0:
            score_meaning = "Conditions are relatively balanced with limited environmental stress."
        else:
            score_meaning = "The score reflects a mixed land-cover condition with room for sustainability improvements."
    elif uss_score_value >= 80:
        score_meaning = "Very sustainable: green cover and water conditions are strong relative to urban pressure."
    elif uss_score_value >= 60:
        score_meaning = "Moderately sustainable: the area is performing reasonably well, but pressure from urbanization is visible."
    elif uss_score_value >= 40:
        score_meaning = "Mixed sustainability: positive and negative land-cover changes are roughly balancing each other out."
    elif uss_score_value >= 20:
        score_meaning = "Low sustainability: the area shows clear pressure from urban growth or vegetation loss."
    else:
        score_meaning = "Poor sustainability: strong environmental stress is visible and immediate action is needed."

    vegetation_abs = abs(float(vegetation_change))
    urban_abs = abs(float(urban_change))
    water_abs = abs(float(water_change))
    period_text = f"{period_years} year{'s' if period_years != 1 else ''}"

    key_findings = [
        (
            f"Vegetation changed by {vegetation_change:.2f}% across the selected {area_km2:.2f} km² area over {period_text}, "
            f"which points to {'loss' if vegetation_change < 0 else 'gain'} in green cover."
        ),
        (
            f"Urban development shifted by {urban_change:.2f}%, showing {'expansion' if urban_change > 0 else 'limited growth or stabilisation'} "
            f"of built-up pressure in the area."
        ),
        (
            f"Water bodies changed by {water_change:.2f}%, suggesting {'reduced' if water_change < 0 else 'improved'} surface water availability."
        ),
        (
            f"USS {uss_score_value if uss_score_value is not None else 'N/A'}/100 means {score_meaning.lower()}"
        ),
        (
            f"The temperature-pressure proxy increases when urban expansion outpaces vegetation recovery, which can amplify heat stress and runoff."
        ),
    ]

    recommendations = [
        vegetation_change < 0
        and f"Protect and replant vegetation in the most affected pockets to recover at least part of the {vegetation_abs:.2f}% loss."
        or f"Preserve the current vegetation trend and use it as a baseline for future land-cover monitoring.",
        urban_change > 0
        and f"Review zoning, building density, and transport planning so the {urban_abs:.2f}% urban increase does not spread unchecked."
        or f"Keep urban growth under watch and prioritise compact development instead of outward sprawl.",
        water_change < 0
        and f"Audit drainage, encroachment, and seasonal water stress where the {water_abs:.2f}% water loss is visible."
        or f"Protect existing water bodies and create buffers so the current water gain remains stable.",
        f"Use the USS {uss_score_value if uss_score_value is not None else 'N/A'}/100 as a planning benchmark: scores below 40 need urgent intervention, 40-59 need active mitigation, and 60+ should be maintained.",
        f"Pair satellite findings with on-ground verification in the mapped {area_km2:.2f} km² area before final development decisions."
    ]

    return json.dumps({
        "summary": (
            f"The selected area has a USS of {uss_score_value if uss_score_value is not None else 'N/A'}/100. "
            f"{score_meaning} Vegetation, urban, and water trends indicate a {period_text} land-cover shift that should be managed through targeted sustainability actions."
        ),
        "score_meaning": score_meaning,
        "uss_label": uss_label_value,
        "key_findings": key_findings,
        "recommendations": recommendations,
    })


initialize_earth_engine()


@app.route("/auth/register", methods=["POST"])
def auth_register():
    payload = request.get_json(silent=True) or {}

    try:
        user = register_user(payload.get("name"), payload.get("email"), payload.get("password"))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Failed to register user: {str(exc)}"}), 500

    return jsonify({"user": user, "status": "registered"})


@app.route("/auth/login", methods=["POST"])
def auth_login():
    payload = request.get_json(silent=True) or {}

    try:
        user = authenticate_user(payload.get("email"), payload.get("password"))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Failed to login: {str(exc)}"}), 500

    return jsonify({"user": user, "status": "authenticated"})


@app.route("/auth/logout", methods=["POST"])
def auth_logout():
    return jsonify({"status": "logged_out"})


@app.route("/users/<user_id>/analyses", methods=["GET", "POST"])
def user_analyses(user_id):
    if request.method == "GET":
        try:
            analyses = get_user_analyses(user_id)
        except Exception as exc:
            return jsonify({"error": f"Failed to load analyses: {str(exc)}"}), 500

        return jsonify({"analyses": analyses})

    payload = request.get_json(silent=True) or {}
    report_state = payload.get("reportState")
    analysis_result = payload.get("analysisData") or (report_state or {}).get("analysisData") or {}

    if not report_state:
        return jsonify({"error": "reportState is required."}), 400

    try:
        saved = save_analysis_for_user(user_id, report_state, analysis_result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Failed to save analysis: {str(exc)}"}), 500

    return jsonify({"analysis": saved, "status": "saved"})


@app.route("/admin/users", methods=["GET"])
def admin_users():
    try:
        users = get_all_users_with_analyses()
    except Exception as exc:
        return jsonify({"error": f"Failed to load users: {str(exc)}"}), 500

    return jsonify({"users": users})


@app.route("/admin/analyses", methods=["GET"])
def admin_analyses():
    try:
        analyses = get_all_analyses()
    except Exception as exc:
        return jsonify({"error": f"Failed to load analyses: {str(exc)}"}), 500

    return jsonify({"analyses": analyses})

# ---------------- SET COORDINATES ----------------


@app.route("/set-coordinates", methods=["POST"])
def set_coordinates():
    global stored_geometry

    if ee_init_error:
        return jsonify({"error": f"Earth Engine not initialized: {ee_init_error}"}), 500

    coords = (request.json or {}).get("coordinates")

    try:
        geometry, fixed = build_geometry_from_coordinates(coords)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    # Log final coordinates exactly as sent to GEE
    print("\n==================== COORDINATES SENT TO GEE ====================")
    print(f"Total Points (including closing coord): {len(fixed)}")
    for i, point in enumerate(fixed):
        label = " (closing)" if i == len(fixed) - 1 else ""
        print(f"  Point {i + 1}: lng={point[0]}, lat={point[1]}{label}")
    print("==================================================================\n")

    # ---- AREA LIMITER (km²) ----
    area = geometry.area().divide(1e6).getInfo()

    if area > 50:
        stored_geometry = None
        return jsonify({
            "error": "Selected area too large. Please select under 50 km²."
        }), 400

    stored_geometry = geometry

    return jsonify({
        "status": "geometry stored",
        "area_km2": round(area, 2)
    })


# ---------------- MULTI TEMPORAL PREVIEWS ----------------

@app.route("/get-multi-image", methods=["GET"])
def get_multi_image():
    global stored_geometry

    if stored_geometry is None:
        return jsonify({"error": "geometry not set"}), 400

    year_offsets = [0, 3, 5, 7, 10]
    today = datetime.today()
    previews = []

    for offset in year_offsets:

        end = today - timedelta(days=365 * offset)
        start = end - timedelta(days=365)

        if offset <= 7:
            collection_id = "COPERNICUS/S2_SR_HARMONIZED"
            bands = ["B4", "B3", "B2"]
            scale = 60
        else:
            collection_id = "LANDSAT/LC08/C02/T1_L2"
            bands = ["SR_B4", "SR_B3", "SR_B2"]
            scale = 120

        collection = ee.ImageCollection(collection_id) \
            .filterBounds(stored_geometry) \
            .filterDate(start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))

        image = collection.median().clip(stored_geometry)

        url = image.visualize(bands=bands, min=0, max=3000).getThumbURL({
            "region": stored_geometry,
            "dimensions": 512
        })

        previews.append({
            "years_ago": offset,
            "preview": url
        })

    return jsonify({"images": previews})


# ---------------- ANALYSIS ----------------

@app.route("/run-analysis", methods=["GET", "POST"])
def run_analysis():
    global stored_geometry

    if ee_init_error:
        return jsonify({"error": f"Earth Engine not initialized: {ee_init_error}"}), 500

    payload = request.get_json(silent=True) or {}

    analysis_geometry = stored_geometry
    if request.method == "POST" and payload.get("coordinates"):
        try:
            analysis_geometry, _ = build_geometry_from_coordinates(payload.get("coordinates"))
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    if analysis_geometry is None:
        return jsonify({"error": "geometry not set"}), 400

    area = analysis_geometry.area().divide(1e6).getInfo()
    if area > 50:
        return jsonify({"error": "Selected area too large. Please select under 50 km²."}), 400

    period_years = parse_period_years(payload.get("period"))

    collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED") \
        .filterBounds(analysis_geometry)

    today = datetime.today()
    recent_start = today - timedelta(days=365 * period_years)
    old_start = recent_start - timedelta(days=365 * period_years)

    recent = collection.filterDate(
        recent_start.strftime("%Y-%m-%d"),
        today.strftime("%Y-%m-%d")
    ).median()

    old = collection.filterDate(
        old_start.strftime("%Y-%m-%d"),
        recent_start.strftime("%Y-%m-%d")
    ).median()

    ndvi_recent = recent.normalizedDifference(["B8", "B4"])
    ndvi_old = old.normalizedDifference(["B8", "B4"])

    ndbi_recent = recent.normalizedDifference(["B11", "B8"])
    ndbi_old = old.normalizedDifference(["B11", "B8"])

    ndwi_recent = recent.normalizedDifference(["B3", "B8"])
    ndwi_old = old.normalizedDifference(["B3", "B8"])

    veg_change = ndvi_recent.subtract(ndvi_old)
    urban_change = ndbi_recent.subtract(ndbi_old)
    water_change = ndwi_recent.subtract(ndwi_old)

    veg = veg_change.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=analysis_geometry,
        scale=120,
        bestEffort=True,
        maxPixels=1e8
    ).getInfo().get("nd")

    urban = urban_change.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=analysis_geometry,
        scale=120,
        bestEffort=True,
        maxPixels=1e8
    ).getInfo().get("nd")

    water = water_change.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=analysis_geometry,
        scale=120,
        bestEffort=True,
        maxPixels=1e8
    ).getInfo().get("nd")

    if veg is None or urban is None or water is None:
        return jsonify({"error": "Could not compute analysis values for selected region/time."}), 400

    veg_percent = round(veg * 100, 2)
    urban_percent = round(urban * 100, 2)
    water_percent = round(water * 100, 2)
    uss_data = compute_uss_score(veg_percent, urban_percent, water_percent)

    print("\n==================== ANALYSIS RESULTS ====================")
    print(f"Vegetation Change (%): {veg_percent}")
    print(f"Urban Change (%)     : {urban_percent}")
    print(f"Water Change (%)     : {water_percent}")
    print(f"USS Score            : {uss_data['uss_score']} / 100")
    print(f"USS Interpretation   : {uss_data['uss_interpretation']}")
    print("==========================================================\n")

    alert_reasons = should_alert_authority(uss_data["uss_score"], veg_percent)
    authority_alert = {
        "triggered": bool(alert_reasons),
        "reasons": alert_reasons,
        "delivery": None,
    }

    if alert_reasons:
        authority_alert.update(
            send_authority_alert(
                area_km2=round(area, 2),
                period_years=period_years,
                veg_percent=veg_percent,
                urban_percent=urban_percent,
                water_percent=water_percent,
                uss_data=uss_data,
                reasons=alert_reasons,
            )
        )

    return jsonify({
        "vegetation_change_percent": veg_percent,
        "urban_change_percent": urban_percent,
        "water_change_percent": water_percent,
        "uss_score": uss_data["uss_score"],
        "uss_label": uss_data["uss_label"],
        "uss_interpretation": uss_data["uss_interpretation"],
        "uss_weights": uss_data["uss_weights"],
        "temperature_proxy_percent": uss_data["temperature_proxy_percent"],
        "period_years": period_years,
        "area_km2": round(area, 2),
        "authority_alert": authority_alert,
        "status": "completed"
    })


@app.route("/generate-insights", methods=["POST"])
def generate_insights():
    payload = request.get_json(silent=True) or {}

    try:
        area_km2 = float(payload.get("area_km2"))
        period_years = int(payload.get("period_years"))
        vegetation_change = float(payload.get("vegetation_change_percent"))
        urban_change = float(payload.get("urban_change_percent"))
        water_change = float(payload.get("water_change_percent"))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid or missing analysis values."}), 400

    try:
        insights_text = get_gemini_insights(
            area_km2=area_km2,
            period_years=period_years,
            vegetation_change=vegetation_change,
            urban_change=urban_change,
            water_change=water_change
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 500
    except Exception as exc:
        return jsonify({"error": f"Failed to generate insights: {str(exc)}"}), 500

    try:
        import json
        insights = json.loads(insights_text)
    except Exception:
        return jsonify({"error": "Gemini returned an invalid response format."}), 500

    if not isinstance(insights, dict):
        return jsonify({"error": "Gemini response is not a valid object."}), 500

    return jsonify({"insights": insights})


if __name__ == "__main__":
    app.run(debug=True)
