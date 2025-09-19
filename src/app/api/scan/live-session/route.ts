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

    const { scanId, action } = await request.json()

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID required' }, { status: 400 })
    }

    console.log(`🔄 Live session action: ${action} for scan: ${scanId}`)

    if (action === 'start_extraction') {
      // User has authenticated in their browser - signal sandbox to begin extraction
      // NO session data is stored - just a signal to proceed
      
      await adminDb.collection('follower_scans').doc(scanId).update({
        status: 'extracting_with_live_session',
        message: 'User authenticated - extracting followers in real-time',
        liveSessionActive: true,
        lastActivity: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        message: 'Live extraction started - no session data stored',
        instructions: 'Keep this tab open while extraction is running'
      })
    }

    if (action === 'session_ended') {
      // User closed their browser - clean up any temporary references
      await adminDb.collection('follower_scans').doc(scanId).update({
        liveSessionActive: false,
        message: 'Live session ended - extraction may be incomplete'
      })

      return NextResponse.json({
        success: true,
        message: 'Live session ended - no data retained'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Live session management failed:', error)
    return NextResponse.json({
      error: 'Failed to manage live session',
      details: error.message
    }, { status: 500 })
  }
}
