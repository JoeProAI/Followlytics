import { NextRequest, NextResponse } from 'next/server'
import { XAuth } from '@/lib/twitter-auth'
import { adminDb } from '@/lib/firebase-admin'
import { redirect } from 'next/navigation'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const oauthToken = searchParams.get('oauth_token')
    const oauthVerifier = searchParams.get('oauth_verifier')
    const denied = searchParams.get('denied')

    // Handle user denial
    if (denied) {
      return redirect('/dashboard?error=twitter_auth_denied')
    }

    if (!oauthToken || !oauthVerifier) {
      return redirect('/dashboard?error=missing_oauth_params')
    }

    // In a real app, retrieve oauth_token_secret from secure storage
    // For now, we'll need to pass it through the state or session
    const state = searchParams.get('state')
    if (!state) {
      return redirect('/dashboard?error=missing_state')
    }

    let oauthTokenSecret: string
    let userId: string
    
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      oauthTokenSecret = stateData.oauth_token_secret
      userId = stateData.user_id
    } catch {
      return redirect('/dashboard?error=invalid_state')
    }

    // Exchange request token for access token
    const accessTokens = await XAuth.getAccessToken(
      oauthToken,
      oauthTokenSecret,
      oauthVerifier
    )

    // Verify credentials
    const user = await XAuth.verifyCredentials(
      accessTokens.oauth_token,
      accessTokens.oauth_token_secret
    )

    // Store X tokens and user info in Firestore
    await adminDb.collection('x_tokens').doc(userId).set({
      accessToken: accessTokens.oauth_token,
      accessTokenSecret: accessTokens.oauth_token_secret,
      xUserId: accessTokens.user_id,
      screenName: accessTokens.screen_name,
      createdAt: new Date(),
    })

    // Update user document
    await adminDb.collection('users').doc(userId).update({
      xConnected: true,
      xUsername: accessTokens.screen_name,
      xUserId: accessTokens.user_id,
      xName: user.name,
      xProfileImage: user.profile_image_url,
    })

    return redirect('/dashboard?success=twitter_connected')
  } catch (error) {
    console.error('Twitter OAuth callback error:', error)
    return redirect('/dashboard?error=twitter_auth_failed')
  }
}
