import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import getFirebaseAdminApp from '@/lib/firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

const adminDb = getFirestore(getFirebaseAdminApp())

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await getAuth(getFirebaseAdminApp()).verifyIdToken(token)
    const userId = decodedToken.uid

    // Get user's primary account
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const targetUsername = userData?.xUsername || userData?.twitterUsername

    if (!targetUsername) {
      return NextResponse.json({ 
        error: 'No X username set',
        message: 'Set your X username in Account Manager first'
      }, { status: 400 })
    }

    // Get recent scans
    const scansSnapshot = await adminDb
      .collection('follower_scans')
      .where('userId', '==', userId)
      .where('twitterUsername', '==', targetUsername)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()

    const scans = scansSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      completedAt: doc.data().completedAt?.toDate?.()?.toISOString() || doc.data().completedAt,
    }))

    // Get total followers in database
    const followersSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('followers')
      .where('target_username', '==', targetUsername.toLowerCase())
      .where('status', '==', 'following')
      .count()
      .get()

    const totalFollowing = followersSnapshot.data().count

    // Get unfollowers
    const unfollowersSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('followers')
      .where('target_username', '==', targetUsername.toLowerCase())
      .where('status', '==', 'unfollowed')
      .count()
      .get()

    const totalUnfollowed = unfollowersSnapshot.data().count

    // Get recent unfollower events
    const eventsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('unfollower_events')
      .where('target_username', '==', targetUsername.toLowerCase())
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get()

    const recentEvents = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Check last scan details
    const lastScan: any = scans[0]
    let scanDiagnostics = null

    if (lastScan) {
      const followersCount = lastScan.followersCount || lastScan.followers?.length || 0
      const extractionCoverage = totalFollowing > 0 ? (followersCount / totalFollowing) * 100 : 0
      
      scanDiagnostics = {
        scanId: lastScan.id,
        status: lastScan.status,
        followersExtracted: followersCount,
        totalFollowersInDb: totalFollowing,
        extractionCoverage: `${extractionCoverage.toFixed(1)}%`,
        coverageAbove80: extractionCoverage >= 80,
        unfollowDetectionEnabled: extractionCoverage >= 80,
        truncated: lastScan.truncated || false,
        createdAt: lastScan.createdAt,
        completedAt: lastScan.completedAt,
      }
    }

    return NextResponse.json({
      success: true,
      targetUsername,
      summary: {
        totalFollowing,
        totalUnfollowed,
        recentScans: scans.length,
        recentUnfollowEvents: recentEvents.length,
      },
      scanDiagnostics,
      recentScans: scans,
      recentUnfollowEvents: recentEvents,
      troubleshooting: {
        unfollowDetectionDisabled: scanDiagnostics?.unfollowDetectionEnabled === false,
        reason: scanDiagnostics?.unfollowDetectionEnabled === false
          ? `Extraction coverage is ${scanDiagnostics.extractionCoverage}, but needs to be ≥80% to detect unfollows. This prevents false positives.`
          : null,
        solution: scanDiagnostics?.unfollowDetectionEnabled === false
          ? 'Run a full scan with higher follower limit to get complete extraction and enable unfollow detection.'
          : null
      }
    })

  } catch (error: any) {
    console.error('Debug scan status error:', error)
    return NextResponse.json({ 
      error: 'Failed to get scan status',
      details: error.message 
    }, { status: 500 })
  }
}
