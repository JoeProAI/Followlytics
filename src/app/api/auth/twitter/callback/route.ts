import { NextRequest, NextResponse } from 'next/server'
import { XAuth } from '@/lib/twitter-auth'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { auth } from '@/lib/firebase'
import { signInWithCustomToken } from 'firebase/auth'

export async function GET(request: NextRequest) {
  // Determine base URL for redirects (outside try block so it's available in catch)
  let baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
  
  // If no environment URL, construct from request
  if (!baseUrl) {
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('host')
    baseUrl = host ? `${protocol}://${host}` : 'http://localhost:3000'
  }
  
  // Ensure baseUrl doesn't have trailing slash and has proper protocol
  if (baseUrl && !baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }
  baseUrl = baseUrl?.replace(/\/$/, '') || 'http://localhost:3000'
  
  console.log('🔗 OAuth callback base URL:', baseUrl)
  console.log('🔍 Environment check:', {
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    VERCEL_URL: !!process.env.VERCEL_URL,
    host: request.headers.get('host'),
    protocol: request.headers.get('x-forwarded-proto')
  })
  
  try {
    
    const searchParams = request.nextUrl.searchParams
    const oauthToken = searchParams.get('oauth_token')
    const oauthVerifier = searchParams.get('oauth_verifier')
    const denied = searchParams.get('denied')

    // Handle user denial
    if (denied) {
      console.log('❌ User denied OAuth authorization')
      return NextResponse.redirect(`${baseUrl}/dashboard?error=x_auth_denied&message=Twitter authorization was denied`)
    }

    if (!oauthToken || !oauthVerifier) {
      console.log('❌ Missing OAuth parameters:', { oauthToken: !!oauthToken, oauthVerifier: !!oauthVerifier })
      return NextResponse.redirect(`${baseUrl}/dashboard?error=missing_oauth_params&message=Missing OAuth parameters from Twitter`)
    }

    // Get stored tokens from cookies
    const oauthTokenSecret = request.cookies.get('oauth_token_secret')?.value
    if (!oauthTokenSecret) {
      console.log('❌ Missing OAuth token secret cookie')
      return NextResponse.redirect(`${baseUrl}/dashboard?error=missing_token_secret&message=OAuth session expired, please try again`)
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
      console.log('❌ Firebase Admin not configured')
      return NextResponse.redirect(`${baseUrl}/dashboard?error=firebase_not_configured&message=Server configuration error`)
    }

    // Create or get Firebase user
    let firebaseUser
    try {
      firebaseUser = await adminAuth.getUserByEmail(`${xUser.screen_name}@x.followlytics.local`)
    } catch {
      // User doesn't exist, create them
      const createUserData: any = {
        email: `${xUser.screen_name}@x.followlytics.local`,
        displayName: xUser.name || xUser.screen_name,
        uid: `x_${xUser.id}`,
      }
      
      // Only add photoURL if it exists
      if (xUser.profile_image_url) {
        createUserData.photoURL = xUser.profile_image_url
      }
      
      firebaseUser = await adminAuth.createUser(createUserData)
    }

    // Store X tokens and user info in Firestore
    await adminDb.collection('x_tokens').doc(firebaseUser.uid).set({
      accessToken: accessTokens.oauth_token,
      accessTokenSecret: accessTokens.oauth_token_secret,
      xUserId: accessTokens.user_id,
      screenName: accessTokens.screen_name,
      createdAt: new Date(),
    })

    console.log('✅ OAuth tokens stored successfully for user:', firebaseUser.uid);

    // Update user document - filter out undefined values
    const userDocData: any = {
      email: firebaseUser.email,
      displayName: xUser.name || xUser.screen_name,
      xConnected: true,
      xUsername: accessTokens.screen_name,
      xUserId: accessTokens.user_id,
      xName: xUser.name || xUser.screen_name,
      createdAt: new Date(),
      provider: 'x',
    }

    // Only add photo fields if they exist
    if (xUser.profile_image_url) {
      userDocData.photoURL = xUser.profile_image_url
      userDocData.xProfileImage = xUser.profile_image_url
    }

    await adminDb.collection('users').doc(firebaseUser.uid).set(userDocData, { merge: true })

    // Create custom token for client-side auth
    console.log('🔑 Creating custom token for user:', firebaseUser.uid)
    const customToken = await adminAuth.createCustomToken(firebaseUser.uid)
    console.log('✅ Custom token created successfully')

    // Determine redirect URL
    const redirectUrl = `${baseUrl}/dashboard?x_auth=success&token=${customToken}`
    
    console.log('🔄 Redirecting to:', redirectUrl)

    // Clear OAuth cookies and redirect to dashboard with success
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.delete('oauth_token')
    response.cookies.delete('oauth_token_secret')

    return response
  } catch (error) {
    console.error('X OAuth callback error:', error)
    // Log the specific error details for debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.redirect(`${baseUrl}/dashboard?error=x_auth_failed&message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`)
  }
}
