import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Satellite, Globe, TrendingUp, MapPin } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features')
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Satellite className="h-8 w-8 text-blue-400" />
            <span className="text-xl font-bold tracking-tight">Satellite Imagery Analyzer</span>
          </div>
          <Button 
            onClick={() => navigate('/auth')}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 bg-white/5"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative min-h-screen flex items-center justify-center px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left Column - Text */}
          <div className="space-y-8 animate-fade-in">
            <div className="inline-block px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm text-blue-300 font-medium">
              Professional Geospatial Analysis Platform
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              Advanced Satellite
              <span className="block text-blue-400">Imagery Analysis</span>
            </h1>
            
            <p className="text-xl text-slate-300 leading-relaxed">
              Comprehensive geospatial intelligence platform for development authorities and construction professionals. 
              Monitor urbanization, vegetation changes, water bodies, and environmental patterns with precision.
            </p>

            <div className="flex gap-4 pt-4 relative z-20">
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg hover:shadow-blue-500/50 transition-all cursor-pointer"
              >
                Get Started →
              </Button>
              <Button 
                onClick={scrollToFeatures}
                variant="outline"
                size="lg"
                className="border-white/30 text-white hover:bg-white/10 bg-white/5 font-semibold cursor-pointer"
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Right Column - Earth Animation */}
          <div className="flex items-center justify-center" style={{animationDelay: '0.2s'}}>
            <div className="relative">
              <div className="earth-sphere"></div>
              
              {/* Orbital Ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[400px] h-[400px] border-2 border-blue-400/20 rounded-full animate-pulse" 
                     style={{animationDuration: '3s'}}></div>
              </div>
              
              {/* Satellite Icon */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="animate-pulse">
                  <Satellite className="h-12 w-12 text-blue-400" />
                </div>
              </div>
              
              {/* Stats Cards */}
              <div className="absolute -left-12 top-1/4 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg p-4 shadow-xl animate-fade-in" 
                   style={{animationDelay: '0.5s'}}>
                <div className="text-2xl font-bold text-blue-400">98%</div>
                <div className="text-xs text-slate-400">Accuracy</div>
              </div>
              
              <div className="absolute -right-12 top-2/3 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg p-4 shadow-xl animate-fade-in" 
                   style={{animationDelay: '0.7s'}}>
                <div className="text-2xl font-bold text-green-400">24/7</div>
                <div className="text-xs text-slate-400">Monitoring</div>
              </div>
            </div>
          </div>
        </div>

        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] -z-10 pointer-events-none"></div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">
            Powerful Features for <span className="text-blue-400">Professionals</span>
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col items-start gap-3 p-6 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-blue-500/50 transition-colors">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-semibold text-lg">Area Selection</h3>
              <p className="text-sm text-slate-400">Precision mapping tools with polygon and rectangle selection capabilities</p>
            </div>
            
            <div className="flex flex-col items-start gap-3 p-6 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-blue-500/50 transition-colors">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-semibold text-lg">Trend Analysis</h3>
              <p className="text-sm text-slate-400">Multi-year tracking of environmental changes and urban development</p>
            </div>
            
            <div className="flex flex-col items-start gap-3 p-6 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-blue-500/50 transition-colors">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Globe className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-semibold text-lg">Global Coverage</h3>
              <p className="text-sm text-slate-400">Access worldwide satellite data for any location on Earth</p>
            </div>
            
            <div className="flex flex-col items-start gap-3 p-6 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-blue-500/50 transition-colors">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Satellite className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-semibold text-lg">Real-time Updates</h3>
              <p className="text-sm text-slate-400">Latest satellite imagery with continuous data updates</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button 
              onClick={() => navigate('/auth')}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg"
            >
              Start Analyzing Now →
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
