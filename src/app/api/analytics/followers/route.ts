import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d'

    console.log(`[Analytics] Loading follower analytics for user: ${userId}, timeframe: ${timeframe}`)

    // Get user metadata to check extraction history
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const firstExtractionDate = userData?.first_follower_extraction || null
    const lastExtractionDate = userData?.last_follower_extraction || null
    const targetUsername = userData?.target_username?.toLowerCase() || null
    
    // Get all followers from Firestore for this target account
    const followersSnapshot = targetUsername
      ? await adminDb
          .collection('users')
          .doc(userId)
          .collection('followers')
          .where('target_username', '==', targetUsername)
          .get()
      : await adminDb
          .collection('users')
          .doc(userId)
          .collection('followers')
          .get()

    if (followersSnapshot.empty) {
      return NextResponse.json({
        followers: [],
        stats: null
      })
    }

    const followers = followersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Check if this is within first 24 hours of first extraction
    const isFirstExtraction = !firstExtractionDate || 
      (new Date().getTime() - new Date(firstExtractionDate).getTime()) < 86400000 // 24 hours

    // Calculate timeframe cutoff
    const now = new Date()
    let cutoffDate = new Date()
    switch (timeframe) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7)
        break
      case '30d':
        cutoffDate.setDate(now.getDate() - 30)
        break
      case '90d':
        cutoffDate.setDate(now.getDate() - 90)
        break
      default:
        cutoffDate = new Date(0) // All time
    }

    // Calculate stats
    const totalFollowers = followers.length
    
    // New followers in timeframe
    // NOTE: On first extraction, all followers get marked with current timestamp
    // So we exclude the initial batch to avoid false "new follower" counts
    const newFollowers = isFirstExtraction ? [] : followers.filter((f: any) => {
      const firstSeen = new Date(f.first_seen || f.extracted_at)
      return firstSeen >= cutoffDate && f.status === 'active'
    })

    // Detect unfollowers (followers marked as unfollowed in timeframe)
    const unfollowers = followers.filter((f: any) => {
      if (f.status === 'unfollowed' && f.last_seen) {
        const lastSeen = new Date(f.last_seen)
        return lastSeen >= cutoffDate
      }
      return false
    })

    // Verified accounts
    const verifiedCount = followers.filter((f: any) => f.verified).length
    const verifiedPercent = totalFollowers > 0 ? Math.round((verifiedCount / totalFollowers) * 100) : 0

    // Influencers (10K+ followers)
    const influencerCount = followers.filter((f: any) => (f.followers_count || 0) >= 10000).length
    const influencerPercent = totalFollowers > 0 ? Math.round((influencerCount / totalFollowers) * 100) : 0

    // Active accounts (1K+ tweets)
    const activeCount = followers.filter((f: any) => (f.tweet_count || 0) >= 1000).length
    const activePercent = totalFollowers > 0 ? Math.round((activeCount / totalFollowers) * 100) : 0

    // Location breakdown
    const locationCounts = followers.reduce((acc: any, f: any) => {
      const loc = f.location || 'Unknown'
      acc[loc] = (acc[loc] || 0) + 1
      return acc
    }, {})

    const topLocations = Object.entries(locationCounts)
      .map(([location, count]) => ({
        location,
        count: count as number,
        percent: totalFollowers > 0 ? Math.round(((count as number) / totalFollowers) * 100) : 0
      }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, 10)

    // Engagement score calculation
    // Based on: verified %, influencer %, active %, bio completion %
    const withBioCount = followers.filter((f: any) => f.bio && f.bio.trim().length > 0).length
    const bioPercent = totalFollowers > 0 ? (withBioCount / totalFollowers) * 100 : 0
    
    const engagementScore = Math.round(
      (verifiedPercent * 0.3) + 
      (influencerPercent * 0.3) + 
      (activePercent * 0.2) + 
      (bioPercent * 0.2)
    )

    // Growth calculation
    const growth = newFollowers.length - unfollowers.length

    // Recent unfollowers with details
    const recentUnfollowers = unfollowers
      .sort((a: any, b: any) => {
        const aDate = new Date(a.last_seen || 0)
        const bDate = new Date(b.last_seen || 0)
        return bDate.getTime() - aDate.getTime()
      })
      .slice(0, 10)
      .map((f: any) => ({
        ...f,
        last_seen: formatRelativeTime(f.last_seen)
      }))

    // Recent new followers with details
    const recentNewFollowers = newFollowers
      .sort((a: any, b: any) => {
        const aDate = new Date(a.first_seen || a.extracted_at || 0)
        const bDate = new Date(b.first_seen || b.extracted_at || 0)
        return bDate.getTime() - aDate.getTime()
      })
      .slice(0, 10)
      .map((f: any) => ({
        ...f,
        first_seen: formatRelativeTime(f.first_seen || f.extracted_at)
      }))

    const stats = {
      totalFollowers,
      newFollowers: newFollowers.length,
      unfollowers: unfollowers.length,
      growth,
      verifiedCount,
      verifiedPercent,
      influencerCount,
      influencerPercent,
      activeCount,
      activePercent,
      engagementScore,
      topLocations,
      recentUnfollowers,
      recentNewFollowers,
      isFirstExtraction,
      firstExtractionDate,
      lastExtractionDate,
      warnings: isFirstExtraction ? [
        'This is your first extraction. Historical tracking starts now.',
        'New followers and unfollowers will be tracked from your next extraction.'
      ] : []
    }

    console.log(`[Analytics] ✅ Calculated stats:`, {
      total: totalFollowers,
      new: newFollowers.length,
      unfollowed: unfollowers.length,
      growth
    })

    return NextResponse.json({
      success: true,
      followers: followers.slice(0, 100), // Return sample for display
      stats
    })

  } catch (error: any) {
    console.error('[Analytics] Error:', error)
    return NextResponse.json({
      error: 'Failed to load analytics',
      details: error.message
    }, { status: 500 })
  }
}

function formatRelativeTime(dateString: string): string {
  if (!dateString) return 'recently'
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}
