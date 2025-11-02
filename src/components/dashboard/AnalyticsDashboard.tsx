'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AnalyticsDashboard() {
  const { user, logout } = useAuth()
  const [followers, setFollowers] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [username, setUsername] = useState('')
  const [sortField, setSortField] = useState<'followers_count' | 'verified'>('followers_count')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

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
        const followersList = data.followers || []
        setFollowers(followersList)
        
        // Calculate comprehensive stats
        const verified = followersList.filter((f: any) => f.verified).length
        const avgFollowers = followersList.length > 0
          ? Math.round(followersList.reduce((sum: number, f: any) => sum + (f.followersCount || 0), 0) / followersList.length)
          : 0
        const withBio = followersList.filter((f: any) => f.bio?.trim()).length
        const highValue = followersList.filter((f: any) => (f.followersCount || 0) > 10000).length
        const microInfluencers = followersList.filter((f: any) => (f.followersCount || 0) >= 1000 && (f.followersCount || 0) <= 100000).length
        
        setStats({
          total: followersList.length,
          verified,
          verifiedPct: followersList.length > 0 ? ((verified / followersList.length) * 100).toFixed(1) : '0',
          avgFollowers,
          withBio,
          withBioPct: followersList.length > 0 ? ((withBio / followersList.length) * 100).toFixed(1) : '0',
          highValue,
          highValuePct: followersList.length > 0 ? ((highValue / followersList.length) * 100).toFixed(1) : '0',
          microInfluencers,
          microInfluencersPct: followersList.length > 0 ? ((microInfluencers / followersList.length) * 100).toFixed(1) : '0'
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
      const response = await fetch('/api/apify/extract-followers', {
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

  const sortedFollowers = [...followers].sort((a, b) => {
    const aVal = sortField === 'verified' ? (a.verified ? 1 : 0) : (a.followersCount || 0)
    const bVal = sortField === 'verified' ? (b.verified ? 1 : 0) : (b.followersCount || 0)
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal
  })

  return (
    <div className="min-h-screen bg-[#0f1419] text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#15191e]">
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight text-white">
            FOLLOWLYTICS
          </Link>
          <div className="flex items-center gap-6">
            <span className="text-sm text-gray-400 font-mono">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Extract Section */}
        <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter X username to analyze..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && extractFollowers()}
              className="flex-1 bg-[#0f1419] border border-gray-700 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
              disabled={extracting}
            />
            <button
              onClick={extractFollowers}
              disabled={extracting || !username.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
            >
              {extracting ? 'EXTRACTING...' : 'EXTRACT'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading analytics...</div>
        ) : !stats ? (
          <div className="text-center py-20 text-gray-500">No data yet. Extract followers to begin analysis.</div>
        ) : (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Total Followers */}
              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Followers</div>
                <div className="text-3xl font-bold font-mono text-white">{stats.total.toLocaleString()}</div>
              </div>

              {/* Verified */}
              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Verified</div>
                <div className="text-3xl font-bold font-mono text-blue-400">{stats.verified.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">{stats.verifiedPct}% of total</div>
              </div>

              {/* Avg Followers */}
              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Avg Followers</div>
                <div className="text-3xl font-bold font-mono text-white">{stats.avgFollowers.toLocaleString()}</div>
              </div>

              {/* With Bio */}
              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">With Bio</div>
                <div className="text-3xl font-bold font-mono text-white">{stats.withBio.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">{stats.withBioPct}% of total</div>
              </div>

              {/* High Value (>10K) */}
              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">High Value (&gt;10K)</div>
                <div className="text-3xl font-bold font-mono text-green-400">{stats.highValue.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">{stats.highValuePct}% of total</div>
              </div>

              {/* Micro-Influencers */}
              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Micro-Influencers (1K-100K)</div>
                <div className="text-3xl font-bold font-mono text-purple-400">{stats.microInfluencers.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">{stats.microInfluencersPct}% of total</div>
              </div>

              {/* Verified Rate */}
              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Verification Rate</div>
                <div className="text-3xl font-bold font-mono text-blue-400">{stats.verifiedPct}%</div>
                <div className="text-xs text-gray-500 mt-1">
                  {parseFloat(stats.verifiedPct) > 5 ? 'Above avg' : 'Below avg'}
                </div>
              </div>

              {/* Bio Completion */}
              <div className="bg-[#15191e] border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Bio Completion</div>
                <div className="text-3xl font-bold font-mono text-white">{stats.withBioPct}%</div>
                <div className="text-xs text-gray-500 mt-1">
                  {parseFloat(stats.withBioPct) > 80 ? 'High quality' : 'Low quality'}
                </div>
              </div>
            </div>

            {/* Followers Table */}
            <div className="bg-[#15191e] border border-gray-800 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                  Follower Data ({followers.length.toLocaleString()} records)
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSortField('followers_count')
                      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
                    }}
                    className="text-xs px-3 py-1 bg-[#0f1419] border border-gray-700 rounded hover:border-gray-600 transition-colors"
                  >
                    Sort by Followers {sortField === 'followers_count' && (sortDir === 'desc' ? '↓' : '↑')}
                  </button>
                  <button
                    onClick={() => {
                      setSortField('verified')
                      setSortDir('desc')
                    }}
                    className="text-xs px-3 py-1 bg-[#0f1419] border border-gray-700 rounded hover:border-gray-600 transition-colors"
                  >
                    Sort by Verified {sortField === 'verified' && '↓'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#0f1419] text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">User</th>
                      <th className="px-6 py-3 text-left font-medium">Username</th>
                      <th className="px-6 py-3 text-right font-medium font-mono">Followers</th>
                      <th className="px-6 py-3 text-center font-medium">Verified</th>
                      <th className="px-6 py-3 text-left font-medium">Bio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {sortedFollowers.slice(0, 100).map((follower, idx) => (
                      <tr key={idx} className="hover:bg-[#1a1f26] transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={follower.profileImage || '/placeholder-avatar.png'}
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                            <span className="font-medium text-white truncate max-w-[200px]">
                              {follower.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-gray-400 font-mono text-xs">
                          @{follower.username}
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-white">
                          {(follower.followersCount || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {follower.verified ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 rounded-full">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          ) : (
                            <span className="text-gray-700">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-400 text-xs truncate max-w-[300px]">
                          {follower.bio || <span className="text-gray-700">No bio</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {followers.length > 100 && (
                <div className="px-6 py-3 border-t border-gray-800 text-xs text-gray-500 text-center">
                  Showing first 100 of {followers.length.toLocaleString()} followers
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
