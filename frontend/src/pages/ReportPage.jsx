import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card'
import { ArrowLeft, Download, Loader2, AlertTriangle, TrendingUp, TrendingDown, Droplets, TreeDeciduous, Building2 } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import axios from 'axios'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const API_BASE = 'http://localhost:5000'

export default function ReportPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const reportRef = useRef(null)
  
  const { area, params, period, analysisData: initialData } = location.state || {}
  
  const [loading, setLoading] = useState(false)
  const [analysisData, setAnalysisData] = useState(initialData || null)
  const [multiImages, setMultiImages] = useState([])
  const [insights, setInsights] = useState(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [loadingImages, setLoadingImages] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  useEffect(() => {
    if (!area || !params || !period) {
      navigate('/dashboard')
      return
    }

    // Fetch data if not already provided
    if (!analysisData) {
      fetchAnalysis()
    } else {
      fetchMultiImages()
      fetchInsights(analysisData)
    }
  }, [])

  const fetchAnalysis = async () => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE}/run-analysis`, {
        coordinates: area.points,
        period: period
      })
      setAnalysisData(response.data)
      fetchMultiImages()
      fetchInsights(response.data)
    } catch (error) {
      console.error('Analysis error:', error)
      alert('Failed to fetch analysis data')
    } finally {
      setLoading(false)
    }
  }

  const fetchMultiImages = async () => {
    setLoadingImages(true)
    try {
      // First set coordinates
      await axios.post(`${API_BASE}/set-coordinates`, {
        coordinates: area.points
      })
      
      // Then fetch images
      const response = await axios.get(`${API_BASE}/get-multi-image`)
      setMultiImages(response.data.images || [])
    } catch (error) {
      console.error('Image fetch error:', error)
    } finally {
      setLoadingImages(false)
    }
  }

  const fetchInsights = async (analysisPayload = analysisData) => {
    if (!analysisPayload) return
    
    setLoadingInsights(true)
    try {
      const response = await axios.post(`${API_BASE}/generate-insights`, {
        area_km2: analysisPayload.area_km2,
        period_years: analysisPayload.period_years,
        vegetation_change_percent: analysisPayload.vegetation_change_percent,
        urban_change_percent: analysisPayload.urban_change_percent,
        water_change_percent: analysisPayload.water_change_percent,
        uss_score: analysisPayload.uss_score,
        uss_label: analysisPayload.uss_label
      })
      setInsights(response.data.insights)
    } catch (error) {
      console.error('Insights error:', error)
    } finally {
      setLoadingInsights(false)
    }
  }

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      
      // Cover Page
      pdf.setFillColor(15, 23, 42) // slate-900
      pdf.rect(0, 0, pageWidth, pageHeight, 'F')
      
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(32)
      pdf.text('Satellite Imagery', pageWidth / 2, 80, { align: 'center' })
      pdf.text('Analysis Report', pageWidth / 2, 95, { align: 'center' })
      
      pdf.setFontSize(14)
      pdf.setTextColor(147, 197, 253) // blue-300
      pdf.text(`Analysis Period: ${period === 'current' ? 'Current Year' : `Last ${period} Years`}`, pageWidth / 2, 120, { align: 'center' })
      pdf.text(`Area: ${analysisData.area_km2} km²`, pageWidth / 2, 130, { align: 'center' })
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 140, { align: 'center' })
      
      // Page 2 - Summary
      pdf.addPage()
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, pageWidth, pageHeight, 'F')
      
      pdf.setTextColor(15, 23, 42)
      pdf.setFontSize(24)
      pdf.text('Executive Summary', 20, 20)
      
      pdf.setFontSize(12)
      pdf.setTextColor(71, 85, 105)
      let yPos = 35
      
      // Key Metrics
      pdf.setFontSize(16)
      pdf.setTextColor(15, 23, 42)
      pdf.text('Key Metrics', 20, yPos)
      yPos += 10
      
      pdf.setFontSize(11)
      pdf.setTextColor(71, 85, 105)
      
      const metrics = [
        { label: 'Vegetation Change', value: `${analysisData.vegetation_change_percent}%`, color: analysisData.vegetation_change_percent < 0 ? [239, 68, 68] : [34, 197, 94] },
        { label: 'Urban Development', value: `${analysisData.urban_change_percent}%`, color: analysisData.urban_change_percent > 0 ? [59, 130, 246] : [107, 114, 128] },
        { label: 'Water Bodies Change', value: `${analysisData.water_change_percent}%`, color: analysisData.water_change_percent < 0 ? [239, 68, 68] : [59, 130, 246] },
        { label: 'USS Score', value: `${analysisData.uss_score ?? ussScore}/100`, color: ussScore >= 80 ? [5, 150, 105] : ussScore >= 60 ? [34, 197, 94] : ussScore >= 40 ? [217, 119, 6] : [220, 38, 38] }
      ]
      
      metrics.forEach(metric => {
        pdf.setTextColor(...metric.color)
        pdf.text(`${metric.label}: ${metric.value}`, 25, yPos)
        yPos += 8
      })
      
      // Add insights if available
      if (insights) {
        yPos += 5
        pdf.setFontSize(16)
        pdf.setTextColor(15, 23, 42)
        pdf.text('AI-Generated Insights', 20, yPos)
        yPos += 10
        
        pdf.setFontSize(10)
        pdf.setTextColor(71, 85, 105)
        
        if (insights.summary) {
          const summaryLines = pdf.splitTextToSize(insights.summary, pageWidth - 40)
          pdf.text(summaryLines, 25, yPos)
          yPos += summaryLines.length * 6 + 5
        }
        
        if (insights.key_findings && insights.key_findings.length > 0) {
          yPos += 5
          pdf.setFontSize(14)
          pdf.setTextColor(15, 23, 42)
          pdf.text('Key Findings:', 20, yPos)
          yPos += 8
          
          pdf.setFontSize(10)
          pdf.setTextColor(71, 85, 105)
          insights.key_findings.forEach((finding, index) => {
            const lines = pdf.splitTextToSize(`${index + 1}. ${finding}`, pageWidth - 45)
            if (yPos + lines.length * 5 > pageHeight - 20) {
              pdf.addPage()
              yPos = 20
            }
            pdf.text(lines, 25, yPos)
            yPos += lines.length * 5 + 3
          })
        }
        
        if (insights.recommendations && insights.recommendations.length > 0) {
          yPos += 10
          if (yPos > pageHeight - 60) {
            pdf.addPage()
            yPos = 20
          }
          pdf.setFontSize(14)
          pdf.setTextColor(15, 23, 42)
          pdf.text('Recommendations:', 20, yPos)
          yPos += 8
          
          pdf.setFontSize(10)
          pdf.setTextColor(71, 85, 105)
          insights.recommendations.forEach((rec, index) => {
            const lines = pdf.splitTextToSize(`${index + 1}. ${rec}`, pageWidth - 45)
            if (yPos + lines.length * 5 > pageHeight - 20) {
              pdf.addPage()
              yPos = 20
            }
            pdf.text(lines, 25, yPos)
            yPos += lines.length * 5 + 3
          })
        }
      }
      
      // Add multi-temporal images if available
      if (multiImages.length > 0) {
        pdf.addPage()
        pdf.setFontSize(24)
        pdf.setTextColor(15, 23, 42)
        pdf.text('Multi-Temporal Analysis', 20, 20)
        
        let imgYPos = 35
        const imgWidth = (pageWidth - 40) / 2
        const imgHeight = imgWidth * 0.75
        
        for (let i = 0; i < multiImages.length; i++) {
          const img = multiImages[i]
          const col = i % 2
          const row = Math.floor(i / 2)
          
          if (row > 0 && col === 0) {
            pdf.addPage()
            imgYPos = 20
          }
          
          const xPos = 20 + col * (imgWidth + 10)
          const yPosImg = imgYPos + row * (imgHeight + 25) - (row > 0 ? Math.floor(i / 2) * (imgHeight + 25) : 0)
          
          try {
            pdf.addImage(img.preview, 'PNG', xPos, yPosImg, imgWidth, imgHeight)
            pdf.setFontSize(10)
            pdf.setTextColor(71, 85, 105)
            pdf.text(img.years_ago === 0 ? 'Current' : `${img.years_ago} years ago`, xPos, yPosImg + imgHeight + 5)
          } catch (e) {
            console.error('Error adding image:', e)
          }
        }
      }
      
      // Save PDF
      pdf.save(`satellite-analysis-report-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('PDF generation error:', error)
      alert('Failed to generate PDF')
    } finally {
      setDownloadingPDF(false)
    }
  }

  if (!area || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading analysis data...</p>
        </div>
      </div>
    )
  }

  if (!analysisData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-amber-600 mx-auto mb-4" />
          <p className="text-slate-600">No analysis data available</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const ussScore = Number(analysisData.uss_score ?? 0)
  const ussLabel = analysisData.uss_label || 'Sustainability score'
  const ussInterpretation = analysisData.uss_interpretation || 'Higher USS means more urban sustainable conditions.'
  const ussScoreColor = ussScore >= 80 ? 'text-emerald-600' : ussScore >= 60 ? 'text-green-600' : ussScore >= 40 ? 'text-amber-600' : 'text-red-600'
  const ussScoreBg = ussScore >= 80 ? 'bg-emerald-100' : ussScore >= 60 ? 'bg-green-100' : ussScore >= 40 ? 'bg-amber-100' : 'bg-red-100'

  const changeData = [
    { name: 'Vegetation', value: analysisData.vegetation_change_percent, color: analysisData.vegetation_change_percent < 0 ? '#ef4444' : '#10b981' },
    { name: 'Urban', value: analysisData.urban_change_percent, color: analysisData.urban_change_percent > 0 ? '#3b82f6' : '#6b7280' },
    { name: 'Water', value: analysisData.water_change_percent, color: analysisData.water_change_percent < 0 ? '#ef4444' : '#3b82f6' }
  ]

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
              Back
            </Button>
            <div className="h-6 w-px bg-slate-300"></div>
            <h1 className="text-xl font-bold text-slate-900">Analysis Report</h1>
          </div>
          
          <Button 
            onClick={handleDownloadPDF} 
            disabled={downloadingPDF}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {downloadingPDF ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div ref={reportRef} className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Report Header */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Analysis Date</p>
                <p className="font-semibold">{new Date().toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-slate-500">Time Period</p>
                <p className="font-semibold">{period === 'current' ? 'Current Year' : `Last ${period} Years`}</p>
              </div>
              <div>
                <p className="text-slate-500">Area Analyzed</p>
                <p className="font-semibold">{analysisData.area_km2} km²</p>
              </div>
              <div>
                <p className="text-slate-500">Parameters</p>
                <p className="font-semibold">{Object.keys(params || {}).filter(k => params[k]).length} Selected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TreeDeciduous className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-500">Vegetation Change</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold ${analysisData.vegetation_change_percent < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {analysisData.vegetation_change_percent}%
                    </p>
                    {analysisData.vegetation_change_percent < 0 ? (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {analysisData.vegetation_change_percent < 0 ? 'Vegetation loss detected' : 'Vegetation increase detected'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-500">Urban Development</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold ${analysisData.urban_change_percent > 0 ? 'text-blue-600' : 'text-slate-600'}`}>
                      {analysisData.urban_change_percent}%
                    </p>
                    {analysisData.urban_change_percent > 0 ? (
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-slate-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {analysisData.urban_change_percent > 0 ? 'Urban expansion detected' : 'No significant urban change'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-100 rounded-lg">
                  <Droplets className="h-6 w-6 text-cyan-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-500">Water Bodies</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold ${analysisData.water_change_percent < 0 ? 'text-red-600' : 'text-cyan-600'}`}>
                      {analysisData.water_change_percent}%
                    </p>
                    {analysisData.water_change_percent < 0 ? (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-cyan-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {analysisData.water_change_percent < 0 ? 'Water body reduction' : 'Water body increase'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${ussScoreBg}`}>
                  {ussScore >= 50 ? (
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-500">USS Score</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold ${ussScoreColor}`}>
                      {analysisData.uss_score ?? ussScore}/100
                    </p>
                    {ussScore >= 50 ? (
                      <TrendingUp className={`h-5 w-5 ${ussScoreColor}`} />
                    ) : (
                      <TrendingDown className={`h-5 w-5 ${ussScoreColor}`} />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{ussLabel}</p>
                  <p className="text-xs text-slate-500">Higher score = more sustainable</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Change Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Land Use Change Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={changeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" label={{ value: 'Change (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6">
                  {changeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Multi-Temporal Satellite Images */}
        {loadingImages ? (
          <Card>
            <CardHeader>
              <CardTitle>Multi-Temporal Satellite Imagery</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-slate-600">Loading satellite images...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : multiImages.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Multi-Temporal Satellite Imagery</CardTitle>
              <p className="text-sm text-slate-500">Historical satellite images showing land use changes over time</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {multiImages.map((img, index) => (
                  <div key={index} className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                      <img
                        src={img.preview}
                        alt={`Satellite ${img.years_ago} years ago`}
                        className="w-full h-auto"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23e2e8f0"/><text x="50%" y="50%" text-anchor="middle" fill="%2364748b">Image unavailable</text></svg>'
                        }}
                      />
                      <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-sm font-medium">
                        {img.years_ago === 0 ? 'Current' : `${img.years_ago} years ago`}
                      </div>
                    </div>
                    <a
                      href={img.preview}
                      target="_blank"
                      download={`satellite-image-${img.years_ago}yrs.png`}
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Download Image
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* AI-Generated Insights */}
        {loadingInsights ? (
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-slate-600">Generating AI insights...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : insights ? (
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Insights</CardTitle>
              <p className="text-sm text-slate-500">Professional analysis powered by Gemini AI</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {insights.summary && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Summary</h3>
                  <p className="text-slate-700">{insights.summary}</p>
                </div>
              )}

              {insights.key_findings && insights.key_findings.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Key Findings</h3>
                  <ul className="space-y-2">
                    {insights.key_findings.map((finding, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </span>
                        <span className="text-slate-700 flex-1">{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {insights.recommendations && insights.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Recommendations</h3>
                  <ul className="space-y-2">
                    {insights.recommendations.map((rec, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                          ✓
                        </span>
                        <span className="text-slate-700 flex-1">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Detailed Analysis Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Methodology & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Analysis Methods:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                <li>Vegetation analysis using NDVI (Normalized Difference Vegetation Index)</li>
                <li>Urban development measured using NDBI (Normalized Difference Built-up Index)</li>
                <li>Water bodies analyzed using NDWI (Normalized Difference Water Index)</li>
                <li>USS (Urban Sustainability Score) combines vegetation, water, urban change, and a temperature-pressure proxy</li>
                <li>Data sources: Copernicus Sentinel-2 and Landsat 8 satellite imagery</li>
                <li>Comparison period: {analysisData.period_years} years</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-900">
                <strong>USS meaning:</strong> {ussInterpretation}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-amber-900">
                <strong>Note:</strong> This analysis is based on satellite imagery data processed using 
                advanced remote sensing algorithms. For critical decision-making, please verify with on-ground surveys 
                and additional data sources. Results may vary based on cloud cover, seasonal changes, and data availability.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
