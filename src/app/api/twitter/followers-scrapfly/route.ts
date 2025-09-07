import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { trackAPIUsage } from '@/lib/usage-tracker'

// Initialize Firebase Admin SDK with retry logic for serverless environments
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
  console.log('=== FOLLOWERS SCRAPFLY ENDPOINT CALLED ===')
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
      await trackAPIUsage(userId, 'followers-scrapfly', 1)
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
    console.log('User data retrieved:', { 
      hasData: !!userData, 
      username: userData?.username, 
      hasAccessToken: !!userData?.access_token,
      allKeys: userData ? Object.keys(userData) : []
    })
    
    if (!userData || !userData.username) {
      console.log('Missing username in user data:', userData)
      return NextResponse.json({ error: 'Twitter username not found. Please log in again.', code: 'MISSING_USERNAME' }, { status: 401 })
    }

    console.log(`Starting Scrapfly follower scan for @${userData.username}`)
    console.log('User data:', { username: userData.username, hasAccessToken: !!userData.access_token })

    // Use Scrapfly to scrape Twitter followers using XHR capture technique
    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY
    if (!scrapflyApiKey) {
      return NextResponse.json({ error: 'Scrapfly API key not configured' }, { status: 500 })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000) // 25 second timeout for XHR capture

    try {
      const profileUrl = `https://x.com/${userData.username}/followers`
      console.log('Scrapfly request URL:', profileUrl)
      
      if (!profileUrl || !userData.username) {
        throw new Error('Invalid profile URL - username is missing')
      }
      
      const requestBody = {
        url: profileUrl,
        retry: true,
        country: 'US',
        render_js: true,
        wait_for_selector: '[data-testid="primaryColumn"]',
        session: `twitter_${userId}`,
        cache: false,
        browser_data: {
          xhr_call: true // Enable XHR request capture
        }
      }
      
      console.log('Scrapfly request body:', JSON.stringify(requestBody, null, 2))
      
      const response = await fetch('https://api.scrapfly.io/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${scrapflyApiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Scrapfly API error:', response.status, errorText)
        return NextResponse.json({ 
          error: `Scrapfly API error: ${response.status}`, 
          details: errorText 
        }, { status: 500 })
      }

      const scrapflyResult = await response.json()
      console.log('Scrapfly response received, extracting followers from XHR calls...')

      // Extract followers from captured XHR requests (following Scrapfly documentation)
      const xhrCalls = scrapflyResult.result?.browser_data?.xhr_call || []
      const followers = new Set<string>()
      
      // Look for UserBy or Followers API calls in XHR requests
      const followerCalls = xhrCalls.filter((xhr: any) => 
        xhr.url && (
          xhr.url.includes('UserBy') || 
          xhr.url.includes('Followers') ||
          xhr.url.includes('following') ||
          xhr.url.includes('followers')
        )
      )

      console.log(`Found ${followerCalls.length} relevant XHR calls`)

      for (const xhr of followerCalls) {
        if (!xhr.response?.body) continue
        
        try {
          const data = JSON.parse(xhr.response.body)
          
          // Extract followers from various API response structures
          const extractFollowers = (obj: any) => {
            if (Array.isArray(obj)) {
              obj.forEach(extractFollowers)
            } else if (obj && typeof obj === 'object') {
              // Look for user objects with screen_name or username
              if (obj.screen_name && typeof obj.screen_name === 'string') {
                followers.add(obj.screen_name.toLowerCase())
              }
              if (obj.username && typeof obj.username === 'string') {
                followers.add(obj.username.toLowerCase())
              }
              if (obj.legacy?.screen_name && typeof obj.legacy.screen_name === 'string') {
                followers.add(obj.legacy.screen_name.toLowerCase())
              }
              
              // Recursively search nested objects
              Object.values(obj).forEach(extractFollowers)
            }
          }
          
          extractFollowers(data)
        } catch (parseError) {
          console.log('Failed to parse XHR response:', parseError)
        }
      }

      // Filter out invalid usernames and limit results
      const validFollowers = Array.from(followers).filter(username => 
        username && 
        username.length > 0 && 
        username.length <= 15 && 
        /^[a-zA-Z0-9_]+$/.test(username) &&
        username !== userData.username.toLowerCase()
      ).slice(0, 100)
      
      console.log(`Extracted ${validFollowers.length} unique followers from XHR data`)

      // Convert to expected format
      const followersData = validFollowers.map(username => ({
        id: username,
        username: username,
        name: username,
        profile_image_url: '',
        followers_count: 0,
        following_count: 0,
        tweet_count: 0,
        verified: false,
        source: 'scrapfly'
      }))

      // Store followers in Firestore
      const batch = firebase.firestore().batch()
      
      // Clear existing followers from this source
      const existingFollowersQuery = firebase.firestore()
        .collection('users')
        .doc(userId)
        .collection('followers')
        .where('source', '==', 'scrapfly')
      
      const existingFollowers = await existingFollowersQuery.get()
      existingFollowers.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
      
      // Add new followers
      followersData.forEach((follower, index) => {
        const followerRef = firebase.firestore()
          .collection('users')
          .doc(userId)
          .collection('followers')
          .doc(`scrapfly_${index}`)
        
        batch.set(followerRef, {
          username: follower.username,
          source: 'scrapfly',
          scanned_at: new Date(),
          user_id: userId
        })
      })
      
      await batch.commit()
      console.log(`Stored ${followersData.length} followers in Firestore`)

      return NextResponse.json({
        success: true,
        followers_count: followersData.length,
        followers: followersData.slice(0, 10), // Return first 10 for preview
        scan_method: 'scrapfly-xhr',
        message: `Successfully scraped ${followersData.length} followers using Scrapfly XHR capture`
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
