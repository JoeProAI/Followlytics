import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

/**
 * Get all verified followers with detailed info
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get all followers
    const followersSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('followers')
      .get()

    const allFollowers = followersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[]

    // Filter for verified followers
    const verified = allFollowers.filter((f: any) => f.verified === true)
    
    // Count all followers with verified field
    const withVerifiedField = allFollowers.filter((f: any) => f.verified !== undefined).length
    const checkedTrue = allFollowers.filter((f: any) => f.verified === true).length
    const checkedFalse = allFollowers.filter((f: any) => f.verified === false).length
    const unchecked = allFollowers.filter((f: any) => f.verified === undefined).length

    console.log(`[Verified Followers] Total: ${allFollowers.length}, Verified: ${verified.length}`)
    console.log(`[Verified Followers] Breakdown: ${checkedTrue} true, ${checkedFalse} false, ${unchecked} unchecked`)

    return NextResponse.json({
      success: true,
      verified: verified.sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0)),
      stats: {
        total: allFollowers.length,
        verified: verified.length,
        withVerifiedField,
        checkedTrue,
        checkedFalse,
        unchecked
      }
    })

  } catch (error) {
    console.error('[Verified Followers] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to load verified followers', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
