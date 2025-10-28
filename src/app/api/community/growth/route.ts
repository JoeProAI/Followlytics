import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { 
  getCommunityTier, 
  getNextCommunityTier, 
  getCommunityProgress,
  getCommunityMessage,
  JOEPROAI_TWITTER_USERNAME 
} from '@/lib/community-growth'

// Cache follower count for 1 hour to avoid excessive API calls
const CACHE_DURATION_MS = 60 * 60 * 1000 // 1 hour

/**
 * Get @JoeProAI follower count and community tier info
 * Cached for performance
 */
export async function GET(request: NextRequest) {
  try {
    // Check cache first
    const cacheRef = adminDb.collection('system').doc('community_cache')
    const cacheDoc = await cacheRef.get()
    const cachedData = cacheDoc.data()
    
    const now = Date.now()
    const cacheValid = cachedData && 
                       cachedData.timestamp && 
                       (now - cachedData.timestamp < CACHE_DURATION_MS)
    
    let joeproFollowers = 800 // Default fallback (current count)
    
    if (cacheValid) {
      // Use cached data
      joeproFollowers = cachedData.joeproFollowers || 800
      console.log('[Community] Using cached follower count:', joeproFollowers)
    } else {
      // Fetch fresh data from Apify (we have follower extraction already)
      // Or use Twitter API if available
      // For now, we'll manually update this or fetch from our own extraction
      
      try {
        // Try to get latest extraction of @JoeProAI if it exists
        const extractionsSnapshot = await adminDb
          .collection('system')
          .doc('joeproai_stats')
          .get()
        
        if (extractionsSnapshot.exists) {
          const data = extractionsSnapshot.data()
          joeproFollowers = data?.followerCount || 800
        }
        
        // Update cache
        await cacheRef.set({
          joeproFollowers,
          timestamp: now,
          lastUpdated: new Date().toISOString()
        })
        
        console.log('[Community] Refreshed follower count:', joeproFollowers)
      } catch (error) {
        console.error('[Community] Error fetching follower count:', error)
        // Keep fallback value
      }
    }
    
    // Calculate tier information
    const currentTier = getCommunityTier(joeproFollowers)
    const nextTier = getNextCommunityTier(joeproFollowers)
    const progress = getCommunityProgress(joeproFollowers)
    const message = getCommunityMessage(joeproFollowers)
    
    return NextResponse.json({
      success: true,
      joeproFollowers,
      currentTier,
      nextTier,
      progress,
      message: message.message,
      lastUpdated: cachedData?.lastUpdated || new Date().toISOString(),
      cached: cacheValid
    })

  } catch (error: any) {
    console.error('[Community] Error:', error)
    return NextResponse.json({
      error: 'Failed to load community growth data',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Manual update endpoint (protected - only you can call this)
 * POST /api/community/growth
 * Body: { followerCount: 1234, adminKey: "secret" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { followerCount, adminKey } = body
    
    // Simple admin key check (you should set this in env vars)
    const ADMIN_KEY = process.env.COMMUNITY_UPDATE_KEY || 'change-me-in-production'
    
    if (adminKey !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!followerCount || typeof followerCount !== 'number') {
      return NextResponse.json({ 
        error: 'Invalid followerCount. Must be a number.' 
      }, { status: 400 })
    }
    
    // Update cache and stats
    const now = Date.now()
    await adminDb.collection('system').doc('community_cache').set({
      joeproFollowers: followerCount,
      timestamp: now,
      lastUpdated: new Date().toISOString()
    })
    
    await adminDb.collection('system').doc('joeproai_stats').set({
      followerCount,
      updatedAt: new Date().toISOString(),
      updatedBy: 'manual'
    })
    
    console.log('[Community] Manually updated follower count to:', followerCount)
    
    const currentTier = getCommunityTier(followerCount)
    const nextTier = getNextCommunityTier(followerCount)
    
    return NextResponse.json({
      success: true,
      message: 'Follower count updated successfully',
      joeproFollowers: followerCount,
      currentTier,
      nextTier
    })

  } catch (error: any) {
    console.error('[Community] Update error:', error)
    return NextResponse.json({
      error: 'Failed to update follower count',
      details: error.message
    }, { status: 500 })
  }
}
