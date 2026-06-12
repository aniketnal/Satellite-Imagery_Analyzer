import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card'
import { ArrowLeft, Download, Loader2, AlertTriangle, TrendingUp, TrendingDown, Droplets, TreeDeciduous, Building2 } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import axios from 'axios'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const PARAMETER_LABELS = {
  deforestation: 'Deforestation',
  vegetation: 'Vegetation Health',
  urbanization: 'Urbanization',
  waterBodies: 'Water Bodies',
}

const ANALYSIS_SOURCES = [
  'Copernicus Sentinel-2',
  'Landsat 8 imagery',
  'NDVI vegetation change',
  'NDBI urban expansion',
  'NDWI water change',
]

const formatPercent = (value) => `${Number(value ?? 0).toFixed(2)}%`

const formatSelectedParameters = (params = {}) => {
  const selected = Object.keys(params).filter((key) => params[key])
  return selected.length > 0 ? selected.map((key) => PARAMETER_LABELS[key] || key).join(', ') : 'None selected'
}

const getChangeDirection = (value, positiveLabel, negativeLabel) => (value < 0 ? negativeLabel : positiveLabel)

const addWrappedText = (pdf, text, x, y, maxWidth, lineHeight = 6, options = {}) => {
  if (!text) return y
  const lines = pdf.splitTextToSize(String(text), maxWidth)
  pdf.text(lines, x, y, options)
  return y + lines.length * lineHeight
}

const addSectionTitle = (pdf, title, x, y, pageWidth) => {
  pdf.setTextColor(15, 23, 42)
  pdf.setFontSize(18)
  pdf.text(title, x, y)
  pdf.setDrawColor(191, 219, 254)
  pdf.setLineWidth(0.4)
  pdf.line(x, y + 2, pageWidth - 20, y + 2)
  return y + 10
}

const addKeyValueRow = (pdf, label, value, x, y, maxWidth, labelWidth = 48) => {
  pdf.setFontSize(10)
  pdf.setTextColor(71, 85, 105)
  pdf.text(`${label}:`, x, y)
  pdf.setTextColor(15, 23, 42)
  return addWrappedText(pdf, value, x + labelWidth, y, maxWidth - labelWidth, 5)
}

const buildInsightPreview = (analysisData, ussLabel, ussInterpretation) => {
  if (!analysisData) return null

  const vegetation = Number(analysisData.vegetation_change_percent ?? 0)
  const urban = Number(analysisData.urban_change_percent ?? 0)
  const water = Number(analysisData.water_change_percent ?? 0)
  const ussScoreValue = Number(analysisData.uss_score ?? 0)

  const vegetationFinding = vegetation < 0
    ? `Vegetation decreased by ${Math.abs(vegetation).toFixed(2)}%, which suggests canopy loss or land-cover pressure.`
    : `Vegetation increased by ${vegetation.toFixed(2)}%, which indicates improved green cover.`

  const urbanFinding = urban > 0
    ? `Urban development increased by ${urban.toFixed(2)}%, showing active built-up expansion.`
    : `Urban development stayed relatively stable at ${urban.toFixed(2)}%.`

  const waterFinding = water < 0
    ? `Water bodies declined by ${Math.abs(water).toFixed(2)}%, which should be monitored closely.`
    : `Water bodies increased by ${water.toFixed(2)}%, which is a positive hydrological signal.`

  const summary = `The selected area scores ${ussScoreValue}/100 (${ussLabel}). ${ussInterpretation} Vegetation, urban, and water change indicators suggest ${vegetation < 0 ? 'pressure on green cover' : 'green cover resilience'} with ${urban > 0 ? 'ongoing urban growth' : 'limited urban growth'} and ${water < 0 ? 'reduced surface water' : 'stable or expanding surface water'}.`

  return {
    summary,
    key_findings: [vegetationFinding, urbanFinding, waterFinding],
    recommendations: [
      vegetation < 0 ? 'Prioritize tree cover protection and replanting in high-loss zones.' : 'Preserve the current vegetation trend with land-cover safeguards.',
      urban > 0 ? 'Review zoning and infrastructure plans to manage expansion sustainably.' : 'Maintain current land-use controls and monitor infill development.',
      water < 0 ? 'Inspect drainage, encroachment, and seasonal water stress in the mapped area.' : 'Use the area as a baseline for water conservation planning.',
    ],
  }
}

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
  const [comparisonSplit, setComparisonSplit] = useState(50)

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
      const generatedAt = new Date()
      const selectedParametersText = formatSelectedParameters(params)
      const ussScoreValue = Number(analysisData.uss_score ?? 0)
      const alertTriggered = Boolean(analysisData?.authority_alert?.triggered)
      const alertReasons = analysisData?.authority_alert?.reasons || []
      const summaryText = insights?.summary || ussInterpretation
      const findings = insights?.key_findings || []
      const recommendations = insights?.recommendations || []

      // Cover page
      pdf.setFillColor(15, 23, 42)
      pdf.rect(0, 0, pageWidth, pageHeight, 'F')
      pdf.setFillColor(37, 99, 235)
      pdf.circle(pageWidth - 32, 32, 16, 'F')
      pdf.setFillColor(59, 130, 246)
      pdf.circle(32, pageHeight - 34, 11, 'F')

      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(30)
      pdf.text('Satellite Imagery', pageWidth / 2, 74, { align: 'center' })
      pdf.text('Analysis Report', pageWidth / 2, 90, { align: 'center' })
      pdf.setFontSize(13)
      pdf.setTextColor(191, 219, 254)
      pdf.text('Executive geospatial assessment for planning and review', pageWidth / 2, 108, { align: 'center' })

      pdf.setDrawColor(59, 130, 246)
      pdf.setLineWidth(0.6)
      pdf.roundedRect(22, 124, pageWidth - 44, 72, 4, 4, 'S')
      pdf.setFontSize(12)
      pdf.setTextColor(255, 255, 255)
      pdf.text(`Area analyzed: ${analysisData.area_km2} km²`, 32, 142)
      pdf.text(`Period: ${period === 'current' ? 'Current Year' : `Last ${period} Years`}`, 32, 153)
      pdf.text(`USS score: ${analysisData.uss_score ?? ussScoreValue}/100 (${ussLabel})`, 32, 164)
      pdf.text(`Generated: ${generatedAt.toLocaleString()}`, 32, 175)
      pdf.text(`Status: ${analysisData.status || 'completed'}`, 32, 186)

      pdf.setFontSize(10)
      pdf.setTextColor(191, 219, 254)
      pdf.text('This report combines satellite-derived indices, AI commentary, and visual time-series previews.', pageWidth / 2, 214, { align: 'center' })

      // Executive summary page
      pdf.addPage()
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, pageWidth, pageHeight, 'F')
      pdf.setTextColor(15, 23, 42)
      pdf.setFontSize(24)
      pdf.text('Executive Summary', 20, 20)

      let yPos = 36
      yPos = addSectionTitle(pdf, 'Analysis Overview', 20, yPos, pageWidth)
      yPos = addKeyValueRow(pdf, 'Area analyzed', `${analysisData.area_km2} km²`, 20, yPos, pageWidth - 40)
      yPos = addKeyValueRow(pdf, 'Time period', period === 'current' ? 'Current year' : `Last ${period} years`, 20, yPos + 2, pageWidth - 40)
      yPos = addKeyValueRow(pdf, 'Selected parameters', selectedParametersText, 20, yPos + 2, pageWidth - 40)
      yPos = addKeyValueRow(pdf, 'Data sources', ANALYSIS_SOURCES.join(', '), 20, yPos + 2, pageWidth - 40)
      yPos = addKeyValueRow(pdf, 'Analysis status', analysisData.status || 'completed', 20, yPos + 2, pageWidth - 40)

      yPos += 6
      yPos = addSectionTitle(pdf, 'Core Metrics', 20, yPos, pageWidth)
      const metrics = [
        { label: 'Vegetation Change', value: formatPercent(analysisData.vegetation_change_percent), color: analysisData.vegetation_change_percent < 0 ? [239, 68, 68] : [34, 197, 94] },
        { label: 'Urban Development', value: formatPercent(analysisData.urban_change_percent), color: analysisData.urban_change_percent > 0 ? [59, 130, 246] : [107, 114, 128] },
        { label: 'Water Bodies Change', value: formatPercent(analysisData.water_change_percent), color: analysisData.water_change_percent < 0 ? [239, 68, 68] : [59, 130, 246] },
        { label: 'USS Score', value: `${analysisData.uss_score ?? ussScoreValue}/100`, color: ussScoreValue >= 80 ? [5, 150, 105] : ussScoreValue >= 60 ? [34, 197, 94] : ussScoreValue >= 40 ? [217, 119, 6] : [220, 38, 38] }
      ]

      metrics.forEach((metric) => {
        pdf.setFontSize(11)
        pdf.setTextColor(...metric.color)
        pdf.text(`${metric.label}: ${metric.value}`, 25, yPos)
        yPos += 7
      })

      yPos += 4
      yPos = addSectionTitle(pdf, 'Interpretation', 20, yPos, pageWidth)
      pdf.setFontSize(10)
      pdf.setTextColor(71, 85, 105)
      yPos = addWrappedText(pdf, summaryText, 20, yPos, pageWidth - 40, 5)

      yPos += 4
      pdf.setFontSize(10)
      pdf.setTextColor(15, 23, 42)
      pdf.text(`Vegetation trend: ${getChangeDirection(analysisData.vegetation_change_percent, 'Gain detected', 'Loss detected')}`, 20, yPos)
      yPos += 6
      pdf.text(`Urban trend: ${getChangeDirection(analysisData.urban_change_percent, 'Expansion detected', 'No significant expansion')}`, 20, yPos)
      yPos += 6
      pdf.text(`Water trend: ${getChangeDirection(analysisData.water_change_percent, 'Increase detected', 'Reduction detected')}`, 20, yPos)
      yPos += 6
      pdf.text(`Authority alert: ${alertTriggered ? 'Triggered' : 'Not triggered'}`, 20, yPos)
      yPos += 8

      if (alertReasons.length > 0) {
        pdf.setFontSize(10)
        pdf.setTextColor(185, 28, 28)
        pdf.text('Alert reasons:', 20, yPos)
        yPos += 6
        alertReasons.forEach((reason, index) => {
          yPos = addWrappedText(pdf, `${index + 1}. ${reason}`, 25, yPos, pageWidth - 45, 5)
          yPos += 1
        })
      }

      // AI insights page
      pdf.addPage()
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, pageWidth, pageHeight, 'F')
      let insightY = 20
      insightY = addSectionTitle(pdf, 'AI-Generated Insights', 20, insightY, pageWidth)
      pdf.setFontSize(10)
      pdf.setTextColor(71, 85, 105)
      insightY = addWrappedText(pdf, summaryText, 20, insightY, pageWidth - 40, 5)

      if (findings.length > 0) {
        insightY += 4
        insightY = addSectionTitle(pdf, 'Key Findings', 20, insightY, pageWidth)
        findings.forEach((finding, index) => {
          pdf.setFontSize(10)
          pdf.setTextColor(15, 23, 42)
          insightY = addWrappedText(pdf, `${index + 1}. ${finding}`, 20, insightY, pageWidth - 40, 5)
          insightY += 1
        })
      }

      if (recommendations.length > 0) {
        insightY += 4
        insightY = addSectionTitle(pdf, 'Recommendations', 20, insightY, pageWidth)
        recommendations.forEach((recommendation, index) => {
          pdf.setFontSize(10)
          pdf.setTextColor(15, 23, 42)
          insightY = addWrappedText(pdf, `${index + 1}. ${recommendation}`, 20, insightY, pageWidth - 40, 5)
          insightY += 1
        })
      }

      insightY += 4
      insightY = addSectionTitle(pdf, 'USS Interpretation', 20, insightY, pageWidth)
      pdf.setFontSize(10)
      pdf.setTextColor(71, 85, 105)
      addWrappedText(pdf, ussInterpretation, 20, insightY, pageWidth - 40, 5)

      // Multi-temporal imagery appendix
      if (multiImages.length > 0) {
        pdf.addPage()
        pdf.setFillColor(255, 255, 255)
        pdf.rect(0, 0, pageWidth, pageHeight, 'F')
        pdf.setFontSize(24)
        pdf.setTextColor(15, 23, 42)
        pdf.text('Multi-Temporal Analysis', 20, 20)
        pdf.setFontSize(10)
        pdf.setTextColor(71, 85, 105)
        pdf.text('Historical satellite previews across the selected period.', 20, 28)

        const imgWidth = (pageWidth - 50) / 2
        const imgHeight = imgWidth * 0.72
        let cursorY = 36

        for (let i = 0; i < multiImages.length; i += 2) {
          const leftImg = multiImages[i]
          const rightImg = multiImages[i + 1]

          if (cursorY + imgHeight + 18 > pageHeight - 16) {
            pdf.addPage()
            pdf.setFillColor(255, 255, 255)
            pdf.rect(0, 0, pageWidth, pageHeight, 'F')
            cursorY = 20
          }

          try {
            pdf.addImage(leftImg.preview, 'PNG', 20, cursorY, imgWidth, imgHeight)
          } catch (error) {
            console.error('Error adding image:', error)
          }
          pdf.setFontSize(9)
          pdf.setTextColor(71, 85, 105)
          pdf.text(leftImg.years_ago === 0 ? 'Current' : `${leftImg.years_ago} years ago`, 20, cursorY + imgHeight + 5)

          if (rightImg) {
            try {
              pdf.addImage(rightImg.preview, 'PNG', 30 + imgWidth, cursorY, imgWidth, imgHeight)
            } catch (error) {
              console.error('Error adding image:', error)
            }
            pdf.text(rightImg.years_ago === 0 ? 'Current' : `${rightImg.years_ago} years ago`, 30 + imgWidth, cursorY + imgHeight + 5)
          }

          cursorY += imgHeight + 18
        }
      }

      // Methodology and caveats
      pdf.addPage()
      pdf.setFillColor(248, 250, 252)
      pdf.rect(0, 0, pageWidth, pageHeight, 'F')
      let methodY = 20
      methodY = addSectionTitle(pdf, 'Methodology & Notes', 20, methodY, pageWidth)
      pdf.setFontSize(10)
      pdf.setTextColor(71, 85, 105)
      methodY = addWrappedText(
        pdf,
        'Vegetation change is derived from NDVI, urban expansion from NDBI, and water change from NDWI. The USS score combines vegetation, water, urban change, and a temperature-pressure proxy into a single sustainability indicator.',
        20,
        methodY,
        pageWidth - 40,
        5
      )

      methodY += 6
      methodY = addSectionTitle(pdf, 'Analysis Methods', 20, methodY, pageWidth)
      const methodologyItems = [
        'Vegetation analysis using NDVI (Normalized Difference Vegetation Index)',
        'Urban development measured using NDBI (Normalized Difference Built-up Index)',
        'Water bodies analyzed using NDWI (Normalized Difference Water Index)',
        `Comparison period: ${analysisData.period_years || period} years`,
        'USS score combines land-cover changes and a temperature-pressure proxy',
      ]

      methodologyItems.forEach((item) => {
        pdf.setFontSize(10)
        pdf.setTextColor(15, 23, 42)
        methodY = addWrappedText(pdf, `• ${item}`, 20, methodY, pageWidth - 40, 5)
        methodY += 1
      })

      methodY += 4
      methodY = addSectionTitle(pdf, 'Caveats', 20, methodY, pageWidth)
      pdf.setFontSize(10)
      pdf.setTextColor(71, 85, 105)
      addWrappedText(
        pdf,
        'This report is intended for planning support and high-level review. Cloud cover, seasonality, and imagery availability can affect the output. For critical decisions, validate findings with on-ground surveys and complementary geospatial or administrative data.',
        20,
        methodY,
        pageWidth - 40,
        5
      )

      pdf.save(`satellite-analysis-report-${generatedAt.toISOString().split('T')[0]}.pdf`)
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
  const insightPreview = insights || buildInsightPreview(analysisData, ussLabel, ussInterpretation)
  const orderedImages = [...multiImages].sort((left, right) => Number(left.years_ago ?? 0) - Number(right.years_ago ?? 0))
  const latestImage = orderedImages.find((image) => Number(image.years_ago ?? 0) === 0) || orderedImages[0] || null
  const oldestImage = orderedImages.length > 0 ? orderedImages[orderedImages.length - 1] : null
  const hasComparisonImages = Boolean(latestImage?.preview && oldestImage?.preview)

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

        {/* <Card className="border-blue-200 bg-blue-50/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              AI-Generated Insights
              {loadingInsights ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : null}
            </CardTitle>
            <p className="text-sm text-slate-500">A concise AI summary is surfaced here for faster review.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingInsights ? (
              <div className="flex items-center gap-3 text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span>Generating AI insights...</span>
              </div>
            ) : insightPreview ? (
              <>
                {insightPreview.summary ? <p className="text-slate-700">{insightPreview.summary}</p> : null}
                {insightPreview.score_meaning ? (
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">USS meaning:</span> {insightPreview.score_meaning}
                  </p>
                ) : null}
                {insightPreview.key_findings?.length ? (
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">Top findings</p>
                    <ul className="space-y-2 text-sm text-slate-700">
                      {insightPreview.key_findings.slice(0, 4).map((finding, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">{index + 1}</span>
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {insightPreview.recommendations?.length ? (
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">Recommendation:</span> {insightPreview.recommendations[0]}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-slate-600">Insights will appear here after the analysis data is prepared.</p>
            )}
          </CardContent>
        </Card> */}

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

        {hasComparisonImages ? (
          <Card>
            <CardHeader>
              <CardTitle>Image Comparison Slider</CardTitle>
              <p className="text-sm text-slate-500">Compare the latest capture with the oldest available image from the selected period.</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 aspect-[16/9] shadow-sm">
                  <img
                    src={oldestImage.preview}
                    alt={`Oldest available image from ${oldestImage.years_ago} years ago`}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="%23e2e8f0"/><text x="50%" y="50%" text-anchor="middle" fill="%2364748b" font-family="Arial, sans-serif" font-size="28">Image unavailable</text></svg>'
                    }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-white/90 shadow-[6px_0_24px_rgba(15,23,42,0.25)]"
                    style={{ width: `${comparisonSplit}%` }}
                  >
                    <img
                      src={latestImage.preview}
                      alt="Latest available image"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="%23cbd5e1"/><text x="50%" y="50%" text-anchor="middle" fill="%23334155" font-family="Arial, sans-serif" font-size="28">Image unavailable</text></svg>'
                      }}
                    />
                  </div>
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                    <span className="rounded-full bg-slate-900/70 px-3 py-1 backdrop-blur">Oldest available</span>
                    <span className="rounded-full bg-blue-600/80 px-3 py-1 backdrop-blur">Latest capture</span>
                  </div>
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                    style={{ left: `${comparisonSplit}%` }}
                  >
                    <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-blue-600 shadow-xl" />
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={comparisonSplit}
                    onChange={(e) => setComparisonSplit(Number(e.target.value))}
                    className="w-full accent-blue-600"
                    aria-label="Adjust comparison slider"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Oldest available ({oldestImage.years_ago} years ago)</span>
                    <span>Latest image</span>
                  </div>
                </div>
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
