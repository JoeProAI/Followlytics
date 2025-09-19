import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { scanId, sessionData } = await request.json()

    if (!scanId || !sessionData) {
      return NextResponse.json({ error: 'Scan ID and session data required' }, { status: 400 })
    }

    console.log(`🔐 Capturing Twitter session for scan: ${scanId}`)

    // Store the session data securely
    await adminDb.collection('twitter_sessions').doc(scanId).set({
      userId,
      sessionData,
      createdAt: new Date(),
      status: 'captured'
    })

    // Update the scan to indicate session is ready
    await adminDb.collection('follower_scans').doc(scanId).update({
      status: 'session_captured',
      message: 'Twitter session captured - continuing extraction...'
    })

    return NextResponse.json({
      success: true,
      message: 'Session captured successfully - scan will continue automatically'
    })

  } catch (error: any) {
    console.error('Session capture failed:', error)
    return NextResponse.json({
      error: 'Failed to capture session',
      details: error.message
    }, { status: 500 })
  }
}
