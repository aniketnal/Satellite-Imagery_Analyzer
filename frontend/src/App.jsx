import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import ProfilePage from './pages/ProfilePage'
import ReportPage from './pages/ReportPage'
import AdminPage from './pages/AdminPage'
import { getCurrentUserSafe, isAdminUser } from './lib/storage'

// Simple auth check
const ProtectedRoute = ({ children }) => {
  const user = getCurrentUserSafe()
  return user?.id ? children : <Navigate to="/auth" replace />
}

const AdminRoute = ({ children }) => {
  const user = getCurrentUserSafe()
  if (!user?.id) return <Navigate to="/auth" replace />
  return isAdminUser(user) ? children : <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/report" 
          element={
            <ProtectedRoute>
              <ReportPage />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
