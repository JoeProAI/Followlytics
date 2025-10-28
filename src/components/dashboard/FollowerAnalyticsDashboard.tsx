'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface FollowerData {
  username: string
  name: string
  bio: string
  followers_count: number
  following_count: number
  tweet_count: number
  verified: boolean
  profile_image_url: string
  location: string
  extracted_at: string
  // Historical data for tracking
  first_seen?: string
  last_seen?: string
  follower_count_history?: number[]
  status?: 'active' | 'unfollowed' | 'new'
}

export default function FollowerAnalyticsDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [followers, setFollowers] = useState<FollowerData[]>([])
  const [stats, setStats] = useState<any>(null)
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    if (user) {
      loadFollowerData()
    }
  }, [user, timeframe])

  async function loadFollowerData() {
    if (!user) return
    
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/analytics/followers?timeframe=${timeframe}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await response.json()
      setFollowers(data.followers || [])
      setStats(data.stats || null)
    } catch (err) {
      console.error('Failed to load follower analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-black border border-gray-800 rounded-lg p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400">Loading follower analytics...</p>
      </div>
    )
  }

  // Hide analytics section completely if no follower data exists
  if (!stats) {
    return null
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Follower Intelligence</h2>
          <p className="text-sm text-gray-400">Deep insights into your follower base</p>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex gap-2">
          {['7d', '30d', '90d', 'all'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeframe === tf
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tf === 'all' ? 'All Time' : tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Followers */}
        <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">👥</span>
            <span className={`text-xs px-2 py-1 rounded ${stats.growth > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {stats.growth > 0 ? '↑' : '↓'} {Math.abs(stats.growth)}
            </span>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.totalFollowers?.toLocaleString()}</div>
          <div className="text-sm text-gray-400">Total Followers</div>
        </div>

        {/* New Followers */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">✨</span>
            <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">NEW</span>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.newFollowers?.toLocaleString()}</div>
          <div className="text-sm text-gray-400">New Followers ({timeframe})</div>
        </div>

        {/* Unfollowers */}
        <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">👋</span>
            <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">LOST</span>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.unfollowers?.toLocaleString()}</div>
          <div className="text-sm text-gray-400">Unfollowers ({timeframe})</div>
        </div>

        {/* Engagement Potential */}
        <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">⚡</span>
            <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">SCORE</span>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.engagementScore}</div>
          <div className="text-sm text-gray-400">Engagement Potential</div>
        </div>
      </div>

      {/* Trends & Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Follower Quality */}
        <div className="bg-black border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <span>💎</span> Follower Quality
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Verified Accounts</span>
                <span className="text-white font-medium">{stats.verifiedCount} ({stats.verifiedPercent}%)</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${stats.verifiedPercent}%` }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Influencers (10K+)</span>
                <span className="text-white font-medium">{stats.influencerCount} ({stats.influencerPercent}%)</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${stats.influencerPercent}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Active (Posts &gt; 1K)</span>
                <span className="text-white font-medium">{stats.activeCount} ({stats.activePercent}%)</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats.activePercent}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Location Breakdown */}
        <div className="bg-black border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <span>🌍</span> Top Locations
          </h3>
          <div className="space-y-3">
            {stats.topLocations?.slice(0, 5).map((loc: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '📍'}</span>
                  <span className="text-sm text-gray-300">{loc.location || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-800 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${loc.percent}%` }}></div>
                  </div>
                  <span className="text-sm font-medium text-white w-12 text-right">{loc.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Unfollowers (if any) */}
      {stats.recentUnfollowers && stats.recentUnfollowers.length > 0 && (
        <div className="bg-black border border-red-500/30 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <span>👋</span> Recent Unfollowers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.recentUnfollowers.slice(0, 6).map((follower: FollowerData, idx: number) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                <img src={follower.profile_image_url} alt="" className="w-12 h-12 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{follower.name}</div>
                  <div className="text-xs text-gray-500">@{follower.username}</div>
                  <div className="text-xs text-red-400 mt-1">Unfollowed {follower.last_seen}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Followers (if any) */}
      {stats.recentNewFollowers && stats.recentNewFollowers.length > 0 && (
        <div className="bg-black border border-green-500/30 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <span>✨</span> New Followers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.recentNewFollowers.slice(0, 6).map((follower: FollowerData, idx: number) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                <img src={follower.profile_image_url} alt="" className="w-12 h-12 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{follower.name}</div>
                  <div className="text-xs text-gray-500">@{follower.username}</div>
                  <div className="text-xs text-gray-400">{follower.followers_count?.toLocaleString()} followers</div>
                  <div className="text-xs text-green-400 mt-1">Followed {follower.first_seen}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <span>💡</span> Insights & Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/40 rounded-lg p-4">
            <div className="text-sm font-medium text-purple-400 mb-2">🎯 High-Value Targets</div>
            <p className="text-xs text-gray-400 mb-3">
              You have {stats.influencerCount} followers with 10K+ followers. These are prime candidates for collaboration or engagement.
            </p>
            <button className="text-xs px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded hover:bg-purple-500/30 transition-all">
              View Influencers
            </button>
          </div>

          <div className="bg-black/40 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-400 mb-2">📈 Growth Opportunity</div>
            <p className="text-xs text-gray-400 mb-3">
              {stats.growth > 0 ? `You're growing! ${stats.growth} net new followers. ` : `${Math.abs(stats.growth)} net followers lost. `}
              {stats.engagementScore > 70 ? 'Your engagement potential is high!' : 'Focus on engagement to retain followers.'}
            </p>
            <button className="text-xs px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded hover:bg-blue-500/30 transition-all">
              Growth Tips
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
