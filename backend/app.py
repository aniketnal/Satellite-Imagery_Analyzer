from flask import Flask, request, jsonify
from flask_cors import CORS
import ee
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

ee.Initialize(project='satellite-imagery-analyzer')

stored_geometry = None

# ---------------- SET COORDINATES ----------------

@app.route("/set-coordinates", methods=["POST"])
def set_coordinates():
    global stored_geometry

    coords = request.json["coordinates"]

    # Convert [lat,lng] to [lng,lat] for GEE
    fixed = [[c[1], c[0]] for c in coords]

    # Close polygon (first and last coord must match for GEE)
    if fixed[0] != fixed[-1]:
        fixed.append(fixed[0])

    # Log final coordinates exactly as sent to GEE
    print("\n==================== COORDINATES SENT TO GEE ====================")
    print(f"Total Points (including closing coord): {len(fixed)}")
    for i, point in enumerate(fixed):
        label = " (closing)" if i == len(fixed) - 1 else ""
        print(f"  Point {i + 1}: lng={point[0]}, lat={point[1]}{label}")
    print("==================================================================\n")

    stored_geometry = ee.Geometry.Polygon([fixed]).simplify(50)

    # ---- AREA LIMITER (km²) ----
    area = stored_geometry.area().divide(1e6).getInfo()

    if area > 50:
        stored_geometry = None
        return jsonify({
            "error": "Selected area too large. Please select under 10 km²."
        }), 400

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

@app.route("/run-analysis", methods=["GET"])
def run_analysis():
    global stored_geometry

    if stored_geometry is None:
        return jsonify({"error": "geometry not set"}), 400

    collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED") \
        .filterBounds(stored_geometry)

    today = datetime.today()
    past = today - timedelta(days=365 * 5)

    recent = collection.filterDate(
        past.strftime("%Y-%m-%d"),
        today.strftime("%Y-%m-%d")
    ).median()

    old = collection.filterDate(
        (past - timedelta(days=365)).strftime("%Y-%m-%d"),
        past.strftime("%Y-%m-%d")
    ).median()

    ndvi_recent = recent.normalizedDifference(["B8", "B4"])
    ndvi_old = old.normalizedDifference(["B8", "B4"])

    ndbi_recent = recent.normalizedDifference(["B11", "B8"])
    ndbi_old = old.normalizedDifference(["B11", "B8"])

    veg_change = ndvi_recent.subtract(ndvi_old)
    urban_change = ndbi_recent.subtract(ndbi_old)

    veg = veg_change.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=stored_geometry,
        scale=120,
        bestEffort=True,
        maxPixels=1e8
    ).getInfo()["nd"]

    urban = urban_change.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=stored_geometry,
        scale=120,
        bestEffort=True,
        maxPixels=1e8
    ).getInfo()["nd"]

    veg_percent = round(veg * 100, 2)
    urban_percent = round(urban * 100, 2)

    print("\n==================== ANALYSIS RESULTS ====================")
    print(f"Vegetation Change (%): {veg_percent}")
    print(f"Urban Change (%)     : {urban_percent}")
    print("==========================================================\n")

    return jsonify({
        "vegetation_change_percent": veg_percent,
        "urban_change_percent": urban_percent,
        "status": "completed"
    })


if __name__ == "__main__":
    app.run(debug=True)