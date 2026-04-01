import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card'
import { ArrowLeft, Mail, Briefcase, Calendar } from 'lucide-react'
import { getCurrentUserSafe, getUserAnalyses, isAdminUser } from '@/lib/storage'

export default function ProfilePage() {
  const navigate = useNavigate()
  const user = getCurrentUserSafe() || {}
  const analyses = useMemo(() => getUserAnalyses(user.id), [user.id])

  const totalAnalyses = analyses.length
  const totalReports = analyses.length
  const totalAreas = analyses.reduce((sum, item) => {
    const areaKm = Number(item?.reportState?.analysisData?.area_km2 || 0)
    return sum + areaKm
  }, 0)

  const openSavedAnalysis = (savedItem) => {
    if (!savedItem?.reportState) return
    navigate('/report', { state: savedItem.reportState })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">User Profile</h1>

        <div className="grid gap-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-semibold">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
                  <p className="text-slate-500">{user.role}</p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="text-slate-900">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Role</p>
                    <p className="text-slate-900">{user.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Member Since</p>
                    <p className="text-slate-900">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Update Email
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Notification Preferences
              </Button>
              {isAdminUser(user) ? (
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/admin')}>
                  Open Admin Panel
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{totalAnalyses}</div>
                  <div className="text-sm text-slate-500">Analyses</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{totalReports}</div>
                  <div className="text-sm text-slate-500">Reports</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{totalAreas.toFixed(2)}</div>
                  <div className="text-sm text-slate-500">Area Mapped (km²)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Previous Analyses</CardTitle>
            </CardHeader>
            <CardContent>
              {analyses.length === 0 ? (
                <p className="text-sm text-slate-500">No saved analyses yet.</p>
              ) : (
                <div className="space-y-3">
                  {analyses.map((item, index) => {
                    const analysisData = item?.reportState?.analysisData || {}
                    const period = item?.reportState?.period
                    return (
                      <div key={item.id || index} className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg p-3">
                        <div className="text-sm">
                          <p className="font-semibold text-slate-900">
                            {period === 'current' ? 'Current Year' : `Last ${period} Years`} | {analysisData.area_km2 || 0} km²
                          </p>
                          <p className="text-slate-500">
                            {new Date(item.createdAt).toLocaleString()} | USS: {analysisData.uss_score ?? 'N/A'}/100
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => openSavedAnalysis(item)}
                        >
                          Open Report
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
