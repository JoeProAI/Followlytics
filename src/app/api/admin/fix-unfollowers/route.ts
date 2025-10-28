import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

/**
 * Admin utility to fix false unfollower detections
 * Resets all followers marked as "unfollowed" back to "active"
 * 
 * POST /api/admin/fix-unfollowers
 * Headers: Authorization: Bearer <firebase-token>
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`[Fix Unfollowers] Running for user: ${userId}`)

    // Get all followers marked as "unfollowed"
    const unfollowedSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('followers')
      .where('status', '==', 'unfollowed')
      .get()

    if (unfollowedSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No false unfollowers found',
        fixed: 0
      })
    }

    // Reset all to "active"
    const batch = adminDb.batch()
    const nowIso = new Date().toISOString()
    const usernames: string[] = []

    unfollowedSnapshot.docs.forEach(doc => {
      usernames.push(doc.id)
      batch.update(doc.ref, {
        status: 'active',
        last_seen: nowIso,
        fixed_at: nowIso,
        fix_reason: 'False unfollower detection - partial extraction coverage'
      })
    })

    await batch.commit()

    console.log(`[Fix Unfollowers] ✅ Reset ${usernames.length} followers to active`)

    return NextResponse.json({
      success: true,
      message: `Successfully reset ${usernames.length} false unfollowers to active`,
      fixed: usernames.length,
      usernames: usernames
    })

  } catch (error: any) {
    console.error('[Fix Unfollowers] Error:', error)
    return NextResponse.json({
      error: 'Failed to fix unfollowers',
      details: error.message
    }, { status: 500 })
  }
}
