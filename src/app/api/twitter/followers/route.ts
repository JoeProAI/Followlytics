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

function createOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  // Sort parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')

  // Create signature base string
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`
  
  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`
  
  // Generate signature
  return crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64')
}

export async function GET(request: NextRequest) {
  try {
    // Get user from Firebase token
    const token = request.cookies.get('firebase_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decodedToken = await admin.auth().verifyIdToken(token)
    const userId = decodedToken.uid

    // Get user data from Firestore
    const db = admin.firestore()
    const userDoc = await db.collection('users').doc(userId).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()
    const accessToken = userData?.access_token
    const accessTokenSecret = userData?.access_token_secret
    const twitterUserId = userData?.twitter_id

    if (!accessToken || !accessTokenSecret || !twitterUserId) {
      return NextResponse.json({ error: 'Twitter credentials not found' }, { status: 400 })
    }

    const consumerKey = process.env.TWITTER_API_KEY
    const consumerSecret = process.env.TWITTER_API_SECRET

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json({ error: 'Twitter API credentials not configured' }, { status: 500 })
    }

    // Get followers using Twitter API v1.1
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = crypto.randomBytes(32).toString('hex')
    
    const params = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: accessToken,
      oauth_version: '1.0',
      user_id: twitterUserId,
      count: '200',
      skip_status: 'true',
      include_user_entities: 'false'
    }

    const signature = createOAuthSignature(
      'GET',
      'https://api.twitter.com/1.1/followers/list.json',
      params,
      consumerSecret,
      accessTokenSecret
    )

    const authHeader = `OAuth oauth_consumer_key="${consumerKey}", oauth_nonce="${nonce}", oauth_signature="${encodeURIComponent(signature)}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${timestamp}", oauth_token="${accessToken}", oauth_version="1.0"`

    // Build query string for non-OAuth parameters
    const queryParams = new URLSearchParams({
      user_id: twitterUserId,
      count: '200',
      skip_status: 'true',
      include_user_entities: 'false'
    })

    const response = await fetch(`https://api.twitter.com/1.1/followers/list.json?${queryParams}`, {
      headers: {
        'Authorization': authHeader
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Twitter API error:', errorText)
      return NextResponse.json({ error: 'Failed to fetch followers' }, { status: response.status })
    }

    const followersData = await response.json()
    const followers = followersData.users || []

    // Store current followers snapshot
    const timestamp_now = admin.firestore.FieldValue.serverTimestamp()
    const followerIds = followers.map((f: any) => f.id_str)
    
    await db.collection('follower_snapshots').add({
      user_id: userId,
      twitter_user_id: twitterUserId,
      follower_ids: followerIds,
      follower_count: followers.length,
      timestamp: timestamp_now,
      followers_data: followers.map((f: any) => ({
        id: f.id_str,
        username: f.screen_name,
        name: f.name,
        profile_image_url: f.profile_image_url_https,
        followers_count: f.followers_count,
        verified: f.verified
      }))
    })

    return NextResponse.json({
      followers: followers.map((f: any) => ({
        id: f.id_str,
        username: f.screen_name,
        name: f.name,
        profile_image_url: f.profile_image_url_https,
        followers_count: f.followers_count,
        verified: f.verified
      })),
      total_count: followers.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Followers API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
