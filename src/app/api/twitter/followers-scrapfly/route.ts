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
      const projectId = process.env.FIREBASE_PROJECT_ID
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
      // Handle private key with proper formatting for Vercel
      let privateKey = process.env.FIREBASE_PRIVATE_KEY
      if (privateKey) {
        // Remove quotes if present and replace escaped newlines
        privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n')
      }
      
      // Debug logging for Vercel
      console.log('Firebase config check:', {
        projectId: !!projectId,
        clientEmail: !!clientEmail,
        privateKey: !!privateKey
      })
      
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error(`Missing Firebase config: projectId=${!!projectId}, clientEmail=${!!clientEmail}, privateKey=${!!privateKey}`)
      }
      
      adminSDK.initializeApp({
        credential: adminSDK.credential.cert({
          projectId,
          clientEmail,
          privateKey
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

    // Track API usage and check limits
    try {
      await trackAPIUsage(userId, 'followers-scrapfly', 10) // Cost 10 calls for follower scan
    } catch (usageError) {
      return NextResponse.json({ 
        error: usageError instanceof Error ? usageError.message : 'Usage limit exceeded',
        code: 'USAGE_LIMIT_EXCEEDED'
      }, { status: 429 })
    }

    // Get user data from Firestore
    const adminSDK = await getFirebaseAdmin()
    const userDoc = await adminSDK.firestore().collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found in database. Please log in again.', code: 'USER_NOT_FOUND' }, { status: 404 })
    }

    const userData = userDoc.data()
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
      'timeout': '8000', // 8 second timeout to stay under Vercel limits
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

      // Store followers in Firestore with batch optimization
      const batch = adminSDK.firestore().batch()
      const followersCollection = adminSDK.firestore().collection('users').doc(userId).collection('followers')

      // Clear existing scrapfly followers only (preserve other sources)
      const existingScrapfly = await followersCollection.where('source', '==', 'scrapfly').limit(100).get()
      existingScrapfly.docs.forEach((doc: any) => {
        batch.delete(doc.ref)
      })

      // Add new followers
      followers.forEach((follower, index) => {
        const docRef = followersCollection.doc(`scrapfly_${index}`)
        batch.set(docRef, {
          ...follower,
          scanned_at: new Date(),
          scan_method: 'scrapfly'
        })
      })

      await batch.commit()
      console.log(`Stored ${followers.length} followers in Firestore`)

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
