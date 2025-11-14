'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CleanDashboard() {
  const { user, logout } = useAuth()
  const [followers, setFollowers] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, verified: 0, avgFollowers: 0 })
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [username, setUsername] = useState('')

  useEffect(() => {
    if (user) {
      loadFollowers()
    }
  }, [user])

  const loadFollowers = async () => {
    if (!user) return
    
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/followers/stored', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setFollowers(data.followers || [])
        setStats({
          total: data.followers?.length || 0,
          verified: data.followers?.filter((f: any) => f.verified).length || 0,
          avgFollowers: data.stats?.avgFollowers || 0
        })
      }
    } catch (err) {
      console.error('Failed to load followers:', err)
    } finally {
      setLoading(false)
    }
  }

  const extractFollowers = async () => {
    if (!username.trim() || !user) return
    
    setExtracting(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/followers-api/extract-followers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username.trim(), maxFollowers: 1000 })
      })
      
      if (response.ok) {
        await loadFollowers()
        setUsername('')
      }
    } catch (err) {
      console.error('Extraction failed:', err)
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Subtle animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative border-b border-gray-200/50 backdrop-blur-sm bg-white/70">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Followlytics
          </Link>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 py-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-all">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Followers</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-all">
            <div className="text-sm font-medium text-gray-600 mb-1">Verified</div>
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {stats.verified.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-all">
            <div className="text-sm font-medium text-gray-600 mb-1">Avg Followers</div>
            <div className="text-3xl font-bold text-gray-900">{stats.avgFollowers.toLocaleString()}</div>
          </div>
        </div>

        {/* Extract Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 shadow-sm mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Extract Followers</h2>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter X username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && extractFollowers()}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={extracting}
            />
            <button
              onClick={extractFollowers}
              disabled={extracting || !username.trim()}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {extracting ? 'Extracting...' : 'Extract'}
            </button>
          </div>
        </div>

        {/* Followers List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200/50">
            <h2 className="text-xl font-semibold text-gray-900">Your Followers</h2>
          </div>
          
          <div className="divide-y divide-gray-200/50">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Loading...</div>
            ) : followers.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No followers yet. Extract some above to get started.
              </div>
            ) : (
              followers.slice(0, 50).map((follower, idx) => (
                <div key={idx} className="px-8 py-4 hover:bg-gray-50/50 transition-colors flex items-center gap-4">
                  <img
                    src={follower.profileImage || '/placeholder-avatar.png'}
                    alt=""
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{follower.name}</span>
                      {follower.verified && (
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">@{follower.username}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {follower.followersCount?.toLocaleString()} followers
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
