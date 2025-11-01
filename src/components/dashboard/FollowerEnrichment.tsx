'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import XSpinner from '@/components/ui/XSpinner'

export default function FollowerEnrichment() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function enrichFollowers() {
    if (!user) return
    
    setLoading(true)
    setError('')
    setResult(null)
    
    try {
      const token = await user.getIdToken()
      
      // Get ALL followers to enrich
      const followersResponse = await fetch('/api/followers/stored', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!followersResponse.ok) {
        throw new Error('Failed to get followers')
      }
      
      const followersData = await followersResponse.json()
      const allUsernames = followersData.followers
        ?.map((f: any) => f.username)
        .filter(Boolean)
      
      if (!allUsernames || allUsernames.length === 0) {
        throw new Error('No followers found to enrich. Extract followers first.')
      }

      console.log(`[Enrich] Enriching ${allUsernames.length} followers in batches...`)
      
      // Process in batches of 100 to avoid timeouts
      const batchSize = 100
      const batches = []
      for (let i = 0; i < allUsernames.length; i += batchSize) {
        batches.push(allUsernames.slice(i, i + batchSize))
      }

      let totalEnriched = 0
      const allProfiles = []

      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        console.log(`[Enrich] Processing batch ${i + 1}/${batches.length} (${batches[i].length} users)`)
        
        const enrichResponse = await fetch('/api/apify/enrich-followers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ usernames: batches[i] })
        })
        
        // Get response text first to handle both JSON and non-JSON responses
        const responseText = await enrichResponse.text()
        
        let enrichData
        try {
          enrichData = JSON.parse(responseText)
        } catch (jsonError) {
          console.error('[Enrich] Failed to parse JSON response:', responseText)
          throw new Error(`Server error: ${responseText.substring(0, 100)}... Check console for full details.`)
        }
        
        if (!enrichResponse.ok) {
          throw new Error(enrichData.error || enrichData.details || 'Failed to enrich followers')
        }

        totalEnriched += enrichData.enriched_count
        allProfiles.push(...enrichData.profiles)
      }

      // Set combined results
      const totalCost = ((totalEnriched / 1000) * 0.15).toFixed(4)
      setResult({
        success: true,
        enriched_count: totalEnriched,
        profiles: allProfiles,
        cost: totalCost,
        batches: batches.length
      })
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-black border border-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-medium">✨ Get Verified Badges</h2>
          <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
            REQUIRED FOR VERIFIED COUNT
          </span>
        </div>
        <p className="text-sm text-gray-400">
          Your current extraction doesn't include verified status. Run this once to add Blue/Gold/Gray checkmarks to ALL your followers.
        </p>
      </div>

      {/* Features */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
          <div className="text-blue-400 text-xl mb-1">✓</div>
          <div className="text-xs text-gray-400">Verified Status</div>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
          <div className="text-purple-400 text-xl mb-1">📊</div>
          <div className="text-xs text-gray-400">Full Metrics</div>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
          <div className="text-green-400 text-xl mb-1">⚡</div>
          <div className="text-xs text-gray-400">40 profiles/sec</div>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-gray-800">
          <div className="text-yellow-400 text-xl mb-1">💰</div>
          <div className="text-xs text-gray-400">$0.15/1K users</div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Success Display */}
      {result && (
        <div className="mb-4 space-y-4">
          {/* Summary Card */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-green-300 mb-1 flex items-center gap-2">
                  ✅ Enrichment Complete
                </div>
                <div className="text-sm text-gray-400">
                  Enhanced <strong className="text-white">{result.enriched_count}</strong> followers with premium data
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Cost</div>
                <div className="text-lg font-bold text-green-400">${result.cost}</div>
              </div>
            </div>
          </div>

          {/* Verified Users Preview */}
          {result.profiles && result.profiles.length > 0 && (
            <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-300">Verified Followers</h4>
                <span className="text-xs text-blue-400">
                  {result.profiles.filter((p: any) => p.verified || p.is_blue_verified).length} verified
                </span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {result.profiles
                  .filter((p: any) => p.verified || p.is_blue_verified)
                  .slice(0, 20)
                  .map((profile: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-2 bg-black/40 rounded border border-gray-800">
                      {profile.profile_image_url && (
                        <img src={profile.profile_image_url} alt="" className="w-10 h-10 rounded-full" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white truncate">{profile.name}</span>
                          {profile.verified && <span className="text-blue-400">✓</span>}
                          {profile.is_blue_verified && (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400">
                              BLUE
                            </span>
                          )}
                          {profile.verified_type === 'gold' && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400">
                              GOLD
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">@{profile.username}</div>
                        {profile.bio && (
                          <div className="text-xs text-gray-400 mt-1 line-clamp-2">{profile.bio}</div>
                        )}
                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                          <span>{profile.followers_count?.toLocaleString() || 0} followers</span>
                          <span>{profile.tweet_count?.toLocaleString() || 0} tweets</span>
                          {profile.location && <span>📍 {profile.location}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Data Included */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">📊 Data Included</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-400">
              <div>✓ Verified Status (Blue/Gold/Gray)</div>
              <div>✓ Follower Count</div>
              <div>✓ Following Count</div>
              <div>✓ Tweet Count</div>
              <div>✓ Location</div>
              <div>✓ Bio/Description</div>
              <div>✓ Profile Images</div>
              <div>✓ Account Created Date</div>
              <div>✓ Protected Status</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={enrichFollowers}
        disabled={loading || !!result}
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <XSpinner size="md" />
            Enriching followers...
          </span>
        ) : result ? (
          '✅ Enrichment Complete - Refresh Page to See Results'
        ) : (
          '✨ Enrich ALL Followers (Get Verified Badges)'
        )}
      </button>

      {/* Info Box */}
      <div className="mt-6 bg-black/40 border border-gray-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-gray-400 space-y-1">
            <p><strong className="text-gray-300">How it works:</strong> Uses Apify's Premium X User Scraper to fetch detailed profile data.</p>
            <p><strong className="text-gray-300">What you get:</strong> Verified badges (Blue/Gold/Gray checkmarks), complete metrics, bio, location, and more.</p>
            <p><strong className="text-gray-300">Speed:</strong> 40 profiles per second - blazing fast!</p>
            <p><strong className="text-gray-300">Cost:</strong> $0.15 per 1,000 users enriched (same as extraction).</p>
          </div>
        </div>
      </div>

      {result && (
        <div className="mt-4 text-center">
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            Refresh page to see enriched follower data →
          </button>
        </div>
      )}
    </div>
  )
}
