import { NextRequest, NextResponse } from 'next/server'
import { XAuth } from '@/lib/twitter-auth'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { auth } from '@/lib/firebase'
import { signInWithCustomToken } from 'firebase/auth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const oauthToken = searchParams.get('oauth_token')
    const oauthVerifier = searchParams.get('oauth_verifier')
    const denied = searchParams.get('denied')

    // Handle user denial
    if (denied) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=x_auth_denied`)
    }

    if (!oauthToken || !oauthVerifier) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=missing_oauth_params`)
    }

    // Get stored tokens from cookies
    const oauthTokenSecret = request.cookies.get('oauth_token_secret')?.value
    if (!oauthTokenSecret) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=missing_token_secret`)
    }

    // Exchange request token for access token
    const accessTokens = await XAuth.getAccessToken(
      oauthToken,
      oauthTokenSecret,
      oauthVerifier
    )

    // Verify credentials
    const xUser = await XAuth.verifyCredentials(
      accessTokens.oauth_token,
      accessTokens.oauth_token_secret
    )

    if (!adminAuth || !adminDb) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=firebase_not_configured`)
    }

    // Create or get Firebase user
    let firebaseUser
    try {
      firebaseUser = await adminAuth.getUserByEmail(`${xUser.screen_name}@x.followlytics.local`)
    } catch {
      // User doesn't exist, create them
      firebaseUser = await adminAuth.createUser({
        email: `${xUser.screen_name}@x.followlytics.local`,
        displayName: xUser.name,
        photoURL: xUser.profile_image_url,
        uid: `x_${xUser.id}`,
      })
    }

    // Store X tokens and user info in Firestore
    await adminDb.collection('x_tokens').doc(firebaseUser.uid).set({
      accessToken: accessTokens.oauth_token,
      accessTokenSecret: accessTokens.oauth_token_secret,
      xUserId: accessTokens.user_id,
      screenName: accessTokens.screen_name,
      createdAt: new Date(),
    })

    // Update user document
    await adminDb.collection('users').doc(firebaseUser.uid).set({
      email: firebaseUser.email,
      displayName: xUser.name,
      photoURL: xUser.profile_image_url,
      xConnected: true,
      xUsername: accessTokens.screen_name,
      xUserId: accessTokens.user_id,
      xName: xUser.name,
      xProfileImage: xUser.profile_image_url,
      createdAt: new Date(),
      provider: 'x',
    }, { merge: true })

    // Create custom token for client-side auth
    const customToken = await adminAuth.createCustomToken(firebaseUser.uid)

    // Clear OAuth cookies and redirect to dashboard with success
    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?x_auth=success&token=${customToken}`)
    response.cookies.delete('oauth_token')
    response.cookies.delete('oauth_token_secret')

    return response
  } catch (error) {
    console.error('X OAuth callback error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=x_auth_failed`)
  }
}
