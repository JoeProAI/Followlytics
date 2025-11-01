import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const maxDuration = 60 // 1 minute timeout

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`[Verified Count] Getting verified count for user: ${userId}`)

    // Get all followers
    const followersSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('followers')
      .where('status', '==', 'active')
      .get()

    if (followersSnapshot.empty) {
      return NextResponse.json({
        total_followers: 0,
        verified_count: 0,
        verified_percent: 0,
        has_verified_data: false,
        message: 'No followers found. Extract followers first.'
      })
    }

    const followers = followersSnapshot.docs.map(doc => doc.data())
    
    // Count verified followers (only those with enriched data)
    const verifiedCount = followers.filter(f => f.verified === true).length
    const hasVerifiedData = followers.some(f => f.enriched_at !== undefined)
    const totalFollowers = followers.length

    return NextResponse.json({
      total_followers: totalFollowers,
      verified_count: verifiedCount,
      verified_percent: totalFollowers > 0 ? Math.round((verifiedCount / totalFollowers) * 100) : 0,
      has_verified_data: hasVerifiedData,
      message: hasVerifiedData 
        ? `Found ${verifiedCount} verified followers`
        : 'Run enrichment to get verified badges'
    })

  } catch (error: any) {
    console.error('[Verified Count] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to get verified count',
      details: error.message 
    }, { status: 500 })
  }
}
