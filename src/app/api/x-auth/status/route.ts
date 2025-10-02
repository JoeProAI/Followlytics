import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth, adminDb as db } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check for OAuth tokens
    const tokenDoc = await db.collection('x_tokens').doc(userId).get()
    
    if (!tokenDoc.exists) {
      return NextResponse.json({
        connected: false
      })
    }

    const tokens = tokenDoc.data()
    
    return NextResponse.json({
      connected: true,
      username: tokens?.screen_name || tokens?.username || 'Connected',
      lastSync: tokens?.last_sync || tokens?.created_at,
      method: tokens?.method || 'oauth_1.0a'
    })

  } catch (error: any) {
    console.error('X auth status error:', error)
    return NextResponse.json({
      error: 'Failed to check status',
      details: error.message
    }, { status: 500 })
  }
}
