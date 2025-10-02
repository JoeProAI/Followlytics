import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth, adminDb as db } from '@/lib/firebase-admin'
import { TwitterApi } from 'twitter-api-v2'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Use OAuth 1.0a tokens from environment
    const accessToken = process.env.X_ACCESS_TOKEN
    const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET
    const apiKey = process.env.X_API_KEY
    const apiSecret = process.env.X_API_SECRET

    if (!accessToken || !accessTokenSecret || !apiKey || !apiSecret) {
      return NextResponse.json({ 
        error: 'X credentials not configured in environment' 
      }, { status: 500 })
    }

    // Verify tokens work by getting user info
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessTokenSecret,
    })

    const me = await client.v2.me()

    // Store tokens in Firestore
    await db.collection('x_tokens').doc(userId).set({
      access_token: accessToken,
      access_token_secret: accessTokenSecret,
      screen_name: me.data.username,
      user_id: me.data.id,
      created_at: new Date().toISOString(),
      last_sync: new Date().toISOString(),
      method: 'oauth_1.0a'
    })

    return NextResponse.json({
      success: true,
      username: me.data.username
    })

  } catch (error: any) {
    console.error('Store tokens error:', error)
    return NextResponse.json({
      error: 'Failed to store tokens',
      details: error.message
    }, { status: 500 })
  }
}
