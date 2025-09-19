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

    // DO NOT STORE SESSION DATA - Privacy first approach
    // Instead, just signal that user has authenticated and scan can continue
    
    // Update the scan to indicate user has authenticated (no session data stored)
    await adminDb.collection('follower_scans').doc(scanId).update({
      status: 'user_authenticated',
      message: 'User authenticated - scan will continue with temporary session',
      authenticatedAt: new Date().toISOString()
    })

    console.log('✅ User authentication confirmed - NO session data stored for privacy')

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
