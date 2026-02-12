from flask import Flask, request, jsonify
from flask_cors import CORS
import ee
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

ee.Initialize(project='satellite-imagery-analyzer')

stored_geometry = None

# SET COORDINATES 

@app.route("/set-coordinates", methods=["POST"])
def set_coordinates():

    global stored_geometry

    coords = request.json.get("coordinates")

    if not coords:
        return jsonify({"error": "No coordinates provided"}), 400

    stored_geometry = ee.Geometry.Polygon([coords])

    return jsonify({"status": "Coordinates saved successfully"})


# FETCH MULTI TEMPORAL IMAGES

@app.route("/get-multi-image", methods=["POST"])
def get_multi_image():

    data = request.json
    coords = data.get("coordinates", [])

    geometry = ee.Geometry.Polygon([coords])

    year_offsets = [0, 3, 5, 7, 10]
    images_urls = []
    today = datetime.today()

    for offset in year_offsets:

        end_date = today - timedelta(days=365 * offset)
        start_date = end_date - timedelta(days=365)

        start_date_str = start_date.strftime('%Y-%m-%d')
        end_date_str = end_date.strftime('%Y-%m-%d')

        if offset <= 7:
            collection_id = 'COPERNICUS/S2_SR_HARMONIZED'
            bands = ['B3', 'B4', 'B8', 'B11']
            scale = 10
        else:
            collection_id = 'LANDSAT/LC08/C02/T1_L2'
            bands = ['SR_B3', 'SR_B4', 'SR_B5', 'SR_B6']
            scale = 30

        collection = ee.ImageCollection(collection_id) \
            .filterBounds(geometry) \
            .filterDate(start_date_str, end_date_str) \
            .select(bands)

        if collection.size().getInfo() == 0:
            images_urls.append({"years_ago": offset, "url": None})
            continue

        image = collection.median().clip(geometry)

        url = image.getDownloadURL({
            'region': geometry,
            'scale': scale,
            'format': 'GEO_TIFF',
            'bands': bands,
            'crs': 'EPSG:4326'
        })

        images_urls.append({
            "years_ago": offset,
            "bands": bands,
            "url": url
        })

    return jsonify({"images": images_urls})


# ANALYSIS

@app.route("/run-analysis", methods=["GET"])
def run_analysis():

    global stored_geometry

    if stored_geometry is None:
        return jsonify({"error": "Coordinates not set"}), 400

    collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
        .filterBounds(stored_geometry)

    today = datetime.today()
    past = today - timedelta(days=365 * 5)

    recent = collection.filterDate(past.strftime('%Y-%m-%d'),
                                   today.strftime('%Y-%m-%d')).median()

    old = collection.filterDate(
        (past - timedelta(days=365)).strftime('%Y-%m-%d'),
        past.strftime('%Y-%m-%d')
    ).median()

    ndvi_recent = recent.normalizedDifference(['B8','B4'])
    ndvi_old = old.normalizedDifference(['B8','B4'])

    veg_change = ndvi_recent.subtract(ndvi_old)

    ndbi_recent = recent.normalizedDifference(['B11','B8'])
    ndbi_old = old.normalizedDifference(['B11','B8'])

    urban_change = ndbi_recent.subtract(ndbi_old)

    veg = veg_change.reduceRegion(
        ee.Reducer.mean(),
        stored_geometry,
        10
    ).getInfo()

    urban = urban_change.reduceRegion(
        ee.Reducer.mean(),
        stored_geometry,
        10
    ).getInfo()

    return jsonify({
        "vegetation_change": veg,
        "urban_change": urban,
        "status": "analysis completed"
    })


if __name__ == "__main__":
    print("Starting Flask server...")
    app.run(debug=True)
