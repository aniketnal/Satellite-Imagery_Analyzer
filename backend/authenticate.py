import ee

ee.Authenticate()
ee.Initialize(project="satellite-imagery-analyzer")

print("Earth Engine Authenticated Successfully")