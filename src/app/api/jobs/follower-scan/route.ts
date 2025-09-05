import { NextRequest, NextResponse } from 'next/server'
import * as admin from 'firebase-admin'
import crypto from 'crypto'

// Helper function to fetch user details by IDs using users/lookup
async function fetchUsersByIds(userIds: string[], consumerKey: string, consumerSecret: string, accessToken: string, accessTokenSecret: string): Promise<any[]> {
  const users: any[] = []
  
  // Process IDs in chunks of 100 (API limit)
  for (let i = 0; i < userIds.length; i += 100) {
    const chunk = userIds.slice(i, i + 100)
    
    // Build Twitter API request for users/lookup
    const baseUrl = 'https://api.twitter.com/1.1/users/lookup.json'
    const params = {
      user_id: chunk.join(','),
      include_entities: 'false'
    }

    // OAuth 1.0a signature
    const oauthNonce = crypto.randomBytes(16).toString('hex')
    const oauthTimestamp = Math.floor(Date.now() / 1000).toString()

    const oauthParams = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: oauthNonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: oauthTimestamp,
      oauth_token: accessToken,
      oauth_version: '1.0'
    }

    const allParams = { ...params, ...oauthParams }
    const paramString = Object.keys(allParams)
      .sort()
      .map(key => `${key}=${encodeURIComponent(allParams[key as keyof typeof allParams])}`)
      .join('&')

    const signatureBase = `GET&${encodeURIComponent(baseUrl)}&${encodeURIComponent(paramString)}`
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(accessTokenSecret)}`
    const signature = crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64')

    const authHeader = `OAuth oauth_consumer_key="${consumerKey}", oauth_nonce="${oauthNonce}", oauth_signature="${encodeURIComponent(signature)}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${oauthTimestamp}", oauth_token="${accessToken}", oauth_version="1.0"`

    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key as keyof typeof params])}`)
      .join('&')

    const response = await fetch(`${baseUrl}?${queryString}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'Followlytics/1.0'
      }
    })

    if (!response.ok) {
      console.error('Users lookup error:', response.status, await response.text())
      continue // Skip this chunk on error
    }

    const chunkUsers = await response.json()
    users.push(...chunkUsers)
    
    // Rate limiting delay between chunks
    if (i + 100 < userIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return users
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_ADMIN_SDK_KEY?.replace(/\\n/g, '\n')
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  
  if (!privateKey || !projectId || !clientEmail) {
    throw new Error(`Firebase Admin SDK not properly configured`)
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: privateKey,
    }),
  })
}

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max execution time

interface ScanJob {
  userId: string
  cursor?: string
  totalProcessed: number
  totalFollowers?: number
  status: 'running' | 'completed' | 'failed'
  startedAt: number
  lastUpdated: number
  batchSize: number
}

export async function POST(request: NextRequest) {
  try {
    const { userId, cursor, jobId, firebaseUserId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'Twitter User ID required' }, { status: 400 })
    }

    const db = admin.firestore()
    
    // Get user's Twitter credentials using Firebase user ID
    const firebaseId = firebaseUserId || userId
    const userQuery = await db.collection('users')
      .where('twitter_id', '==', userId)
      .limit(1)
      .get()
    
    if (userQuery.empty) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userDoc = userQuery.docs[0]
    const userData = userDoc.data()
    const accessToken = userData.access_token
    const accessTokenSecret = userData.access_token_secret

    if (!accessToken || !accessTokenSecret) {
      return NextResponse.json({ error: 'Twitter credentials not found' }, { status: 401 })
    }

    // Get or create scan job
    const jobRef = db.collection('scan_jobs').doc(jobId || `${userId}_${Date.now()}`)
    let job: ScanJob
    
    if (jobId) {
      const jobDoc = await jobRef.get()
      if (jobDoc.exists) {
        job = jobDoc.data() as ScanJob
      } else {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
    } else {
      // Create new job
      job = {
        userId,
        totalProcessed: 0,
        status: 'running',
        startedAt: Date.now(),
        lastUpdated: Date.now(),
        batchSize: 200 // Twitter API max per request
      }
      await jobRef.set(job)
    }

    // Fetch followers batch
    const consumerKey = process.env.TWITTER_API_KEY || process.env.TWITTER_CLIENT_ID
    const consumerSecret = process.env.TWITTER_API_SECRET || process.env.TWITTER_CLIENT_SECRET

    if (!consumerKey || !consumerSecret) {
      throw new Error('Twitter API credentials not configured')
    }

    // Build Twitter API request for follower IDs (much faster - 5000 vs 200 per request)
    const baseUrl = 'https://api.twitter.com/1.1/followers/ids.json'
    const params: Record<string, string> = {
      user_id: userId,
      count: '5000', // Max IDs per request
      stringify_ids: 'true'
    }

    if (cursor && cursor !== '-1') {
      params.cursor = cursor
    }

    // OAuth 1.0a signature
    const oauthNonce = crypto.randomBytes(16).toString('hex')
    const oauthTimestamp = Math.floor(Date.now() / 1000).toString()

    const oauthParams = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: oauthNonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: oauthTimestamp,
      oauth_token: accessToken,
      oauth_version: '1.0'
    }

    const allParams: Record<string, string> = { ...params, ...oauthParams }
    const paramString = Object.keys(allParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
      .join('&')

    const signatureBase = `GET&${encodeURIComponent(baseUrl)}&${encodeURIComponent(paramString)}`
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(accessTokenSecret)}`
    const signature = crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64')

    const authHeader = `OAuth oauth_consumer_key="${consumerKey}", oauth_nonce="${oauthNonce}", oauth_signature="${encodeURIComponent(signature)}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${oauthTimestamp}", oauth_token="${accessToken}", oauth_version="1.0"`

    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key as keyof typeof params])}`)
      .join('&')

    const response = await fetch(`${baseUrl}?${queryString}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'Followlytics/1.0'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Twitter API error:', response.status, errorText)
      throw new Error(`Twitter API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const followerIds = data.ids || []
    const nextCursor = data.next_cursor_str || null

    // Convert IDs to full user objects using users/lookup
    let followers: any[] = []
    if (followerIds.length > 0) {
      followers = await fetchUsersByIds(followerIds, consumerKey, consumerSecret, userDoc.data()?.twitter_access_token, userDoc.data()?.twitter_access_token_secret)
    }

    // Store followers in batches to avoid memory issues
    const batch = db.batch()
    const followersCollection = db.collection('users').doc(userDoc.id).collection('followers')

    // Clear existing followers if this is the first batch
    if (!cursor || cursor === '-1') {
      // Delete existing followers (in production, you'd want to do this more efficiently)
      const existingFollowers = await followersCollection.limit(500).get()
      existingFollowers.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
    }

    // Add new followers
    followers.forEach((follower: any) => {
      const followerRef = followersCollection.doc(follower.id_str)
      batch.set(followerRef, {
        id: follower.id_str,
        username: follower.screen_name,
        name: follower.name,
        profile_image_url: follower.profile_image_url_https,
        followers_count: follower.followers_count,
        verified: follower.verified,
        created_at: follower.created_at,
        scanned_at: admin.firestore.FieldValue.serverTimestamp()
      })
    })

    await batch.commit()

    // Update job progress
    const updatedJob: Partial<ScanJob> = {
      totalProcessed: job.totalProcessed + followers.length,
      lastUpdated: Date.now(),
      cursor: nextCursor
    }

    if (!data.total_followers && followers.length > 0) {
      // Estimate total followers from first batch
      updatedJob.totalFollowers = Math.ceil((job.totalProcessed + followers.length) * (1 / Math.max(0.1, followers.length / 200)))
    }

    // Check if scan is complete
    if (!nextCursor || nextCursor === '0') {
      updatedJob.status = 'completed'
      
      // Update user's last scan timestamp
      await db.collection('users').doc(userDoc.id).update({
        last_follower_scan: admin.firestore.FieldValue.serverTimestamp(),
        follower_count: updatedJob.totalProcessed
      })
    }

    await jobRef.update(updatedJob)

    // If not complete and we have time, continue processing
    const shouldContinue = updatedJob.status !== 'completed' && 
                          (Date.now() - job.startedAt) < 240000 // 4 minutes buffer

    if (shouldContinue && nextCursor && nextCursor !== '0') {
      // Recursively call next batch (with small delay to respect rate limits)
      setTimeout(async () => {
        try {
          await fetch(request.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              cursor: nextCursor,
              jobId: jobRef.id
            })
          })
        } catch (error) {
          console.error('Error continuing scan:', error)
        }
      }, 1000) // 1 second delay between batches
    }

    return NextResponse.json({
      success: true,
      jobId: jobRef.id,
      processed: updatedJob.totalProcessed,
      total: updatedJob.totalFollowers,
      status: updatedJob.status,
      nextCursor: nextCursor,
      batchSize: followers.length,
      hasMore: !!(nextCursor && nextCursor !== '0')
    })

  } catch (error) {
    console.error('Follower scan job error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const userId = searchParams.get('userId')

    if (!jobId && !userId) {
      return NextResponse.json({ error: 'Job ID or User ID required' }, { status: 400 })
    }

    const db = admin.firestore()
    
    if (jobId) {
      // Get specific job status
      const jobDoc = await db.collection('scan_jobs').doc(jobId).get()
      if (!jobDoc.exists) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      
      return NextResponse.json(jobDoc.data())
    } else {
      // Get latest job for user
      const jobs = await db.collection('scan_jobs')
        .where('userId', '==', userId)
        .orderBy('startedAt', 'desc')
        .limit(1)
        .get()
      
      if (jobs.empty) {
        return NextResponse.json({ error: 'No jobs found for user' }, { status: 404 })
      }
      
      return NextResponse.json(jobs.docs[0].data())
    }
  } catch (error) {
    console.error('Get job status error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
