import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { getUserSubscription } from '@/lib/subscription'
import { getFollowerLimitForTier } from '@/lib/follower-usage'
import { getCommunityTier } from '@/lib/community-growth'

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

    // Check if requesting specific account (for competitor switching)
    const { searchParams } = new URL(request.url)
    const requestedUsername = searchParams.get('username')?.toLowerCase()
    
    console.log(`[Stored Followers] Loading for user: ${userId}${requestedUsername ? `, account: @${requestedUsername}` : ''}`)

    // Get user metadata
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()

    const subscription = await getUserSubscription(userId)
    const { tierKey, limit } = getFollowerLimitForTier(subscription.tier)
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const usageRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('usage')
      .doc('current_month')

    const usageSnapshot = await usageRef.get()
    let usageData = usageSnapshot.exists ? usageSnapshot.data() : null

    if (!usageData || usageData.month !== month || usageData.year !== year) {
      usageData = {
        month,
        year,
        followers_extracted: 0,
        extractions_count: 0,
        last_reset: now.toISOString(),
        last_extraction: null,
        tier: tierKey
      }
    }

    const followersUsed = usageData.followers_extracted || 0
    const remainingFollowers = limit === null ? null : Math.max((limit || 0) - followersUsed, 0)

    // Use requested username if provided, otherwise fall back to user's main account
    const targetUsername = requestedUsername || userData?.target_username?.toLowerCase() || null

    // Get all stored followers for this target account
    const followersSnapshot = targetUsername
      ? await adminDb
          .collection('users')
          .doc(userId)
          .collection('followers')
          .where('target_username', '==', targetUsername)
          .where('status', '==', 'active')
          .limit(1000)
          .get()
      : await adminDb
          .collection('users')
          .doc(userId)
          .collection('followers')
          .where('status', '==', 'active')
          .limit(1000)
          .get()

    if (followersSnapshot.empty) {
      console.log(`[Stored Followers] No followers found for @${targetUsername || 'unknown'}`)
      return NextResponse.json({
        followers: [],
        total: 0,
        targetUsername: targetUsername, // Return the account we tried to load
        usage: {
          month,
          year,
          tier: usageData.tier || tierKey,
          followers_extracted: followersUsed,
          extractions_count: usageData.extractions_count || 0,
          last_extraction: usageData.last_extraction || null,
          last_reset: usageData.last_reset || null,
          limit,
          remaining: remainingFollowers
        }
      })
    }

    const followers = followersSnapshot.docs.map(doc => ({
      username: doc.data().username,
      name: doc.data().name,
      bio: doc.data().bio,
      verified: doc.data().verified,
      followersCount: doc.data().followers_count,
      profileImage: doc.data().profile_image_url,
      location: doc.data().location,
      extracted_at: doc.data().extracted_at,
      first_seen: doc.data().first_seen,
      last_seen: doc.data().last_seen
    }))

    // Calculate quick stats
    const verifiedCount = followers.filter(f => f.verified === true).length
    const avgFollowers = followers.length > 0
      ? Math.round(followers.reduce((sum, f) => sum + (f.followersCount || 0), 0) / followers.length)
      : 0
    const withBioCount = followers.filter(f => f.bio && f.bio.trim().length > 0).length
    const withBioPercent = followers.length > 0
      ? Math.round((withBioCount / followers.length) * 100)
      : 0

    const stats = {
      verified: verifiedCount,
      avgFollowers,
      withBio: withBioPercent
    }

    console.log(`[Stored Followers] Loaded ${followers.length} followers, ${verifiedCount} verified`)

    return NextResponse.json({
      success: true,
      followers,
      total: followers.length,
      targetUsername: targetUsername, // Return the account we actually loaded
      stats,
      usage: {
        month,
        year,
        tier: usageData.tier || tierKey,
        followers_extracted: followersUsed,
        extractions_count: usageData.extractions_count || 0,
        last_extraction: usageData.last_extraction || null,
        last_reset: usageData.last_reset || null,
        limit,
        remaining: remainingFollowers
      }
    })

  } catch (error: any) {
    console.error('[Stored Followers] Error:', error)
    return NextResponse.json({
      error: 'Failed to load stored followers',
      details: error.message
    }, { status: 500 })
  }
}
