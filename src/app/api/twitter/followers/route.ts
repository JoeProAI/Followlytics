import { NextRequest, NextResponse } from 'next/server'
import * as admin from 'firebase-admin'
import crypto from 'crypto'

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    console.log('🔥 Initializing Firebase Admin SDK...')
    const privateKey = process.env.FIREBASE_ADMIN_SDK_KEY?.replace(/\\n/g, '\n')
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const projectId = 'followlytics-cd4e1'
    
    console.log('Environment check:', {
      hasPrivateKey: !!privateKey,
      hasClientEmail: !!clientEmail,
      projectId: projectId
    })
    
    if (!privateKey || !clientEmail) {
      throw new Error('Firebase Admin SDK credentials not configured')
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey,
      }),
    })
    
    console.log('✅ Firebase Admin SDK initialized successfully')
  } catch (initError) {
    console.error('❌ Firebase Admin SDK initialization failed:', initError)
    throw initError
  }
} else {
  console.log('♻️ Firebase Admin SDK already initialized')
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

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  console.log('🚀 Twitter followers API called')
  
  try {
    // Verify Firebase token from cookie
    const token = request.cookies.get('firebase_token')?.value
    console.log('Firebase token present:', !!token)
    
    if (!token) {
      console.log('No Firebase token found in cookies')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // The token is a custom token, decode it to get user ID
    let userId
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format')
      }
      
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      userId = payload.uid
      
      if (!userId) {
        throw new Error('No user ID in token')
      }
      
      console.log('User ID extracted from custom token:', userId)
    } catch (error) {
      console.error('Token processing failed:', error)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user's Twitter credentials from Firestore
    console.log('📊 Attempting to get user data from Firestore for user:', userId)
    
    const db = admin.firestore()
    let userData
    try {
      console.log('🔍 Querying Firestore for user document...')
      const userDoc = await db.collection('users').doc(userId).get()
      
      console.log('📄 User document exists:', userDoc.exists)
      
      if (!userDoc.exists) {
        console.error('❌ User document not found in Firestore:', userId)
        
        // For now, return a helpful error message instead of 404
        return NextResponse.json({ 
          error: 'User not found in database. Please log in again to create your profile.',
          code: 'USER_NOT_FOUND',
          userId: userId
        }, { status: 404 })
      }

      userData = userDoc.data()!
      console.log('✅ User data retrieved successfully:', {
        hasAccessToken: !!userData.access_token,
        hasAccessTokenSecret: !!userData.access_token_secret,
        username: userData.username,
        twitter_id: userData.twitter_id
      })
      
      // Check if we have the required Twitter credentials
      if (!userData.access_token || !userData.access_token_secret) {
        console.error('❌ Missing Twitter credentials for user:', userId)
        return NextResponse.json({ 
          error: 'Twitter credentials not found. Please log in again.',
          code: 'MISSING_CREDENTIALS'
        }, { status: 401 })
      }
      
    } catch (firestoreError) {
      console.error('💥 Firestore error:', firestoreError)
      console.error('Error details:', {
        name: firestoreError instanceof Error ? firestoreError.name : 'Unknown',
        message: firestoreError instanceof Error ? firestoreError.message : 'Unknown Firestore error',
        stack: firestoreError instanceof Error ? firestoreError.stack : undefined
      })
      
      return NextResponse.json({ 
        error: 'Database connection error', 
        details: firestoreError instanceof Error ? firestoreError.message : 'Unknown Firestore error',
        code: 'FIRESTORE_ERROR'
      }, { status: 500 })
    }
    
    // Check if there's already a running scan job
    const existingJobs = await db.collection('scan_jobs')
      .where('userId', '==', userId)
      .where('status', '==', 'running')
      .limit(1)
      .get()

    if (!existingJobs.empty) {
      const job = existingJobs.docs[0].data()
      return NextResponse.json({
        success: true,
        job_id: existingJobs.docs[0].id,
        message: 'Scan already in progress',
        estimated_total: job.totalFollowers || 1000
      })
    }

    // Check follower count to determine processing method
    const followerCount = userData.followers_count || 0
    console.log('User follower count:', followerCount)
    
    if (followerCount > 1000) {
      // Create background job for large accounts
      const jobId = `${userId}_${Date.now()}`
      const job = {
        userId: userId,
        twitterUserId: userData.twitter_id,
        totalProcessed: 0,
        totalFollowers: followerCount,
        status: 'running',
        startedAt: Date.now(),
        lastUpdated: Date.now(),
        batchSize: 200
      }
      
      await db.collection('scan_jobs').doc(jobId).set(job)
      
      // Start the background processing
      fetch(`${request.nextUrl.origin}/api/jobs/follower-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: userData.twitter_id,
          jobId: jobId,
          firebaseUserId: userId
        })
      }).catch(error => {
        console.error('Error starting background job:', error)
      })
      
      return NextResponse.json({
        success: true,
        job_id: jobId,
        message: `Starting background scan for ${followerCount.toLocaleString()} followers`,
        estimated_total: followerCount
      })
    }

    // Use Twitter API v2 with OAuth 1.0a (Access Token method)
    const consumerKey = process.env.TWITTER_API_KEY
    const consumerSecret = process.env.TWITTER_API_SECRET
    const accessToken = userData.access_token
    const accessTokenSecret = userData.access_token_secret

    if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
      return NextResponse.json({ error: 'Twitter OAuth 1.0a credentials not configured' }, { status: 500 })
    }

    // Generate OAuth 1.0a signature for Twitter API v2
    const crypto = require('crypto')
    const oauth = {
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
      token: accessToken,
      token_secret: accessTokenSecret,
      signature_method: 'HMAC-SHA1',
      version: '1.0'
    }

    const baseUrl = `https://api.twitter.com/2/users/${userData.twitter_id}/followers`
    const params = new URLSearchParams({
      'max_results': '100',
      'user.fields': 'id,name,username,profile_image_url,public_metrics,verified'
    })
    const fullUrl = `${baseUrl}?${params.toString()}`

    // Generate OAuth signature
    const timestamp = Math.floor(Date.now() / 1000)
    const nonce = crypto.randomBytes(16).toString('hex')
    
    const oauthParams: Record<string, string | number> = {
      oauth_consumer_key: oauth.consumer_key,
      oauth_token: oauth.token,
      oauth_signature_method: oauth.signature_method,
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: oauth.version
    }

    // Create signature base string
    const paramString = Object.keys(oauthParams)
      .sort()
      .map(key => `${key}=${encodeURIComponent(String(oauthParams[key]))}`)
      .join('&')
    
    const signatureBaseString = `GET&${encodeURIComponent(baseUrl)}&${encodeURIComponent(paramString + '&' + params.toString())}`
    const signingKey = `${encodeURIComponent(oauth.consumer_secret)}&${encodeURIComponent(oauth.token_secret)}`
    const signature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64')

    // Create Authorization header
    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .sort()
      .map(key => `${key}="${encodeURIComponent(String(oauthParams[key]))}"`)
      .concat(`oauth_signature="${encodeURIComponent(signature)}"`)
      .join(', ')

    const response = await fetch(fullUrl, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Twitter API error:', response.status, errorText)
      return NextResponse.json({ 
        error: 'Failed to fetch followers',
        details: errorText 
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('Twitter API response received, followers count:', data.data?.length || 0)

    // Parse Twitter API v2 response
    const followers = data.data?.map((user: any) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      profile_image_url: user.profile_image_url,
      followers_count: user.public_metrics?.followers_count || 0,
      following_count: user.public_metrics?.following_count || 0,
      tweet_count: user.public_metrics?.tweet_count || 0,
      verified: user.verified || false
    })) || []

    // Store followers in Firestore
    const batch = db.batch()
    const followersCollection = db.collection('users').doc(userId).collection('followers')

    // Clear existing followers
    const existingFollowers = await followersCollection.limit(500).get()
    existingFollowers.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Add new followers (Twitter API v2 format)
    followers.forEach((follower: any) => {
      const followerRef = followersCollection.doc(follower.id)
      batch.set(followerRef, {
        id: follower.id,
        username: follower.username,
        name: follower.name,
        profile_image_url: follower.profile_image_url,
        followers_count: follower.public_metrics?.followers_count || 0,
        verified: follower.verified || false,
        scanned_at: admin.firestore.FieldValue.serverTimestamp()
      })
    })

    await batch.commit()

    // Update user's last scan timestamp
    await db.collection('users').doc(userId).update({
      last_follower_scan: admin.firestore.FieldValue.serverTimestamp(),
      follower_count: followers.length
    })

    return NextResponse.json({
      success: true,
      followers: followers,
      count: followers.length,
      scanned_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Followers API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
