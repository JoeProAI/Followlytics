import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log('🔍 Monitoring scans for user:', userId)

    // Get all scans for this user from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const scansSnapshot = await adminDb
      .collection('follower_scans')
      .where('userId', '==', userId)
      .where('createdAt', '>=', twentyFourHoursAgo)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()

    const scans = scansSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt
      }
    })

    // Get active scans (not completed or failed)
    const activeScans = scans.filter((scan: any) => 
      !['completed', 'failed', 'authentication_required'].includes(scan.status)
    )

    // Get recent completed scans
    const completedScans = scans.filter((scan: any) => 
      ['completed', 'failed', 'authentication_required'].includes(scan.status)
    ).slice(0, 5)

    return NextResponse.json({
      success: true,
      userId,
      summary: {
        totalScans: scans.length,
        activeScans: activeScans.length,
        completedScans: completedScans.length,
        authenticationRequiredScans: scans.filter((s: any) => s.status === 'authentication_required').length
      },
      activeScans,
      recentCompletedScans: completedScans,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Scan monitoring error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to monitor scans'
    }, { status: 500 })
  }
}
