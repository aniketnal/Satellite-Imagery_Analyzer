import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card'
import { ArrowLeft, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ReportPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { area, params, period, analysisResult } = location.state || {}

  // Dummy data for demonstration
  const vegetationData = [
    { year: '2020', value: 68 },
    { year: '2021', value: 65 },
    { year: '2022', value: 62 },
    { year: '2023', value: 59 },
    { year: '2024', value: 56 },
    { year: '2025', value: 54 },
  ]

  const urbanizationData = [
    { category: 'Residential', value: 35, color: '#3b82f6' },
    { category: 'Commercial', value: 25, color: '#8b5cf6' },
    { category: 'Industrial', value: 20, color: '#f59e0b' },
    { category: 'Green Space', value: 20, color: '#10b981' },
  ]

  const waterBodiesData = [
    { month: 'Jan', area: 45 },
    { month: 'Feb', area: 42 },
    { month: 'Mar', area: 38 },
    { month: 'Apr', area: 35 },
    { month: 'May', area: 32 },
    { month: 'Jun', area: 28 },
  ]

  const deforestationData = [
    { region: 'North', loss: 12 },
    { region: 'South', loss: 8 },
    { region: 'East', loss: 15 },
    { region: 'West', loss: 6 },
  ]

  const handleDownload = () => {
    alert('Report download functionality will be implemented here')
  }

  const vegetationChange = analysisResult?.vegetation_change_percent
  const urbanChange = analysisResult?.urban_change_percent

  const metrics = [
    params?.vegetation && {
      title: 'Vegetation Change',
      value: vegetationChange !== undefined ? `${vegetationChange}%` : 'N/A',
      change: Math.abs(vegetationChange || 0),
      trend: vegetationChange > 0 ? 'up' : vegetationChange < 0 ? 'down' : 'flat',
      description: vegetationChange !== undefined
        ? 'Compared to previous equivalent period'
        : 'No vegetation value returned'
    },
    params?.urbanization && {
      title: 'Urban Change',
      value: urbanChange !== undefined ? `${urbanChange}%` : 'N/A',
      change: Math.abs(urbanChange || 0),
      trend: urbanChange > 0 ? 'up' : urbanChange < 0 ? 'down' : 'flat',
      description: urbanChange !== undefined
        ? 'Compared to previous equivalent period'
        : 'No urban value returned'
    },
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="h-6 w-px bg-slate-300"></div>
            <h1 className="text-xl font-bold text-slate-900">Analysis Report</h1>
          </div>
          
          <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Report Header */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Analysis Date:</strong> {new Date().toLocaleDateString()}</p>
              <p><strong>Time Period:</strong> {period === 'current' ? 'Current' : `Last ${period} Years`}</p>
              <p><strong>Area:</strong> {analysisResult?.area_km2 || area?.areaSqKm || 'N/A'} km²</p>
              <p><strong>Parameters Analyzed:</strong> {Object.keys(params || {}).filter(k => params[k]).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}</p>
            </div>
          </CardContent>
        </Card>

        {analysisResult && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-700">
                Live backend result: vegetation change <strong>{analysisResult.vegetation_change_percent}%</strong>, urban change <strong>{analysisResult.urban_change_percent}%</strong>.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">{metric.title}</p>
                  <div className="flex items-end justify-between">
                    <p className="text-3xl font-bold text-slate-900">{metric.value}</p>
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                      metric.trend === 'up' ? 'text-red-600' : 
                      metric.trend === 'down' ? 'text-green-600' : 
                      'text-slate-600'
                    }`}>
                      {metric.trend === 'up' ? <TrendingUp className="h-4 w-4" /> :
                       metric.trend === 'down' ? <TrendingDown className="h-4 w-4" /> :
                       <Minus className="h-4 w-4" />}
                      {Math.abs(metric.change)}%
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{metric.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vegetation Trend */}
          {params?.vegetation && (
            <Card>
              <CardHeader>
                <CardTitle>Vegetation Health Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={vegetationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} name="Coverage %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Urbanization Distribution */}
          {params?.urbanization && (
            <Card>
              <CardHeader>
                <CardTitle>Urban Development Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={urbanizationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.category} ${entry.value}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {urbanizationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Water Bodies Change */}
          {params?.waterBodies && (
            <Card>
              <CardHeader>
                <CardTitle>Water Bodies Area Change</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={waterBodiesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="area" stroke="#3b82f6" strokeWidth={2} name="Area (km²)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Deforestation by Region */}
          {params?.deforestation && (
            <Card>
              <CardHeader>
                <CardTitle>Deforestation by Region</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={deforestationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="region" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="loss" fill="#ef4444" name="Forest Loss (km²)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Detailed Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Key Findings:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                <li>Significant vegetation decline observed in the selected area over the analysis period</li>
                <li>Urban development has increased by 12%, primarily in residential zones</li>
                <li>Water bodies show seasonal variation with overall decreasing trend</li>
                <li>Deforestation concentrated in eastern regions requiring immediate attention</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Recommendations:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                <li>Implement reforestation programs in high-loss areas</li>
                <li>Monitor water body levels and implement conservation measures</li>
                <li>Plan sustainable urban development to balance growth and environment</li>
                <li>Establish protected zones to prevent further deforestation</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-amber-900">
                <strong>Note:</strong> This analysis is based on satellite imagery data processed using 
                advanced algorithms. For critical decision-making, please verify with on-ground surveys.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
