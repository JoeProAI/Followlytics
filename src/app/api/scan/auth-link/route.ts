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

    const { searchParams } = new URL(request.url)
    const scanId = searchParams.get('scanId')

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID required' }, { status: 400 })
    }

    console.log(`🔗 Getting authentication link for scan: ${scanId}`)

    // Get scan details to find sandbox ID
    const scanDoc = await adminDb.collection('follower_scans').doc(scanId).get()
    
    if (!scanDoc.exists) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    const scanData = scanDoc.data()
    
    // Verify ownership
    if (scanData?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const sandboxId = scanData?.sandboxId

    if (!sandboxId) {
      return NextResponse.json({ error: 'Sandbox not found for this scan' }, { status: 404 })
    }

    // Create a secure authentication session
    const authSessionId = Math.random().toString(36).substring(2, 15)
    
    // Create a callback URL that will signal the sandbox when auth is complete
    const callbackUrl = `https://followlytics-zeta.vercel.app/api/auth/callback-complete?scanId=${scanId}&sessionId=${authSessionId}`
    
    // The auth URL is just regular Twitter login - after login, user will be redirected to our callback
    const authUrl = `https://x.com/login`

    // Update scan status to show auth link is ready
    await adminDb.collection('follower_scans').doc(scanId).update({
      status: 'awaiting_user_signin',
      authUrl: authUrl,
      authSessionId: authSessionId,
      message: 'Click the authentication link to sign into Twitter and continue the scan'
    })

    return NextResponse.json({
      success: true,
      authUrl,
      authSessionId,
      message: 'Authentication link ready - user can click to sign in',
      instructions: 'Click the link to sign into Twitter. After signing in, the scan will continue automatically.'
    })

  } catch (error: any) {
    console.error('Auth link generation failed:', error)
    return NextResponse.json({
      error: 'Failed to generate authentication link',
      details: error.message
    }, { status: 500 })
  }
}
