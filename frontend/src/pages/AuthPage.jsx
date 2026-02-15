import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card'
import { Satellite, Mail, Lock, User, Github } from 'lucide-react'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    // Mock authentication - store user data
    localStorage.setItem('user', JSON.stringify({
      name: 'Development Authority',
      email: 'authority@example.com',
      role: 'Administrator'
    }))
    navigate('/dashboard')
  }

  const handleGoogleAuth = () => {
    // Mock Google auth
    localStorage.setItem('user', JSON.stringify({
      name: 'Development Authority',
      email: 'authority@example.com',
      role: 'Administrator'
    }))
    navigate('/dashboard')
  }

  const handleGithubAuth = () => {
    // Mock Github auth
    localStorage.setItem('user', JSON.stringify({
      name: 'Development Authority',
      email: 'authority@example.com',
      role: 'Administrator'
    }))
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Satellite className="h-10 w-10 text-blue-400" />
          <span className="text-2xl font-bold text-white tracking-tight">
            Satellite Imagery Analyzer
          </span>
        </div>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
          <CardHeader className="space-y-1">
            <div className="flex justify-center gap-2 mb-4">
              <Button
                variant={isLogin ? "default" : "ghost"}
                onClick={() => setIsLogin(true)}
                className={isLogin ? "bg-blue-600 hover:bg-blue-700" : "text-slate-300 hover:text-white hover:bg-slate-700"}
              >
                Sign In
              </Button>
              <Button
                variant={!isLogin ? "default" : "ghost"}
                onClick={() => setIsLogin(false)}
                className={!isLogin ? "bg-blue-600 hover:bg-blue-700" : "text-slate-300 hover:text-white hover:bg-slate-700"}
              >
                Register
              </Button>
            </div>
            <CardTitle className="text-2xl text-center text-white">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-center text-slate-400">
              {isLogin 
                ? 'Enter your credentials to access the platform' 
                : 'Register to start analyzing satellite imagery'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="John Doe"
                      className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="authority@example.com"
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              {isLogin && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-slate-300">
                    <input type="checkbox" className="rounded border-slate-600" />
                    Remember me
                  </label>
                  <a href="#" className="text-blue-400 hover:text-blue-300">
                    Forgot password?
                  </a>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-800 px-2 text-slate-400">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={handleGoogleAuth}
                className="border-slate-600 bg-slate-700/50 text-white hover:bg-slate-700"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
              <Button 
                variant="outline" 
                onClick={handleGithubAuth}
                className="border-slate-600 bg-slate-700/50 text-white hover:bg-slate-700"
              >
                <Github className="h-4 w-4 mr-2" />
                Github
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-400 mt-4">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            {isLogin ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
