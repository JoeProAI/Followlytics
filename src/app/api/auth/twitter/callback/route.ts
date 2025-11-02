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

    // IMPORTANT: Link X tokens to the CURRENTLY LOGGED IN USER
    // This prevents creating a separate X-only account
    
    // Get the current user ID from cookie (set when initiating OAuth from logged-in state)
    const linkingUserId = request.cookies.get('linking_user_id')?.value
    let currentUserId: string | null = linkingUserId || null
    
    if (currentUserId) {
      console.log('✅ Found linking_user_id cookie:', currentUserId)
    } else {
      console.log('⚠️ No linking_user_id cookie - user was not logged in when initiating OAuth')
    }

    let firebaseUser
    
    if (currentUserId) {
      // User is already logged in - link X tokens to their existing account
      firebaseUser = await adminAuth.getUser(currentUserId)
      console.log(`✅ Linking X tokens to existing user: ${firebaseUser.email}`)
    } else {
      // No existing session - check if X user already exists
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
    }

    // Store X tokens and user info in Firestore (linked to their real account)
    await adminDb.collection('x_tokens').doc(firebaseUser.uid).set({
      accessToken: accessTokens.oauth_token,
      accessTokenSecret: accessTokens.oauth_token_secret,
      xUserId: accessTokens.user_id,
      screenName: accessTokens.screen_name,
      userId: firebaseUser.uid,
      createdAt: new Date(),
    })

    console.log('✅ OAuth tokens stored successfully for user:', firebaseUser.uid);
    
    // Test the OAuth tokens for API access
    try {
      console.log('🔍 Testing OAuth tokens for API access...');
      const { TwitterApiClient } = await import('@/lib/twitter-api');
      const twitterClient = new TwitterApiClient({
        accessToken: accessTokens.oauth_token,
        accessTokenSecret: accessTokens.oauth_token_secret
      });
      
      const testResult = await twitterClient.testApiAccess();
      if (testResult.success) {
        console.log('✅ OAuth tokens working for Twitter API access');
        console.log('📊 User info:', {
          screen_name: testResult.userInfo?.screen_name,
          followers_count: testResult.userInfo?.followers_count
        });
      } else {
        console.log('⚠️ OAuth tokens have issues with API access:', testResult.error);
      }
    } catch (error) {
      console.log('⚠️ Error testing OAuth tokens for API access:', error);
    }

    // Update user document - filter out undefined values
    // IMPORTANT: Use merge: true to preserve existing data
    const userDocData: any = {
      xConnected: true,
      xUsername: accessTokens.screen_name,
      xUserId: accessTokens.user_id,
      xName: xUser.name || xUser.screen_name,
      lastXAuth: new Date(),
    }

    // Only update email/displayName if this is a new X-only account
    if (firebaseUser.email?.includes('@x.followlytics.local')) {
      userDocData.email = firebaseUser.email
      userDocData.displayName = xUser.name || xUser.screen_name
      userDocData.provider = 'x'
      userDocData.createdAt = new Date()
    }

    // Only add photo fields if they exist
    if (xUser.profile_image_url) {
      userDocData.xProfileImage = xUser.profile_image_url
    }

    await adminDb.collection('users').doc(firebaseUser.uid).set(userDocData, { merge: true })
    console.log(`✅ Updated user document for: ${firebaseUser.email} with X connection`)

    // Create custom token for client-side auth ONLY if user wasn't already logged in
    let redirectUrl
    
    if (currentUserId) {
      // User was already logged in - don't create token, just redirect with success
      console.log('✅ User already logged in, skipping custom token creation')
      redirectUrl = `${baseUrl}/dashboard?x_auth=success&twitter_success=true&username=${accessTokens.screen_name}`
    } else {
      // User not logged in - create custom token for sign-in
      console.log('🔑 Creating custom token for user:', firebaseUser.uid)
      let customToken
      try {
        customToken = await adminAuth.createCustomToken(firebaseUser.uid)
        console.log('✅ Custom token created successfully')
        redirectUrl = `${baseUrl}/dashboard?x_auth=success&twitter_success=true&token=${customToken}&username=${accessTokens.screen_name}`
      } catch (tokenError) {
        console.error('❌ Failed to create custom token:', tokenError)
        // Fallback: redirect without token, let user sign in normally
        redirectUrl = `${baseUrl}/dashboard?x_auth=success&username=${accessTokens.screen_name}`
      }
    }
    
    console.log('🔄 Redirecting to:', redirectUrl)

    // Clear OAuth cookies and redirect to dashboard with success
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.delete('oauth_token')
    response.cookies.delete('oauth_token_secret')
    response.cookies.delete('linking_user_id') // Clear the linking cookie

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
