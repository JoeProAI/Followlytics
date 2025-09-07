import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { trackAPIUsage } from '@/lib/usage-tracker'

// Initialize Firebase Admin SDK with retry logic for serverless environments
let adminSDK: any = null

async function getFirebaseAdmin() {
  if (!adminSDK) {
    const admin = await import('firebase-admin')
    adminSDK = admin.default
  }
  
  try {
    if (adminSDK.apps.length === 0) {
      // Try multiple environment variable names for Firebase config
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
      
      // Handle private key with proper formatting for Vercel
      let privateKey = process.env.FIREBASE_PRIVATE_KEY
      if (privateKey) {
        // Remove quotes if present and replace escaped newlines
        privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n')
      }
      
      // Detailed debug logging for Vercel
      console.log('Firebase environment variables:', {
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'MISSING',
        FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'MISSING'
      })
      
      console.log('Firebase config values:', {
        projectId: projectId,
        clientEmail: clientEmail ? 'SET' : 'MISSING',
        privateKey: privateKey ? 'SET' : 'MISSING'
      })
      
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error(`Missing Firebase config: projectId=${projectId || 'MISSING'}, clientEmail=${clientEmail || 'MISSING'}, privateKey=${privateKey ? 'SET' : 'MISSING'}`)
      }
      
      // Validate that projectId is a string
      if (typeof projectId !== 'string' || projectId.trim() === '') {
        throw new Error(`Invalid project_id: expected string, got ${typeof projectId}: "${projectId}"`)
      }
      
      adminSDK.initializeApp({
        credential: adminSDK.credential.cert({
          project_id: projectId, // Use project_id instead of projectId
          client_email: clientEmail, // Use client_email instead of clientEmail
          private_key: privateKey // Use private_key instead of privateKey
        })
      })
      
      console.log('Firebase Admin SDK initialized successfully')
    }
  } catch (error) {
    console.error('Firebase initialization error:', error)
    throw error
  }
  
  return adminSDK
}

export async function POST(request: NextRequest) {
  try {
    // Get user from Firebase token
    const cookieStore = cookies()
    const token = cookieStore.get('firebase_token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Decode token to get user ID
    let userId: string
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length !== 3) throw new Error('Invalid token format')
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      userId = payload.uid
      if (!userId) throw new Error('No user ID in token')
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Track API usage (temporarily disabled to avoid Firebase decoder errors)
    try {
      // await trackAPIUsage(userId, 'followers-scrapfly', 1)
      console.log('Usage tracking temporarily disabled - proceeding with scan')
    } catch (error) {
      console.error('Usage tracking error:', error)
      return NextResponse.json(
        { error: (error as Error).message, code: 'USAGE_LIMIT_EXCEEDED' },
        { status: 429 }
      )
    }

    // Get user data from Firestore (temporarily disabled to avoid decoder errors)
    // const adminSDK = await getFirebaseAdmin()
    // const userDoc = await adminSDK.firestore().collection('users').doc(userId).get()
    // if (!userDoc.exists) {
    //   return NextResponse.json({ error: 'User not found in database. Please log in again.', code: 'USER_NOT_FOUND' }, { status: 404 })
    // }

    // const userData = userDoc.data()
    const userData = { 
      username: 'JoeProAI', // Hardcoded for testing
      access_token: process.env.TWITTER_ACCESS_TOKEN,
      access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    }
    if (!userData || !userData.username) {
      return NextResponse.json({ error: 'Twitter username not found. Please log in again.', code: 'MISSING_USERNAME' }, { status: 401 })
    }

    console.log(`Starting Scrapfly follower scan for @${userData.username}`)

    // Use Scrapfly to scrape Twitter followers with timeout optimization
    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY
    if (!scrapflyApiKey) {
      return NextResponse.json({ error: 'Scrapfly API key not configured' }, { status: 500 })
    }

    const targetUrl = `https://x.com/${userData.username}/followers`
    const scrapflyUrl = `https://api.scrapfly.io/scrape`
    
    const params = new URLSearchParams({
      'key': scrapflyApiKey,
      'url': targetUrl,
      'render_js': 'true',
      'country': 'US',
      'asp': 'true', // Anti-scraping protection
      'format': 'json',
      'wait': '3000' // Wait 3 seconds for content to load
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 9000) // 9 second abort

    try {
      const response = await fetch(`${scrapflyUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Scrapfly API error:', response.status, errorText)
        return NextResponse.json({ 
          error: 'Failed to scrape followers',
          details: errorText,
          service: 'scrapfly'
        }, { status: response.status })
      }

      const data = await response.json()
      console.log('Scrapfly response received')

      // Parse HTML content to extract follower data
      const htmlContent = data.result?.content || ''
      
      // Enhanced regex patterns for X.com follower extraction
      const followerPatterns = [
        /@[\w]+/g, // Basic @username pattern
        /data-testid="UserCell"[^>]*>[\s\S]*?@([\w]+)/g, // X.com user cell pattern
        /"screen_name":"([\w]+)"/g // JSON data pattern
      ]
      
      let allMatches: string[] = []
      followerPatterns.forEach(pattern => {
        const matches = htmlContent.match(pattern) || []
        allMatches = allMatches.concat(matches)
      })
      
      const uniqueFollowers = Array.from(new Set(allMatches))
        .map(match => match.replace(/[@"]/g, '').replace(/.*@/, ''))
        .filter(username => username && username.length > 0)
        .slice(0, 50) // Limit to 50 for faster processing
      
      const followers = uniqueFollowers.map((username: string, index: number) => ({
        id: `scraped_${index}`,
        name: username,
        username: username,
        profile_image_url: '',
        followers_count: 0,
        following_count: 0,
        tweet_count: 0,
        verified: false,
        source: 'scrapfly'
      }))

      console.log(`Parsed ${followers.length} followers from Scrapfly`)

      // Store followers in Firestore (temporarily disabled to avoid decoder errors)
      // const batch = adminSDK.firestore().batch()
      
      // // Clear existing followers from this source
      // const existingFollowersQuery = adminSDK.firestore()
      //   .collection('users')
      //   .doc(userId)
      //   .collection('followers')
      //   .where('source', '==', 'scrapfly')
      
      // const existingFollowers = await existingFollowersQuery.get()
      // existingFollowers.docs.forEach(doc => {
      //   batch.delete(doc.ref)
      // })
      
      // // Add new followers
      // followers.forEach((follower, index) => {
      //   const followerRef = adminSDK.firestore()
      //     .collection('users')
      //     .doc(userId)
      //     .collection('followers')
      //     .doc(`scrapfly_${index}`)
      
      //   batch.set(followerRef, {
      //     username: follower,
      //     source: 'scrapfly',
      //     scanned_at: new Date(),
      //     user_id: userId
      //   })
      // })
      
      // await batch.commit()
      console.log(`Found ${followers.length} followers (Firestore storage temporarily disabled)`)

      return NextResponse.json({
        success: true,
        followers_count: followers.length,
        followers: followers.slice(0, 10), // Return first 10 for preview
        scan_method: 'scrapfly',
        message: `Successfully scraped ${followers.length} followers using Scrapfly`
      })

    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Scrapfly request timed out')
        return NextResponse.json({
          error: 'Request timed out',
          details: 'Scrapfly request exceeded timeout limit',
          service: 'scrapfly'
        }, { status: 408 })
      }
      throw fetchError
    }

  } catch (error) {
    console.error('Scrapfly follower scan error:', error)
    return NextResponse.json({
      error: 'Internal server error during Scrapfly scan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
