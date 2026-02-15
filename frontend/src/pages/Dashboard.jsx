import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'
import { Button } from '@/components/Button'
import { Card, CardContent } from '@/components/Card'
import { Satellite, User, LogOut } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// DrawControl Component - Manages Leaflet Draw toolbar
function DrawControl({ onShapeCreated }) {
  const map = useMap()
  const drawnItemsRef = useRef(null)
  const drawControlRef = useRef(null)

  useEffect(() => {
    // Initialize feature group for drawn items
    if (!drawnItemsRef.current) {
      drawnItemsRef.current = new L.FeatureGroup()
      map.addLayer(drawnItemsRef.current)
    }

    // Remove existing draw control
    if (drawControlRef.current) {
      map.removeControl(drawControlRef.current)
    }

    // Create new draw control - only polygon tool
    drawControlRef.current = new L.Control.Draw({
      position: 'topright',
      edit: {
        featureGroup: drawnItemsRef.current
      },
      draw: {
        polygon: {
          allowIntersection: false,
          drawError: {
            color: '#e74c3c',
            message: '<strong>Error:</strong> Shape edges cannot cross!'
          },
          shapeOptions: {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.3,
            weight: 3
          }
        },
        rectangle: false,
        circle: false,
        marker: false,
        polyline: false,
        circlemarker: false
      }
    })

    map.addControl(drawControlRef.current)

    // Handle shape creation
    const handleCreated = (e) => {
      const layer = e.layer
      drawnItemsRef.current.addLayer(layer)

      let coords
      if (e.layerType === 'polygon') {
        coords = layer.getLatLngs()[0].map(p => [p.lat, p.lng])
      }

      // Only pass serializable data (no layer object)
      onShapeCreated({
        type: e.layerType,
        points: coords
      })
    }

    map.on(L.Draw.Event.CREATED, handleCreated)

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated)
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current)
      }
    }
  }, [map, onShapeCreated])

  return null
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [timePeriod, setTimePeriod] = useState('current')
  const [analysisParams, setAnalysisParams] = useState({
    deforestation: false,
    vegetation: false,
    urbanization: false,
    waterBodies: false
  })
  const [drawnShapes, setDrawnShapes] = useState([])
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/')
  }

  const handleAnalysis = () => {
    if (drawnShapes.length === 0) {
      alert('Please select an area on the map first')
      return
    }
    
    const selectedParams = Object.keys(analysisParams).filter(key => analysisParams[key])
    if (selectedParams.length === 0) {
      alert('Please select at least one analysis parameter')
      return
    }

    // Log the coordinates to console
    console.log('==================== ANALYSIS REQUEST ====================')
    console.log('Total Shapes Selected:', drawnShapes.length)
    console.log('Latest Shape Details:')
    
    const latestShape = drawnShapes[drawnShapes.length - 1]
    console.log('Shape Type:', latestShape.type)
    console.log('Coordinates:', latestShape.points)
    
    if (latestShape.type === 'polygon') {
      console.log('Polygon Points:', latestShape.points.map((point, index) => ({
        point: index + 1,
        latitude: point[0],
        longitude: point[1]
      })))
    }
    
    console.log('Analysis Parameters:', selectedParams)
    console.log('Time Period:', timePeriod === 'current' ? 'Current' : `Last ${timePeriod} Years`)
    console.log('==========================================================')

    // Navigate directly to report page
    navigate('/report', { 
      state: { 
        area: latestShape, 
        params: analysisParams, 
        period: timePeriod 
      } 
    })
  }

  const handleShapeCreated = (shape) => {
    console.log('✓ Shape Completed!')
    console.log('Type:', shape.type)
    console.log('Coordinates:', shape.points)
    if (shape.type === 'polygon') {
      console.log('Total vertices:', shape.points.length)
    }
    console.log('---')
    
    setDrawnShapes([...drawnShapes, shape])
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Satellite className="h-7 w-7 text-blue-600" />
            <span className="text-xl font-bold text-slate-900">Satellite Imagery Analyzer</span>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500">{user.role}</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {user.name?.charAt(0) || 'U'}
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  View Profile
                </button>
                <div className="border-t border-slate-200 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Area Selection Tools */}
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold text-slate-900">Area Selection Tool</h3>
                <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                      P
                    </div>
                    <span className="font-semibold text-slate-900">Polygon Tool Active</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Use the polygon tool in the map toolbar (top-right corner) to draw your area
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Time Period */}
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold text-slate-900">Time Period</h3>
                <select
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="current">Current</option>
                  <option value="3">Last 3 Years</option>
                  <option value="5">Last 5 Years</option>
                  <option value="7">Last 7 Years</option>
                  <option value="10">Last 10 Years</option>
                </select>
              </CardContent>
            </Card>

            {/* Analysis Parameters */}
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold text-slate-900">Analysis Parameters</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analysisParams.deforestation}
                      onChange={(e) => setAnalysisParams({...analysisParams, deforestation: e.target.checked})}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Deforestation</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analysisParams.vegetation}
                      onChange={(e) => setAnalysisParams({...analysisParams, vegetation: e.target.checked})}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Vegetation Health</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analysisParams.urbanization}
                      onChange={(e) => setAnalysisParams({...analysisParams, urbanization: e.target.checked})}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Urbanization</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analysisParams.waterBodies}
                      onChange={(e) => setAnalysisParams({...analysisParams, waterBodies: e.target.checked})}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Water Bodies</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-800">
                <strong>How to use:</strong> Select a tool above, then use the drawing toolbar on the map (top-right corner) to draw your area. Select parameters and click "Get Analysis".
              </p>
            </div>
          </div>
        </aside>

        {/* Map Area */}
        <main className="flex-1 relative">
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <DrawControl 
              onShapeCreated={handleShapeCreated}
            />
          </MapContainer>

          {/* Get Analysis Button */}
          <div className="absolute bottom-8 right-8 z-[1000]">
            <Button
              onClick={handleAnalysis}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 shadow-lg"
            >
              Get Analysis
            </Button>
          </div>
        </main>
      </div>
    </div>
  )
}
