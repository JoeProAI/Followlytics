import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth, adminDb as db } from '@/lib/firebase-admin'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Generate OAuth state
    const state = crypto.randomBytes(32).toString('hex')
    
    // Store state in Firestore for verification
    await db.collection('x_oauth_states').doc(state).set({
      userId,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    })

    // Build X OAuth 2.0 authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.X_CLIENT_ID!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/x-auth/callback`,
      scope: 'tweet.read users.read follows.read offline.access',
      state,
      code_challenge: 'challenge',
      code_challenge_method: 'plain'
    })

    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`

    return NextResponse.json({
      authUrl,
      state
    })

  } catch (error: any) {
    console.error('X auth authorize error:', error)
    return NextResponse.json({
      error: 'Failed to create authorization URL',
      details: error.message
    }, { status: 500 })
  }
}
