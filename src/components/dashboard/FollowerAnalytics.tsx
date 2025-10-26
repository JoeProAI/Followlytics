'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Follower {
  id: string
  username: string
  name: string
  bio?: string
  followers_count?: number
  following_count?: number
  tweet_count?: number
  verified?: boolean
  profile_image_url?: string
  location?: string
  created_at?: string
  url?: string
  profile_url?: string
}

export default function FollowerAnalytics() {
  const { user } = useAuth()
  const [followers, setFollowers] = useState<Follower[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    avgFollowers: 0,
    locations: {} as Record<string, number>,
    topFollowers: [] as Follower[]
  })

  useEffect(() => {
    if (!user) return
    loadFollowers()
  }, [user])

  async function loadFollowers() {
    if (!user) return
    
    setLoading(true)
    try {
      const followersRef = collection(db, 'users', user.uid, 'followers')
      const q = query(followersRef, limit(1000)) // Load up to 1000 followers
      
      const snapshot = await getDocs(q)
      const followerData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Follower))
      
      setFollowers(followerData)
      
      // Calculate stats
      const verified = followerData.filter(f => f.verified).length
      const totalFollowerCount = followerData.reduce((sum, f) => sum + (f.followers_count || 0), 0)
      const avgFollowers = followerData.length > 0 ? Math.round(totalFollowerCount / followerData.length) : 0
      
      // Location breakdown
      const locations: Record<string, number> = {}
      followerData.forEach(f => {
        if (f.location && f.location.trim()) {
          locations[f.location] = (locations[f.location] || 0) + 1
        }
      })
      
      // Top followers by follower count
      const topFollowers = [...followerData]
        .filter(f => f.followers_count > 0)
        .sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0))
        .slice(0, 10)
      
      setStats({
        total: followerData.length,
        verified,
        avgFollowers,
        locations,
        topFollowers
      })
      
    } catch (error) {
      console.error('Error loading followers:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-black border border-gray-800 rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-400">Loading follower data...</span>
        </div>
      </div>
    )
  }

  if (followers.length === 0) {
    return (
      <div className="bg-black border border-gray-800 rounded-lg p-8">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No follower data yet. Extract followers above to get started!</p>
        </div>
      </div>
    )
  }

  const topLocations = Object.entries(stats.locations)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-1">Total Followers</div>
          <div className="text-3xl font-bold">{stats.total.toLocaleString()}</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500/10 to-green-500/10 border border-blue-500/20 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-1">Verified Accounts</div>
          <div className="text-3xl font-bold">{stats.verified.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">
            {((stats.verified / stats.total) * 100).toFixed(1)}% of total
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/10 to-yellow-500/10 border border-green-500/20 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-1">Avg Follower Count</div>
          <div className="text-3xl font-bold">{stats.avgFollowers.toLocaleString()}</div>
        </div>
      </div>

      {/* Top Influencers */}
      <div className="bg-black border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-medium mb-4">🌟 Top Influencers Following You</h3>
        <div className="space-y-3">
          {stats.topFollowers.map((follower, idx) => (
            <div key={follower.username} className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors">
              <div className="text-gray-500 font-mono text-sm w-8">#{idx + 1}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <a 
                    href={follower.profile_url || `https://X.com/${follower.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:text-purple-400 transition-colors"
                  >
                    @{follower.username}
                  </a>
                  {follower.verified && (
                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="text-sm text-gray-400 line-clamp-1">{follower.name}</div>
                {follower.bio && (
                  <div className="text-xs text-gray-500 line-clamp-1 mt-1">{follower.bio}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{follower.followers_count?.toLocaleString()}</div>
                <div className="text-xs text-gray-500">followers</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Locations */}
      {topLocations.length > 0 && (
        <div className="bg-black border border-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-medium mb-4">📍 Top Locations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topLocations.map(([location, count]) => (
              <div key={location} className="flex items-center justify-between p-3 bg-gray-900/50 rounded">
                <span className="text-gray-300">{location}</span>
                <span className="text-purple-400 font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Followers */}
      <div className="bg-black border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-medium mb-4">👥 Recent Followers ({followers.length})</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {followers.slice(0, 50).map((follower) => (
            <div key={follower.username} className="flex items-center gap-3 p-2 hover:bg-gray-900/50 rounded transition-colors">
              {follower.profile_image_url && (
                <img 
                  src={follower.profile_image_url} 
                  alt={follower.username}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <a 
                    href={`https://X.com/${follower.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:text-purple-400 transition-colors truncate"
                  >
                    @{follower.username}
                  </a>
                  {follower.verified && (
                    <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="text-xs text-gray-500 truncate">{follower.bio}</div>
              </div>
              <div className="text-xs text-gray-500 flex-shrink-0">
                {follower.followers_count?.toLocaleString()} followers
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


