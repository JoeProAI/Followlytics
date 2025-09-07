import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { trackAPIUsage } from '@/lib/usage-tracker'
import OAuth from 'oauth-1.0a'
import crypto from 'crypto'

// Initialize Firebase Admin SDK
let adminSDK: any = null

async function getFirebaseAdmin() {
  try {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app')
    const { getFirestore } = await import('firebase-admin/firestore')
    
    if (getApps().length === 0) {
      // Try using service account key first (if available)
      const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_KEY
      
      if (serviceAccountKey) {
        try {
          console.log('Attempting to parse service account JSON, length:', serviceAccountKey.length)
          const serviceAccount = JSON.parse(serviceAccountKey)
          console.log('Service account parsed successfully, project_id:', serviceAccount.project_id)
          initializeApp({
            credential: cert(serviceAccount)
          })
        } catch (jsonError) {
          console.error('Failed to parse service account JSON:', jsonError)
          console.log('Service account key preview:', serviceAccountKey.substring(0, 100) + '...')
          // Fall through to individual environment variables instead of throwing
        }
      }
      
      // Use individual environment variables (either as fallback or primary)
      if (getApps().length === 0) {
        // Fallback to individual environment variables
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
        let privateKey = process.env.FIREBASE_PRIVATE_KEY
        
        if (privateKey) {
          // Enhanced private key processing
          privateKey = privateKey
            .replace(/^["']|["']$/g, '') // Remove outer quotes
            .replace(/\\n/g, '\n') // Convert escaped newlines
            .trim()
          
          // More flexible PEM validation - check for key boundaries after processing
          const hasBeginMarker = privateKey.includes('-----BEGIN PRIVATE KEY-----') || privateKey.includes('-----BEGIN RSA PRIVATE KEY-----')
          const hasEndMarker = privateKey.includes('-----END PRIVATE KEY-----') || privateKey.includes('-----END RSA PRIVATE KEY-----')
          
          if (!hasBeginMarker || !hasEndMarker) {
            console.log('Private key validation failed. Key preview:', privateKey.substring(0, 50) + '...')
            console.log('Has begin marker:', hasBeginMarker, 'Has end marker:', hasEndMarker)
            throw new Error('Invalid private key format - must be PEM format')
          }
        }
        
        if (!projectId || !clientEmail || !privateKey) {
          throw new Error(`Missing Firebase config: projectId=${projectId || 'MISSING'}, clientEmail=${clientEmail || 'MISSING'}, privateKey=${privateKey ? 'SET' : 'MISSING'}`)
        }
        
        initializeApp({
          credential: cert({
            projectId: projectId,
            clientEmail: clientEmail,
            privateKey: privateKey
          })
        })
      }
    }
    
    return { firestore: getFirestore }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  console.log('=== TWITTER API v1.1 FOLLOWERS ENDPOINT CALLED ===')
  try {
    // Get user from Firebase token
    const cookieStore = cookies()
    const token = cookieStore.get('firebase_token')?.value
    console.log('Firebase token exists:', !!token)
    
    if (!token) {
      console.log('No Firebase token found')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let userId
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length !== 3) throw new Error('Invalid token format')
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      userId = payload.uid
      console.log('Extracted user ID:', userId)
      if (!userId) throw new Error('No user ID in token')
    } catch (error) {
      console.log('Token parsing error:', error)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Track API usage
    try {
      await trackAPIUsage(userId, 'followers-api', 1)
      console.log('Usage tracking completed successfully')
    } catch (error) {
      console.error('Usage tracking error:', error)
      return NextResponse.json(
        { error: (error as Error).message, code: 'USAGE_LIMIT_EXCEEDED' },
        { status: 429 }
      )
    }

    // Get user data from Firestore
    console.log('Initializing Firebase for user:', userId)
    const firebase = await getFirebaseAdmin()
    console.log('Firebase initialized, fetching user document')
    
    const userDoc = await firebase.firestore().collection('users').doc(userId).get()
    console.log('User document exists:', userDoc.exists)
    
    if (!userDoc.exists) {
      console.log('User document not found for ID:', userId)
      return NextResponse.json({ error: 'User not found in database. Please log in again.', code: 'USER_NOT_FOUND' }, { status: 404 })
    }

    const userData = userDoc.data()
    
    // Get Twitter credentials
    const consumerKey = process.env.TWITTER_API_KEY
    const consumerSecret = process.env.TWITTER_API_SECRET
    const accessToken = userData?.access_token
    const accessTokenSecret = userData?.access_token_secret
    const twitterUserId = userData?.twitter_id
    
    if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret || !twitterUserId) {
      return NextResponse.json({ 
        error: 'Missing Twitter API credentials',
        details: {
          hasConsumerKey: !!consumerKey,
          hasConsumerSecret: !!consumerSecret,
          hasAccessToken: !!accessToken,
          hasAccessTokenSecret: !!accessTokenSecret,
          hasTwitterUserId: !!twitterUserId
        }
      }, { status: 401 })
    }

    console.log('Using Twitter API v1.1 followers/list endpoint')

    // Setup OAuth 1.0a
    const oauth = new OAuth({
      consumer: { key: consumerKey, secret: consumerSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64')
      }
    })

    const token_data = {
      key: accessToken,
      secret: accessTokenSecret
    }

    // Twitter API v1.1 followers/list endpoint
    const apiUrl = 'https://api.twitter.com/1.1/followers/list.json'
    const requestData = {
      url: apiUrl,
      method: 'GET',
      data: {
        user_id: twitterUserId,
        count: '200', // Maximum allowed
        skip_status: 'true',
        include_user_entities: 'false'
      }
    }

    const authHeader = oauth.toHeader(oauth.authorize(requestData, token_data))

    console.log('Making Twitter API v1.1 request...')
    const response = await fetch(`${apiUrl}?${new URLSearchParams(requestData.data).toString()}`, {
      method: 'GET',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    })

    console.log('Twitter API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Twitter API error:', response.status, errorText)
      
      // Parse Twitter API error
      let errorDetails = errorText
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.errors && errorJson.errors.length > 0) {
          errorDetails = errorJson.errors.map((err: any) => `${err.message} (code: ${err.code})`).join(', ')
        }
      } catch (e) {
        // Keep original error text
      }

      return NextResponse.json({ 
        error: 'Twitter API request failed',
        details: errorDetails,
        status: response.status,
        service: 'twitter-api-v1.1'
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('Twitter API response received')
    console.log('Users returned:', data.users?.length || 0)
    console.log('Has next cursor:', !!data.next_cursor_str)

    if (!data.users || data.users.length === 0) {
      return NextResponse.json({
        error: 'No followers returned from Twitter API',
        details: 'The Twitter API returned an empty followers list. This could be due to privacy settings or API limitations.',
        service: 'twitter-api-v1.1'
      }, { status: 404 })
    }

    // Convert Twitter API v1.1 response to our format
    const followers = data.users.map((user: any) => ({
      id: user.id_str,
      username: user.screen_name,
      name: user.name,
      profile_image_url: user.profile_image_url_https || user.profile_image_url,
      followers_count: user.followers_count || 0,
      following_count: user.friends_count || 0,
      tweet_count: user.statuses_count || 0,
      verified: user.verified || false,
      description: user.description || '',
      location: user.location || '',
      created_at: user.created_at,
      source: 'twitter-api-v1.1'
    }))

    // Store followers in Firestore
    const db = firebase.firestore()
    const batch = db.batch()
    
    // Clear existing followers from this source
    const existingFollowersQuery = db
      .collection('users')
      .doc(userId)
      .collection('followers')
      .where('source', '==', 'twitter-api-v1.1')
    
    const existingFollowers = await existingFollowersQuery.get()
    existingFollowers.docs.forEach((doc: any) => {
      batch.delete(doc.ref)
    })
    
    // Add new followers
    followers.forEach((follower: any, index: number) => {
      const followerRef = db
        .collection('users')
        .doc(userId)
        .collection('followers')
        .doc(`api_${follower.id}`)
      
      batch.set(followerRef, {
        id: follower.id,
        username: follower.username,
        name: follower.name,
        profile_image_url: follower.profile_image_url,
        followers_count: follower.followers_count,
        verified: follower.verified,
        source: 'twitter-api-v1.1',
        scanned_at: new Date(),
        user_id: userId
      })
    })
    
    await batch.commit()
    console.log(`Stored ${followers.length} followers in Firestore`)

    return NextResponse.json({
      success: true,
      followers_count: followers.length,
      followers: followers,
      scan_method: 'twitter-api-v1.1',
      message: `Successfully retrieved ${followers.length} followers using Twitter API v1.1`,
      has_more: !!data.next_cursor_str,
      next_cursor: data.next_cursor_str || null,
      api_limits: {
        remaining: response.headers.get('x-rate-limit-remaining'),
        reset: response.headers.get('x-rate-limit-reset')
      }
    })

  } catch (error) {
    console.error('Twitter API follower scan error:', error)
    return NextResponse.json({
      error: 'Internal server error during Twitter API scan',
      details: error instanceof Error ? error.message : 'Unknown error',
      service: 'twitter-api-v1.1'
    }, { status: 500 })
  }
}
