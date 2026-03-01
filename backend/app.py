from flask import Flask, request, jsonify
from flask_cors import CORS
import ee
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

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


def get_gemini_insights(area_km2, period_years, vegetation_change, urban_change, water_change):
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured on the server.")

    try:
        genai = __import__("google.generativeai", fromlist=["GenerativeModel"])
    except Exception:
        raise ValueError("Gemini SDK is not installed on the server.")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)

    prompt = f"""
You are an environmental planning analyst.
Given this satellite change data, provide actionable insights.

Area (km²): {area_km2}
Comparison period (years): {period_years}
Vegetation change (%): {vegetation_change}
Urban change (%): {urban_change}
Water change (%): {water_change}

Return strict JSON with this schema only:
{{
  "summary": "short 1-2 sentence interpretation",
  "key_findings": ["3 to 5 concise findings"],
  "recommendations": ["3 to 5 actionable recommendations"]
}}

Rules:
- No markdown
- No extra keys
- Recommendations must be specific and practical for city planners
"""

    response = model.generate_content(prompt)
    text = (response.text or "").strip()

    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()

    return text


initialize_earth_engine()

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

    print("\n==================== ANALYSIS RESULTS ====================")
    print(f"Vegetation Change (%): {veg_percent}")
    print(f"Urban Change (%)     : {urban_percent}")
    print(f"Water Change (%)     : {water_percent}")
    print("==========================================================\n")

    return jsonify({
        "vegetation_change_percent": veg_percent,
        "urban_change_percent": urban_percent,
        "water_change_percent": water_percent,
        "period_years": period_years,
        "area_km2": round(area, 2),
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
