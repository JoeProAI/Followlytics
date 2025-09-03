import { NextRequest, NextResponse } from 'next/server'
import { auth, db } from '@/lib/firebase'
import { signInWithCustomToken } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import admin from 'firebase-admin'

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
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  
  // Verify state parameter
  const storedState = request.cookies.get('twitter_oauth_state')?.value
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect('/auth/login?error=invalid_state')
  }

  if (!code) {
    return NextResponse.redirect('/auth/login?error=no_code')
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: process.env.TWITTER_CLIENT_ID!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/twitter/callback`,
        code_verifier: 'challenge'
      })
    })

    const tokenData = await tokenResponse.json()
    
    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData)
      return NextResponse.redirect('/auth/login?error=token_exchange_failed')
    }

    // Get user info from Twitter
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    const userData = await userResponse.json()
    
    if (!userResponse.ok) {
      console.error('User info fetch failed:', userData)
      return NextResponse.redirect('/auth/login?error=user_fetch_failed')
    }

    const twitterUser = userData.data

    // Create Firebase custom token
    const customToken = await admin.auth().createCustomToken(twitterUser.id, {
      xHandle: twitterUser.username,
      xUserId: twitterUser.id,
      xName: twitterUser.name
    })

    // Store user data in Firestore
    await admin.firestore().collection('users').doc(twitterUser.id).set({
      xHandle: twitterUser.username,
      xUserId: twitterUser.id,
      xName: twitterUser.name,
      xAccessToken: tokenData.access_token,
      xRefreshToken: tokenData.refresh_token,
      subscription: 'free',
      createdAt: admin.firestore.Timestamp.now(),
      lastSync: null,
      settings: {
        notifications: {
          email: false,
          webhook: false
        },
        syncFrequency: '15min'
      }
    }, { merge: true })

    // Redirect to dashboard with custom token
    const response = NextResponse.redirect('/dashboard')
    response.cookies.set('firebase_token', customToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    })
    
    // Clear the state cookie
    response.cookies.delete('twitter_oauth_state')
    
    return response

  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect('/auth/login?error=callback_failed')
  }
}
