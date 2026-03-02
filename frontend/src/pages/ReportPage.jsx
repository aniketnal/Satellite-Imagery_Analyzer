import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card'
import { ArrowLeft, Download, TrendingUp, TrendingDown, Minus, Loader, AlertCircle } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const BACKEND_URL = 'http://localhost:5000'

export default function ReportPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { area, params, period, analysisResult } = location.state || {}

  const [insights, setInsights] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState('')

  const handleDownload = () => {
    alert('Report download functionality will be implemented here')
  }

  const vegetationChange = analysisResult?.vegetation_change_percent
  const urbanChange = analysisResult?.urban_change_percent
  const waterChange = analysisResult?.water_change_percent

  const metricRows = useMemo(() => {
    const rows = []

    if (params?.vegetation && vegetationChange !== undefined) {
      rows.push({ name: 'Vegetation', value: Number(vegetationChange) })
    }
    if (params?.urbanization && urbanChange !== undefined) {
      rows.push({ name: 'Urban', value: Number(urbanChange) })
    }
    if (params?.waterBodies && waterChange !== undefined) {
      rows.push({ name: 'Water', value: Number(waterChange) })
    }

    return rows
  }, [params, vegetationChange, urbanChange, waterChange])

  const trendComposition = useMemo(() => {
    const increased = metricRows.filter(item => item.value > 0).length
    const decreased = metricRows.filter(item => item.value < 0).length
    const stable = metricRows.filter(item => item.value === 0).length

    return [
      { name: 'Increasing', value: increased, color: '#ef4444' },
      { name: 'Decreasing', value: decreased, color: '#10b981' },
      { name: 'Stable', value: stable, color: '#94a3b8' },
    ].filter(item => item.value > 0)
  }, [metricRows])

  useEffect(() => {
    const canRequestInsights =
      analysisResult &&
      analysisResult.area_km2 !== undefined &&
      analysisResult.period_years !== undefined &&
      analysisResult.vegetation_change_percent !== undefined &&
      analysisResult.urban_change_percent !== undefined &&
      analysisResult.water_change_percent !== undefined

    if (!canRequestInsights) {
      return
    }

    const fetchInsights = async () => {
      setInsightsLoading(true)
      setInsightsError('')

      try {
        const response = await fetch(`${BACKEND_URL}/generate-insights`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            area_km2: analysisResult.area_km2,
            period_years: analysisResult.period_years,
            vegetation_change_percent: analysisResult.vegetation_change_percent,
            urban_change_percent: analysisResult.urban_change_percent,
            water_change_percent: analysisResult.water_change_percent,
          })
        })

        const data = await response.json()
        if (!response.ok) {
          setInsightsError(data.error || 'Failed to generate AI insights.')
          return
        }

        setInsights(data.insights || null)
      } catch (error) {
        setInsightsError('Could not reach the server to generate AI insights.')
      } finally {
        setInsightsLoading(false)
      }
    }

    fetchInsights()
  }, [analysisResult])

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
    params?.waterBodies && {
      title: 'Water Change',
      value: waterChange !== undefined ? `${waterChange}%` : 'N/A',
      change: Math.abs(waterChange || 0),
      trend: waterChange > 0 ? 'up' : waterChange < 0 ? 'down' : 'flat',
      description: waterChange !== undefined
        ? 'Compared to previous equivalent period'
        : 'No water value returned'
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
                Live backend result: vegetation change <strong>{analysisResult.vegetation_change_percent}%</strong>, urban change <strong>{analysisResult.urban_change_percent}%</strong>, water change <strong>{analysisResult.water_change_percent}%</strong>.
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
          {metricRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Change by Index (%)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#3b82f6" name="Change %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {trendComposition.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Trend Direction Mix</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={trendComposition}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {trendComposition.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Actionable Insights (Gemini)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insightsLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader className="h-4 w-4 animate-spin" />
                Generating insights from Gemini...
              </div>
            )}

            {!insightsLoading && insightsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>{insightsError}</span>
              </div>
            )}

            {!insightsLoading && !insightsError && insights && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">{insights.summary}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Key Findings</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                    {(insights.key_findings || []).map((item, index) => (
                      <li key={`finding-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Recommendations</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                    {(insights.recommendations || []).map((item, index) => (
                      <li key={`recommendation-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
