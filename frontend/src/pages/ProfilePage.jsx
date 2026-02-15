import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card'
import { ArrowLeft, User, Mail, Briefcase, Calendar } from 'lucide-react'

export default function ProfilePage() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

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
                    <p className="text-slate-900">{new Date().toLocaleDateString()}</p>
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
                  <div className="text-2xl font-bold text-blue-600">12</div>
                  <div className="text-sm text-slate-500">Analyses</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">8</div>
                  <div className="text-sm text-slate-500">Reports</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">24</div>
                  <div className="text-sm text-slate-500">Areas Mapped</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
