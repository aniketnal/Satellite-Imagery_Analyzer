import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card'
import { ArrowLeft, Users, BarChart3, Shield } from 'lucide-react'
import { getAllAnalyses, getAllUsersWithAnalyses } from '@/lib/storage'

export default function AdminPage() {
  const navigate = useNavigate()

  const users = useMemo(() => getAllUsersWithAnalyses(), [])
  const allAnalyses = useMemo(() => getAllAnalyses(), [])

  const openSavedReport = (reportState) => {
    if (!reportState) return
    navigate('/report', { state: reportState })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="text-right">
            <p className="text-sm text-slate-500">Admin Console</p>
            <p className="font-semibold text-slate-900">User and Analysis Management</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Users</p>
                <p className="text-2xl font-bold text-slate-900">{users.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Analyses</p>
                <p className="text-2xl font-bold text-slate-900">{allAnalyses.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-100">
                <Shield className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Admin Users</p>
                <p className="text-2xl font-bold text-slate-900">{users.filter((u) => u.role === 'Administrator').length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users and Their Analyses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.email} | {user.role}</p>
                    <p className="text-xs text-slate-500">Joined: {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Analyses</p>
                    <p className="text-xl font-bold text-blue-600">{user.analysesCount}</p>
                  </div>
                </div>

                {user.analyses.length > 0 ? (
                  <div className="space-y-2">
                    {user.analyses.map((item) => {
                      const analysisData = item?.reportState?.analysisData || {}
                      const period = item?.reportState?.period
                      return (
                        <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-md p-3 flex items-center justify-between gap-3">
                          <div className="text-sm">
                            <p className="font-medium text-slate-900">
                              {period === 'current' ? 'Current Year' : `Last ${period} Years`} | Area: {analysisData.area_km2 || 0} km²
                            </p>
                            <p className="text-slate-500">
                              {new Date(item.createdAt).toLocaleString()} | USS: {analysisData.uss_score ?? 'N/A'}/100
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => openSavedReport(item.reportState)}
                          >
                            Open Report
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No analyses for this user yet.</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
