import { NextRequest, NextResponse } from 'next/server'

// Initialize Firebase Admin SDK with dynamic import to avoid build issues
let adminSDK: any = null

async function getFirebaseAdmin() {
  if (!adminSDK) {
    const admin = await import('firebase-admin')
    adminSDK = admin.default
    
    if (!adminSDK.apps.length) {
      adminSDK.initializeApp({
        credential: adminSDK.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      })
    }
  }
  return adminSDK
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('firebase_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Decode Firebase custom token to get user ID
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

    // Use Scrapfly to scrape Twitter followers
    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY
    if (!scrapflyApiKey) {
      return NextResponse.json({ error: 'Scrapfly API key not configured' }, { status: 500 })
    }

    const targetUrl = `https://twitter.com/${userData.username}/followers`
    const scrapflyUrl = `https://api.scrapfly.io/scrape`
    
    const params = new URLSearchParams({
      'key': scrapflyApiKey,
      'url': targetUrl,
      'render_js': 'true',
      'country': 'US',
      'asp': 'true', // Anti-scraping protection
      'format': 'json'
    })

    const response = await fetch(`${scrapflyUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
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
    
    // Simple regex to extract follower usernames from Twitter HTML
    // This is a basic implementation - would need more sophisticated parsing for production
    const followerMatches = htmlContent.match(/@[\w]+/g) || []
    const uniqueFollowers = Array.from(new Set(followerMatches)).slice(0, 100) // Limit to 100 for testing
    
    const followers = uniqueFollowers.map((username: unknown, index: number) => {
      const usernameStr = String(username)
      return {
        id: `scraped_${index}`,
        name: usernameStr.replace('@', ''),
        username: usernameStr.replace('@', ''),
        profile_image_url: '',
        followers_count: 0,
        following_count: 0,
        tweet_count: 0,
        verified: false,
        source: 'scrapfly'
      }
    })

    console.log(`Parsed ${followers.length} followers from Scrapfly`)

    // Store followers in Firestore
    const batch = adminSDK.firestore().batch()
    const followersCollection = adminSDK.firestore().collection('users').doc(userId).collection('followers')

    // Clear existing followers
    const existingFollowers = await followersCollection.limit(500).get()
    existingFollowers.docs.forEach((doc: any) => {
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

  } catch (error) {
    console.error('Scrapfly follower scan error:', error)
    return NextResponse.json({
      error: 'Internal server error during Scrapfly scan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
