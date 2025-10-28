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

    console.log(`[Stored Followers] Loading for user: ${userId}`)

    // Get user metadata
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()

    // Get all stored followers
    const followersSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('followers')
      .where('status', '==', 'active') // Only active followers
      .limit(1000)
      .get()

    if (followersSnapshot.empty) {
      return NextResponse.json({
        followers: [],
        total: 0,
        targetUsername: null
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
    const verifiedCount = followers.filter(f => f.verified).length
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

    console.log(`[Stored Followers] ✅ Loaded ${followers.length} followers`)

    return NextResponse.json({
      success: true,
      followers,
      total: followers.length,
      targetUsername: userData?.target_username || null,
      stats
    })

  } catch (error: any) {
    console.error('[Stored Followers] Error:', error)
    return NextResponse.json({
      error: 'Failed to load stored followers',
      details: error.message
    }, { status: 500 })
  }
}
