'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface UnfollowerData {
  stats: {
    totalUnfollows: number
    totalRefollows: number
    netLoss: number
    currentUnfollowers: number
    serialUnfollowers: number
    unfollowsLast24h: number
    unfollowsLast7d: number
    unfollowsLast30d: number
  }
  currentUnfollowers: any[]
  recentUnfollows: any[]
  recentRefollows: any[]
  patterns: {
    serialUnfollowers: any[]
    loyalRefollowers: any[]
    quickUnfollowers: any[]
  }
  allEvents: any[]
}

export default function UnfollowerIntelligence() {
  const { user } = useAuth()
  const [data, setData] = useState<UnfollowerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'current' | 'recent' | 'refollows' | 'patterns'>('current')

  useEffect(() => {
    if (user) {
      loadUnfollowerData()
    }
  }, [user])

  async function loadUnfollowerData() {
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/analytics/unfollowers', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to load unfollower data:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatTimeAgo(timestamp: string): string {
    const now = new Date().getTime()
    const then = new Date(timestamp).getTime()
    const diff = now - then
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-800 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-800 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!data || data.stats.totalUnfollows === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">👋</div>
        <h3 className="text-xl font-medium mb-2">No Unfollower Data Yet</h3>
        <p className="text-gray-400 text-sm">
          Extract followers multiple times to start tracking unfollows and re-follows.
        </p>
      </div>
    )
  }

  const { stats, currentUnfollowers, recentUnfollows, recentRefollows, patterns } = data

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">👋 Unfollower Intelligence</h2>
            <p className="text-sm text-gray-400">
              Track who unfollows, re-follows, and identify patterns that affect your reach.
            </p>
          </div>
          <button
            onClick={loadUnfollowerData}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-red-500/20">
            <div className="text-3xl font-bold text-red-400">{stats.currentUnfollowers}</div>
            <div className="text-xs text-gray-400 mt-1">Current Unfollowers</div>
          </div>
          
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-orange-500/20">
            <div className="text-3xl font-bold text-orange-400">{stats.unfollowsLast24h}</div>
            <div className="text-xs text-gray-400 mt-1">Last 24 Hours</div>
          </div>
          
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-yellow-500/20">
            <div className="text-3xl font-bold text-yellow-400">{stats.totalRefollows}</div>
            <div className="text-xs text-gray-400 mt-1">Total Re-follows</div>
          </div>
          
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20">
            <div className="text-3xl font-bold text-purple-400">{stats.serialUnfollowers}</div>
            <div className="text-xs text-gray-400 mt-1">Serial Unfollowers</div>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">7d trend:</span>
            <span className="text-red-400">{stats.unfollowsLast7d} unfollows</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">30d trend:</span>
            <span className="text-orange-400">{stats.unfollowsLast30d} unfollows</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Net loss:</span>
            <span className={stats.netLoss > 0 ? 'text-red-400' : 'text-green-400'}>
              {stats.netLoss > 0 ? `-${stats.netLoss}` : `+${Math.abs(stats.netLoss)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'current'
              ? 'border-red-500 text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Current ({stats.currentUnfollowers})
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'recent'
              ? 'border-orange-500 text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Recent Unfollows
        </button>
        <button
          onClick={() => setActiveTab('refollows')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'refollows'
              ? 'border-green-500 text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Re-follows ({stats.totalRefollows})
        </button>
        <button
          onClick={() => setActiveTab('patterns')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'patterns'
              ? 'border-purple-500 text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Patterns
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        {/* Current Unfollowers */}
        {activeTab === 'current' && (
          <div>
            <h3 className="text-lg font-medium mb-4">Current Unfollowers</h3>
            {currentUnfollowers.length === 0 ? (
              <p className="text-gray-400 text-sm">No current unfollowers. Everyone's still with you! 🎉</p>
            ) : (
              <div className="space-y-3">
                {currentUnfollowers.map((user: any) => (
                  <div key={user.username} className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                    <img
                      src={user.profileImage || '/default-avatar.png'}
                      alt={user.name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{user.name}</span>
                        {user.verified && (
                          <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">@{user.username}</div>
                      {user.bio && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{user.bio}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-red-400">
                        {formatTimeAgo(user.unfollowedAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.followersCount?.toLocaleString()} followers
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Unfollows */}
        {activeTab === 'recent' && (
          <div>
            <h3 className="text-lg font-medium mb-4">Recent Unfollows (Last 50)</h3>
            <div className="space-y-3">
              {recentUnfollows.map((event: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
                  <img
                    src={event.profileImage || '/default-avatar.png'}
                    alt={event.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{event.name}</span>
                      {event.verified && <span className="text-blue-400 text-xs">✓</span>}
                    </div>
                    <div className="text-sm text-gray-400">@{event.username}</div>
                  </div>
                  <div className="text-sm text-gray-400">{formatTimeAgo(event.timestamp)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Re-follows */}
        {activeTab === 'refollows' && (
          <div>
            <h3 className="text-lg font-medium mb-4 text-green-400">People Who Came Back 🎉</h3>
            {recentRefollows.length === 0 ? (
              <p className="text-gray-400 text-sm">No re-follows yet.</p>
            ) : (
              <div className="space-y-3">
                {recentRefollows.map((event: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                    <img
                      src={event.profileImage || '/default-avatar.png'}
                      alt={event.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{event.name}</span>
                        {event.verified && <span className="text-blue-400 text-xs">✓</span>}
                      </div>
                      <div className="text-sm text-gray-400">@{event.username}</div>
                      <div className="text-xs text-green-400 mt-1">
                        Re-followed after being away {event.days_away || 0} days
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">{formatTimeAgo(event.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Patterns */}
        {activeTab === 'patterns' && (
          <div className="space-y-6">
            {/* Serial Unfollowers */}
            <div>
              <h3 className="text-lg font-medium mb-3 text-purple-400">Serial Unfollowers (Avoid These)</h3>
              <p className="text-sm text-gray-400 mb-4">People who unfollowed multiple times - probably not your target audience.</p>
              {patterns.serialUnfollowers.length === 0 ? (
                <p className="text-gray-500 text-sm">No serial unfollowers detected.</p>
              ) : (
                <div className="space-y-2">
                  {patterns.serialUnfollowers.slice(0, 10).map((user: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-purple-500/5 border border-purple-500/20 rounded">
                      <span className="text-sm">@{user.username}</span>
                      <span className="text-sm text-purple-400">
                        Unfollowed {user.unfollowCount}x, Refollowed {user.refollowCount}x
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Unfollowers */}
            <div>
              <h3 className="text-lg font-medium mb-3 text-yellow-400">Quick Unfollowers (Follow-Unfollow Spam)</h3>
              <p className="text-sm text-gray-400 mb-4">Unfollowed within 7 days of following - classic growth hack spammers.</p>
              {patterns.quickUnfollowers.length === 0 ? (
                <p className="text-gray-500 text-sm">No quick unfollowers detected.</p>
              ) : (
                <div className="space-y-2">
                  {patterns.quickUnfollowers.slice(0, 10).map((user: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-yellow-500/5 border border-yellow-500/20 rounded">
                      <span className="text-sm">@{user.username}</span>
                      <span className="text-sm text-yellow-400">
                        Unfollowed after {user.daysBetweenFollowAndUnfollow} days
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Loyal Re-followers */}
            <div>
              <h3 className="text-lg font-medium mb-3 text-green-400">Loyal Re-followers (Engage These!)</h3>
              <p className="text-sm text-gray-400 mb-4">Came back after unfollowing - clearly interested in your content.</p>
              {patterns.loyalRefollowers.length === 0 ? (
                <p className="text-gray-500 text-sm">No loyal re-followers yet.</p>
              ) : (
                <div className="space-y-2">
                  {patterns.loyalRefollowers.slice(0, 10).map((user: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded">
                      <span className="text-sm">@{user.username}</span>
                      <span className="text-sm text-green-400">
                        Re-followed {user.refollowCount}x
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2">💡 Insights</h4>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• High unfollows may indicate content misalignment or posting frequency issues</li>
          <li>• Serial unfollowers are likely using follow/unfollow growth tactics - block them</li>
          <li>• Re-followers are highly engaged - consider creating content specifically for them</li>
          <li>• Track unfollows after specific posts to identify what content doesn't resonate</li>
        </ul>
      </div>
    </div>
  )
}
