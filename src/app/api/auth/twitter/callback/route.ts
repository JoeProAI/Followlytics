import { NextRequest, NextResponse } from 'next/server'
import * as admin from 'firebase-admin'
import crypto from 'crypto'

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_ADMIN_SDK_KEY?.replace(/\\n/g, '\n')
  
  if (!privateKey) {
    throw new Error('Firebase Admin SDK private key is not configured')
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "followlytics-cd4e1",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@followlytics-cd4e1.iam.gserviceaccount.com",
      privateKey: privateKey,
    }),
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const oauthToken = searchParams.get('oauth_token')
  const oauthVerifier = searchParams.get('oauth_verifier')
  const denied = searchParams.get('denied')

  if (denied) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?error=access_denied`)
  }

  if (!oauthToken || !oauthVerifier) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?error=missing_params`)
  }

  // Get token secret from cookie
  const oauthTokenSecret = request.cookies.get('twitter_oauth_token_secret')?.value
  if (!oauthTokenSecret) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?error=missing_token_secret`)
  }

  const consumerKey = process.env.TWITTER_API_KEY
  const consumerSecret = process.env.TWITTER_API_SECRET

  if (!consumerKey || !consumerSecret) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?error=missing_credentials`)
  }

  try {
    // OAuth 1.0a Access Token step
    const oauthTimestamp = Math.floor(Date.now() / 1000).toString()
    const oauthNonce = crypto.randomBytes(32).toString('hex')
    
    const oauthParams = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: oauthNonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: oauthTimestamp,
      oauth_token: oauthToken,
      oauth_verifier: oauthVerifier,
      oauth_version: '1.0'
    }
    
    // Create parameter string for signature
    const paramString = Object.keys(oauthParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key as keyof typeof oauthParams])}`)
      .join('&')
    
    // Create signature base string
    const signatureBaseString = `POST&${encodeURIComponent('https://api.twitter.com/oauth/access_token')}&${encodeURIComponent(paramString)}`
    
    // Create signing key
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(oauthTokenSecret)}`
    
    // Generate signature
    const signature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64')
    
    // Create authorization header
    const authHeader = `OAuth oauth_consumer_key="${consumerKey}", oauth_nonce="${oauthNonce}", oauth_signature="${encodeURIComponent(signature)}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${oauthTimestamp}", oauth_token="${oauthToken}", oauth_verifier="${oauthVerifier}", oauth_version="1.0"`

    // Exchange for access token
    const tokenResponse = await fetch('https://api.twitter.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Access token exchange failed:', errorText)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?error=token_exchange_failed`)
    }

    const tokenText = await tokenResponse.text()
    const tokenParams = new URLSearchParams(tokenText)
    const accessToken = tokenParams.get('oauth_token')
    const accessTokenSecret = tokenParams.get('oauth_token_secret')
    const userId = tokenParams.get('user_id')
    const screenName = tokenParams.get('screen_name')

    if (!accessToken || !accessTokenSecret || !userId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?error=invalid_token_response`)
    }

    // Get user info from Twitter API v1.1 (OAuth 1.0a compatible)
    const userTimestamp = Math.floor(Date.now() / 1000).toString()
    const userNonce = crypto.randomBytes(32).toString('hex')
    
    const userParams = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: userNonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: userTimestamp,
      oauth_token: accessToken,
      oauth_version: '1.0'
    }
    
    const userParamString = Object.keys(userParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(userParams[key as keyof typeof userParams])}`)
      .join('&')
    
    const userSignatureBase = `GET&${encodeURIComponent('https://api.twitter.com/1.1/account/verify_credentials.json')}&${encodeURIComponent(userParamString)}`
    const userSigningKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(accessTokenSecret)}`
    const userSignature = crypto.createHmac('sha1', userSigningKey).update(userSignatureBase).digest('base64')
    
    const userAuthHeader = `OAuth oauth_consumer_key="${consumerKey}", oauth_nonce="${userNonce}", oauth_signature="${encodeURIComponent(userSignature)}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${userTimestamp}", oauth_token="${accessToken}", oauth_version="1.0"`

    const userResponse = await fetch('https://api.twitter.com/1.1/account/verify_credentials.json', {
      headers: {
        'Authorization': userAuthHeader
      }
    })

    if (!userResponse.ok) {
      console.error('Failed to get user info')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?error=user_info_failed`)
    }

    const userData = await userResponse.json()

    // Create Firebase custom token
    const customToken = await admin.auth().createCustomToken(userId, {
      twitter_id: userId,
      username: userData.screen_name,
      name: userData.name,
      profile_image_url: userData.profile_image_url_https,
      access_token: accessToken,
      access_token_secret: accessTokenSecret
    })

    // Store user data in Firestore
    const db = admin.firestore()
    await db.collection('users').doc(userId).set({
      twitter_id: userId,
      username: userData.screen_name,
      name: userData.name,
      profile_image_url: userData.profile_image_url_https,
      access_token: accessToken,
      access_token_secret: accessTokenSecret,
      last_login: admin.firestore.FieldValue.serverTimestamp(),
      created_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })

    // Create response with redirect to home page with success flag
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?auth=success`)
    
    // Set Firebase custom token as cookie
    response.cookies.set('firebase_token', customToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    })

    // Clear OAuth cookies
    response.cookies.delete('twitter_oauth_token_secret')

    return response

  } catch (error) {
    console.error('OAuth 1.0a callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?error=callback_error`)
  }
}
