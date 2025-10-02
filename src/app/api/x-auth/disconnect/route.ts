import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth, adminDb as db } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Delete X tokens
    await db.collection('x_tokens').doc(userId).delete()

    // Also delete session cookies if any
    await db.collection('x_session_cookies').doc(`x_${userId}`).delete()

    return NextResponse.json({
      success: true,
      message: 'X account disconnected'
    })

  } catch (error: any) {
    console.error('X auth disconnect error:', error)
    return NextResponse.json({
      error: 'Failed to disconnect',
      details: error.message
    }, { status: 500 })
  }
}
