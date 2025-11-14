'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import BotAnalysisCard from '@/components/dashboard/BotAnalysisCard'
import RecentScansCard from '@/components/dashboard/RecentScansCard'
import FollowerExportCard from '@/components/dashboard/FollowerExportCard'

export default function BotDetectionDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user && !loading) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-purple-600 mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      {/* Header */}
      <header className="bg-[#16181c] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-3xl">🤖</span>
                <h1 className="text-2xl font-bold text-white">Followlytics</h1>
              </div>
              <div className="px-3 py-1 bg-purple-600/20 border border-purple-500/50 rounded-full">
                <span className="text-sm font-medium text-purple-400">Bot Detection</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Signed in as</p>
                <p className="text-sm font-medium text-white">{user.email}</p>
              </div>
              <button
                onClick={() => {
                  // Sign out logic
                  window.location.href = '/api/auth/logout'
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Detect Bots in Any Twitter Account
          </h2>
          <p className="text-gray-400 text-lg">
            Analyze any public account for bot activity, fake followers, and audience quality
          </p>
        </div>

        {/* Features Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#16181c] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌍</span>
              <div>
                <h3 className="font-semibold text-white">Any Public Account</h3>
                <p className="text-sm text-gray-400">No authentication needed</p>
              </div>
            </div>
          </div>
          
          <div className="bg-[#16181c] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎨</span>
              <div>
                <h3 className="font-semibold text-white">AI Presentations</h3>
                <p className="text-sm text-gray-400">Beautiful Gamma reports</p>
              </div>
            </div>
          </div>
          
          <div className="bg-[#16181c] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <h3 className="font-semibold text-white">100% Safe</h3>
                <p className="text-sm text-gray-400">Your account never involved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bot Analysis Card - Takes up 2 columns */}
          <div className="lg:col-span-2">
            <BotAnalysisCard />
          </div>

          {/* Recent Scans - Takes up 1 column */}
          <div>
            <RecentScansCard />
          </div>
        </div>

        {/* Follower Export Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">Export Follower Lists</h2>
          <FollowerExportCard />
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <span className="text-3xl">💡</span>
            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-2">How Bot Detection Works</h3>
              <ul className="space-y-2 text-sm text-blue-200">
                <li>• <strong>Public Data Analysis:</strong> We analyze publicly visible follower patterns</li>
                <li>• <strong>9+ Bot Indicators:</strong> Default images, username patterns, suspicious ratios, and more</li>
                <li>• <strong>Aggregate Insights Only:</strong> You receive bot percentages and insights, not raw follower lists</li>
                <li>• <strong>Your Privacy Protected:</strong> Your Twitter account is never involved in data extraction</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#16181c] border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">✅ Perfect For:</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Vetting influencers before partnerships</li>
              <li>• Brand safety and due diligence</li>
              <li>• Competitive audience analysis</li>
              <li>• Monitoring your own audience quality</li>
              <li>• Investor due diligence on influencers</li>
            </ul>
          </div>

          <div className="bg-[#16181c] border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">🎯 Example Analyses:</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <button className="w-full text-left px-3 py-2 bg-[#0f1419] hover:bg-gray-800 rounded transition-colors">
                @elonmusk - 167M followers
              </button>
              <button className="w-full text-left px-3 py-2 bg-[#0f1419] hover:bg-gray-800 rounded transition-colors">
                @katyperry - 108M followers
              </button>
              <button className="w-full text-left px-3 py-2 bg-[#0f1419] hover:bg-gray-800 rounded transition-colors">
                @BarackObama - 132M followers
              </button>
              <p className="text-gray-500 mt-2 italic">Click to analyze these accounts</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12 border-t border-gray-800">
        <div className="text-center text-sm text-gray-500">
          <p>Followlytics Bot Detection • Powered by Advanced AI Analytics</p>
          <p className="mt-2">
            We analyze public data to provide security insights. No raw follower data is stored or displayed.
          </p>
        </div>
      </footer>
    </div>
  )
}
