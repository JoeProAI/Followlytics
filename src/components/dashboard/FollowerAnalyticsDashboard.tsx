'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import XSpinner from '@/components/ui/XSpinner'

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
  const [showInfluencers, setShowInfluencers] = useState(false)
  const [showGrowthTips, setShowGrowthTips] = useState(false)
  const [showVerified, setShowVerified] = useState(false)
  const [influencers, setInfluencers] = useState<FollowerData[]>([])
  const [verifiedFollowers, setVerifiedFollowers] = useState<FollowerData[]>([])

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
      
      // Extract and rank influencers (10K+ followers) with sophisticated scoring
      const highValueFollowers = (data.followers || []).filter(
        (f: FollowerData) => f.followers_count >= 10000
      ).map((f: FollowerData) => {
        // Multi-factor scoring system
        const reachScore = Math.min((f.followers_count / 1000000) * 100, 100) // Max 100 at 1M followers
        const engagementRate = f.tweet_count && f.followers_count ? 
          Math.min((f.tweet_count / f.followers_count) * 1000, 100) : 50
        const verifiedBonus = f.verified ? 20 : 0
        const influenceRatio = f.following_count ? 
          Math.min((f.followers_count / f.following_count) * 10, 100) : 50
        const activityScore = f.tweet_count ? Math.min((f.tweet_count / 10000) * 100, 100) : 30
        
        // Weighted total score (out of 100)
        const totalScore = (
          reachScore * 0.35 +           // 35% reach
          engagementRate * 0.20 +       // 20% engagement
          verifiedBonus * 0.15 +        // 15% verification
          influenceRatio * 0.20 +       // 20% influence quality
          activityScore * 0.10          // 10% activity
        )
        
        // Determine tier
        let tier = 'C'
        let tierColor = 'gray'
        if (totalScore >= 80) { tier = 'S'; tierColor = 'purple' }
        else if (totalScore >= 65) { tier = 'A'; tierColor = 'blue' }
        else if (totalScore >= 50) { tier = 'B'; tierColor = 'green' }
        
        // Strategic analysis
        let strategy = ''
        if (tier === 'S') {
          strategy = '🎯 Top Priority: High-value partnership opportunity. Direct engagement recommended.'
        } else if (tier === 'A') {
          strategy = '⭐ High Value: Strong collaboration potential. Regular engagement advised.'
        } else if (tier === 'B') {
          strategy = '✅ Good Value: Potential micro-influencer. Occasional engagement beneficial.'
        } else {
          strategy = '💡 Monitor: Building influence. Engage if niche-relevant.'
        }
        
        return {
          ...f,
          score: Math.round(totalScore),
          tier,
          tierColor,
          strategy,
          breakdown: {
            reach: Math.round(reachScore),
            engagement: Math.round(engagementRate),
            verified: verifiedBonus,
            influence: Math.round(influenceRatio),
            activity: Math.round(activityScore)
          }
        }
      }).sort((a: any, b: any) => b.score - a.score)
      
      setInfluencers(highValueFollowers)
      
      // Extract verified followers
      const verified = (data.followers || []).filter(
        (f: FollowerData) => f.verified === true
      ).sort((a: FollowerData, b: FollowerData) => b.followers_count - a.followers_count)
      setVerifiedFollowers(verified)
    } catch (err) {
      console.error('Failed to load follower analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-black border border-gray-800 rounded-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <XSpinner size="lg" />
        </div>
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

      {/* First Extraction Warning */}
      {stats.isFirstExtraction && stats.warnings && stats.warnings.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-300 mb-2">First Extraction Complete!</h3>
              <div className="space-y-1">
                {stats.warnings.map((warning: string, i: number) => (
                  <p key={i} className="text-xs text-gray-300">• {warning}</p>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Run another extraction in a few days to start tracking growth trends and unfollows.
              </p>
            </div>
          </div>
        </div>
      )}

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
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-gray-400">Verified Accounts</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{stats.verifiedCount} ({stats.verifiedPercent}%)</span>
                  {stats.verifiedCount > 0 && (
                    <button 
                      onClick={() => setShowVerified(true)}
                      className="text-xs px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded hover:bg-blue-500/30 transition-all"
                    >
                      View
                    </button>
                  )}
                </div>
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
            <button 
              onClick={() => setShowInfluencers(true)}
              className="text-xs px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded hover:bg-purple-500/30 transition-all"
            >
              View Influencers
            </button>
          </div>

          <div className="bg-black/40 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-400 mb-2">📈 Growth Opportunity</div>
            <p className="text-xs text-gray-400 mb-3">
              {stats.growth > 0 ? `You're growing! ${stats.growth} net new followers. ` : `${Math.abs(stats.growth)} net followers lost. `}
              {stats.engagementScore > 70 ? 'Your engagement potential is high!' : 'Focus on engagement to retain followers.'}
            </p>
            <button 
              onClick={() => setShowGrowthTips(true)}
              className="text-xs px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded hover:bg-blue-500/30 transition-all"
            >
              Growth Tips
            </button>
          </div>
        </div>
      </div>

      {/* Influencers Modal */}
      {showInfluencers && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInfluencers(false)}>
          <div className="bg-gray-900 border border-purple-500/30 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span>🎯</span> Your High-Value Influencer Followers
                </h3>
                <p className="text-sm text-gray-400 mt-1">{influencers.length} followers with 10K+ following</p>
              </div>
              <button onClick={() => setShowInfluencers(false)} className="text-gray-400 hover:text-white text-2xl">
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              {influencers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-4">🔍</div>
                  <p>No influencers found in your follower base yet.</p>
                  <p className="text-sm mt-2">Engage with accounts that have 10K+ followers to attract them!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Scoring Legend */}
                  <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold mb-3 text-sm">📊 Influencer Scoring System</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                      <div>
                        <div className="text-purple-400 font-medium">Reach (35%)</div>
                        <div className="text-gray-500">Follower count</div>
                      </div>
                      <div>
                        <div className="text-blue-400 font-medium">Influence (20%)</div>
                        <div className="text-gray-500">Follower ratio</div>
                      </div>
                      <div>
                        <div className="text-green-400 font-medium">Engagement (20%)</div>
                        <div className="text-gray-500">Tweet rate</div>
                      </div>
                      <div>
                        <div className="text-cyan-400 font-medium">Verified (15%)</div>
                        <div className="text-gray-500">Credibility</div>
                      </div>
                      <div>
                        <div className="text-yellow-400 font-medium">Activity (10%)</div>
                        <div className="text-gray-500">Total posts</div>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-3 pt-3 border-t border-gray-700">
                      <span className="text-xs"><span className="text-purple-400 font-bold">S-Tier</span> 80-100</span>
                      <span className="text-xs"><span className="text-blue-400 font-bold">A-Tier</span> 65-79</span>
                      <span className="text-xs"><span className="text-green-400 font-bold">B-Tier</span> 50-64</span>
                      <span className="text-xs"><span className="text-gray-400 font-bold">C-Tier</span> &lt;50</span>
                    </div>
                  </div>

                  {influencers.map((influencer: any, idx) => (
                    <div key={idx} className={`bg-black border-2 rounded-lg p-5 hover:border-${influencer.tierColor}-500/60 transition-all border-${influencer.tierColor}-500/30`}>
                      {/* Header with Rank and Tier */}
                      <div className="flex items-start gap-4 mb-4">
                        {/* Rank Badge */}
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-${influencer.tierColor}-500/20 to-${influencer.tierColor}-600/20 border-2 border-${influencer.tierColor}-500/50 flex items-center justify-center font-bold text-lg`}>
                            #{idx + 1}
                          </div>
                          <div className={`text-xs font-bold px-2 py-0.5 rounded bg-${influencer.tierColor}-500/20 text-${influencer.tierColor}-400`}>
                            {influencer.tier}-Tier
                          </div>
                        </div>

                        {/* Profile */}
                        <img src={influencer.profile_image_url} alt="" className="w-16 h-16 rounded-full border-2 border-gray-700" />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-white text-lg">{influencer.name}</h4>
                            {influencer.verified && <span className="text-blue-400 text-lg">✓</span>}
                          </div>
                          <p className="text-sm text-gray-400 mb-2">@{influencer.username}</p>
                          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{influencer.bio}</p>
                          
                          {/* Stats Row */}
                          <div className="flex items-center gap-4 text-xs mb-3">
                            <div>
                              <span className="text-purple-400 font-bold">{influencer.followers_count?.toLocaleString()}</span>
                              <span className="text-gray-500"> followers</span>
                            </div>
                            <div>
                              <span className="text-gray-400">{influencer.following_count?.toLocaleString()}</span>
                              <span className="text-gray-500"> following</span>
                            </div>
                            <div>
                              <span className="text-green-400 font-medium">{influencer.tweet_count?.toLocaleString()}</span>
                              <span className="text-gray-500"> posts</span>
                            </div>
                            {influencer.location && (
                              <div>
                                <span className="text-gray-400">📍 {influencer.location}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Overall Score */}
                        <div className="text-center">
                          <div className={`text-4xl font-bold text-${influencer.tierColor}-400 mb-1`}>
                            {influencer.score}
                          </div>
                          <div className="text-xs text-gray-500">Overall Score</div>
                        </div>
                      </div>

                      {/* Score Breakdown */}
                      <div className="bg-gray-900/50 rounded-lg p-3 mb-3">
                        <div className="text-xs text-gray-400 mb-2 font-semibold">Score Breakdown:</div>
                        <div className="grid grid-cols-5 gap-2">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Reach</div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500" style={{ width: `${influencer.breakdown.reach}%` }}></div>
                            </div>
                            <div className="text-xs text-purple-400 font-medium mt-1">{influencer.breakdown.reach}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Influence</div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${influencer.breakdown.influence}%` }}></div>
                            </div>
                            <div className="text-xs text-blue-400 font-medium mt-1">{influencer.breakdown.influence}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Engagement</div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500" style={{ width: `${influencer.breakdown.engagement}%` }}></div>
                            </div>
                            <div className="text-xs text-green-400 font-medium mt-1">{influencer.breakdown.engagement}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Verified</div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-cyan-500" style={{ width: `${(influencer.breakdown.verified / 20) * 100}%` }}></div>
                            </div>
                            <div className="text-xs text-cyan-400 font-medium mt-1">{influencer.breakdown.verified ? '✓' : '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Activity</div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-500" style={{ width: `${influencer.breakdown.activity}%` }}></div>
                            </div>
                            <div className="text-xs text-yellow-400 font-medium mt-1">{influencer.breakdown.activity}</div>
                          </div>
                        </div>
                      </div>

                      {/* Strategic Analysis */}
                      <div className={`bg-${influencer.tierColor}-500/10 border border-${influencer.tierColor}-500/30 rounded-lg p-3 mb-3`}>
                        <div className="text-xs font-semibold text-gray-400 mb-1">Strategic Analysis:</div>
                        <p className="text-sm text-gray-300">{influencer.strategy}</p>
                      </div>

                      {/* Action Button */}
                      <a 
                        href={`https://x.com/${influencer.username}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`block text-center px-4 py-2.5 bg-gradient-to-r from-${influencer.tierColor}-600 to-${influencer.tierColor}-700 hover:from-${influencer.tierColor}-700 hover:to-${influencer.tierColor}-800 text-white rounded-lg text-sm font-medium transition-all`}
                      >
                        Engage with @{influencer.username} →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verified Followers Modal */}
      {showVerified && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowVerified(false)}>
          <div className="bg-gray-900 border border-blue-500/30 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span>✓</span> Your Verified Followers
                </h3>
                <p className="text-sm text-gray-400 mt-1">{verifiedFollowers.length} verified accounts following you</p>
              </div>
              <button onClick={() => setShowVerified(false)} className="text-gray-400 hover:text-white text-2xl">
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              {verifiedFollowers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-4">🔍</div>
                  <p>No verified followers found yet.</p>
                  <p className="text-sm mt-2">Build credibility and engage with verified accounts to attract them!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {verifiedFollowers.map((follower, idx) => (
                    <div key={idx} className="bg-black border border-blue-500/20 rounded-lg p-4 hover:border-blue-500/40 transition-all">
                      <div className="flex items-start gap-4">
                        <img src={follower.profile_image_url} alt="" className="w-16 h-16 rounded-full" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-white">{follower.name}</h4>
                            <span className="text-blue-400 text-lg">✓</span>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">@{follower.username}</p>
                          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{follower.bio}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <div>
                              <span className="text-blue-400 font-medium">{follower.followers_count?.toLocaleString()}</span>
                              <span className="text-gray-500"> followers</span>
                            </div>
                            <div>
                              <span className="text-green-400 font-medium">{follower.tweet_count?.toLocaleString()}</span>
                              <span className="text-gray-500"> posts</span>
                            </div>
                            {follower.location && (
                              <div>
                                <span className="text-gray-400">📍 {follower.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <a 
                          href={`https://x.com/${follower.username}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all"
                        >
                          Engage →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Growth Tips Modal */}
      {showGrowthTips && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowGrowthTips(false)}>
          <div className="bg-gray-900 border border-blue-500/30 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span>📈</span> Personalized Growth Strategy
                </h3>
                <p className="text-sm text-gray-400 mt-1">Based on your {stats.totalFollowers?.toLocaleString()} followers</p>
              </div>
              <button onClick={() => setShowGrowthTips(false)} className="text-gray-400 hover:text-white text-2xl">
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              <div className="space-y-6">
                {/* Critical Actions */}
                {stats.unfollowers > stats.newFollowers && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-red-400 mb-2 flex items-center gap-2">
                      <span>🚨</span> Critical: High Unfollow Rate
                    </h4>
                    <p className="text-sm text-gray-300 mb-3">
                      You lost {stats.unfollowers} followers but only gained {stats.newFollowers}. Net loss: {Math.abs(stats.growth)}.
                    </p>
                    <ul className="text-sm space-y-2 text-gray-400">
                      <li>• Review recent unfollowers - check if content shifted too much</li>
                      <li>• Post more consistently - aim for 1-3 tweets per day</li>
                      <li>• Engage with your audience - reply to comments within 1 hour</li>
                      <li>• Check analytics: which posts led to unfollows?</li>
                    </ul>
                  </div>
                )}

                {/* Engagement Optimization */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
                    <span>⚡</span> Boost Engagement (Score: {stats.engagementScore}/100)
                  </h4>
                  {stats.engagementScore < 50 ? (
                    <>
                      <p className="text-sm text-gray-300 mb-3">Your engagement needs work. Here's how to improve:</p>
                      <ul className="text-sm space-y-2 text-gray-400">
                        <li>• Reply to every comment in the first hour (algorithm boost)</li>
                        <li>• Ask questions - tweets with questions get 50% more replies</li>
                        <li>• Use polls - they get 3x more engagement than regular tweets</li>
                        <li>• Tag relevant accounts when appropriate (not spam)</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-300 mb-3">Good engagement! Take it to the next level:</p>
                      <ul className="text-sm space-y-2 text-gray-400">
                        <li>• Start Twitter Spaces about your niche (2x follower gain)</li>
                        <li>• Create tweet threads (viral potential 10x higher)</li>
                        <li>• Collaborate with similar-sized accounts for cross-promotion</li>
                        <li>• Share behind-the-scenes content (builds connection)</li>
                      </ul>
                    </>
                  )}
                </div>

                {/* Content Strategy */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="font-bold text-purple-400 mb-2 flex items-center gap-2">
                    <span>📝</span> Content Strategy
                  </h4>
                  <p className="text-sm text-gray-300 mb-3">
                    Optimize your content based on your {stats.totalFollowers > 1000 ? 'growing' : 'emerging'} audience:
                  </p>
                  <ul className="text-sm space-y-2 text-gray-400">
                    <li>• Best posting times: 9-11 AM and 6-9 PM (when your followers are active)</li>
                    <li>• Tweet types that work: 40% value, 30% personal, 20% questions, 10% promotional</li>
                    <li>• Use 1-2 relevant hashtags (not more - looks spammy)</li>
                    <li>• Add media to tweets - they get 150% more engagement</li>
                    {stats.influencerCount > 0 && (
                      <li>• Engage with your {stats.influencerCount} influencer followers - they can amplify your reach</li>
                    )}
                  </ul>
                </div>

                {/* Growth Tactics */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h4 className="font-bold text-green-400 mb-2 flex items-center gap-2">
                    <span>🎯</span> Rapid Growth Tactics
                  </h4>
                  <ul className="text-sm space-y-2 text-gray-400">
                    <li>• Engage 30 min/day: reply to 10 tweets in your niche (quality &gt; quantity)</li>
                    <li>• Create a signature content type (thread, meme, tips - be known for something)</li>
                    <li>• Leverage trending topics - but stay authentic to your brand</li>
                    <li>• Engage with accounts 1-3 steps ahead of you (they notice and follow back)</li>
                    {stats.verifiedCount > 0 && (
                      <li>• You have {stats.verifiedCount} verified followers - tag them when relevant for visibility boost</li>
                    )}
                    <li>• Run a giveaway or challenge (follow + retweet = entry) once/month</li>
                  </ul>
                </div>

                {/* Retention Strategy */}
                {stats.unfollowers > 5 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <h4 className="font-bold text-yellow-400 mb-2 flex items-center gap-2">
                      <span>🔒</span> Follower Retention
                    </h4>
                    <p className="text-sm text-gray-300 mb-3">
                      You've lost {stats.unfollowers} followers recently. Here's how to keep them:
                    </p>
                    <ul className="text-sm space-y-2 text-gray-400">
                      <li>• Stay consistent - don't disappear for days then spam</li>
                      <li>• Don't over-promote - follow the 80/20 rule (80% value, 20% promotion)</li>
                      <li>• Avoid controversial takes unless that's your brand</li>
                      <li>• Respond to DMs - people unfollow when ignored</li>
                      <li>• Survey your audience: "What content do you want more of?"</li>
                    </ul>
                  </div>
                )}

                {/* Next Steps */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                    <span>✅</span> Action Plan for This Week
                  </h4>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-3 text-gray-300 hover:text-white cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded" />
                      <span>Post 5-7 tweets (mix of value and personal)</span>
                    </label>
                    <label className="flex items-center gap-3 text-gray-300 hover:text-white cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded" />
                      <span>Engage with 50+ tweets in your niche (genuine replies)</span>
                    </label>
                    <label className="flex items-center gap-3 text-gray-300 hover:text-white cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded" />
                      <span>Reply to every comment on your tweets within 1 hour</span>
                    </label>
                    {influencers.length > 0 && (
                      <label className="flex items-center gap-3 text-gray-300 hover:text-white cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded" />
                        <span>Engage with 5+ of your influencer followers (check list above)</span>
                      </label>
                    )}
                    <label className="flex items-center gap-3 text-gray-300 hover:text-white cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded" />
                      <span>Run a poll or ask a question to boost engagement</span>
                    </label>
                    <label className="flex items-center gap-3 text-gray-300 hover:text-white cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded" />
                      <span>Analyze which tweet got the most engagement and create similar content</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
