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
  console.log('=== FOLLOWERS SCRAPFLY ENDPOINT CALLED - VERSION 2.0 ===')
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
    
    // The username is stored as 'username' field from Twitter's screen_name
    const username = userData?.username
    if (!userData || !username) {
      return NextResponse.json({ error: 'Twitter username not found. Please log in again.', code: 'MISSING_USERNAME' }, { status: 401 })
    }

    // Use Scrapfly to scrape Twitter followers using XHR capture technique
    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY
    if (!scrapflyApiKey) {
      return NextResponse.json({ error: 'Scrapfly API key not configured' }, { status: 500 })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000) // 25 second timeout for XHR capture

    try {
      const profileUrl = `https://x.com/${username}/followers`
      const requestBody = {
        url: profileUrl,
        retry: true,
        country: 'US',
        render_js: true,
        wait_for_selector: '[data-testid="primaryColumn"]',
        session: `twitter_${userId}`,
        cache: false,
        browser_data: {
          xhr_call: true
        }
      }
      
      console.log('DEBUG - Username:', username)
      console.log('DEBUG - Profile URL:', profileUrl)
      console.log('DEBUG - Request body:', JSON.stringify(requestBody))
      
      // Scrapfly API expects parameters as query string with Authorization header
      // Create unique session name to avoid concurrent access errors
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const sessionName = `twitter_${userId}_${timestamp}_${randomSuffix}`
      
      const params = new URLSearchParams({
        url: profileUrl,
        retry: 'true',
        country: 'US',
        render_js: 'true',
        wait_for_selector: '[data-testid="primaryColumn"]',
        session: sessionName,
        cache: 'false',
        xhr_call: 'true'
      })
      
      console.log('DEBUG - Using session name:', sessionName)

      // Use Scrapfly's built-in auto-scroll parameter instead of complex JavaScript scenario
      params.set('auto_scroll', 'true')
      params.set('auto_scroll_limit', '10')

      const response = await fetch(`https://api.scrapfly.io/scrape?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${scrapflyApiKey}`,
          'Content-Type': 'application/json'
        },
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
      console.log('Scrapfly response received successfully')

      // Extract followers from XHR calls captured by Scrapfly
      const xhrCalls = scrapflyResult.result?.browser_data?.xhr_call || []
      const followers = new Set<string>()
      
      console.log(`Found ${xhrCalls.length} XHR calls`)
      
      // Look for follower-related GraphQL endpoints
      const followerCalls = xhrCalls.filter((call: any) => 
        call.url && (
          call.url.includes('Followers') ||
          call.url.includes('UserBy') ||
          call.url.includes('graphql') && call.response_body
        )
      )
      
      console.log(`Found ${followerCalls.length} potential follower API calls`)
      
      for (const call of followerCalls) {
        try {
          if (call.response_body) {
            const data = typeof call.response_body === 'string' 
              ? JSON.parse(call.response_body) 
              : call.response_body
            
            // Extract followers from various GraphQL response structures
            const extractFollowersFromData = (obj: any, path: string[] = []): void => {
              if (obj && typeof obj === 'object') {
                // Look for screen_name or username fields
                if (obj.screen_name && typeof obj.screen_name === 'string') {
                  const username = obj.screen_name.toLowerCase()
                  if (username.length > 2 && username.length <= 15 && 
                      /^[a-zA-Z0-9_]+$/.test(username) &&
                      username !== userData?.username?.toLowerCase()) {
                    followers.add(username)
                    console.log(`Found follower: ${username}`)
                  }
                }
                
                // Recursively search nested objects and arrays
                if (Array.isArray(obj)) {
                  obj.forEach((item, index) => extractFollowersFromData(item, [...path, index.toString()]))
                } else {
                  Object.keys(obj).forEach(key => {
                    if (key === 'legacy' || key === 'result' || key === 'user' || key === 'users' || key === 'entries') {
                      extractFollowersFromData(obj[key], [...path, key])
                    }
                  })
                }
              }
            }
            
            extractFollowersFromData(data)
          }
        } catch (error) {
          console.error('Error parsing XHR response:', error)
        }
      }

      // If no followers found in XHR, fall back to HTML parsing with better patterns
      if (followers.size === 0) {
        console.log('No followers found in XHR calls, falling back to HTML parsing')
        const htmlContent = scrapflyResult.result?.content || ''
        
        // More specific patterns for actual Twitter usernames in HTML
        const htmlPatterns = [
          /"screen_name":"([a-zA-Z0-9_]{1,15})"/g,
          /data-screen-name="([a-zA-Z0-9_]{1,15})"/g,
          /@([a-zA-Z0-9_]{3,15})(?=\s|$|[^a-zA-Z0-9_])/g
        ]
        
        const currentUsername = userData?.username?.toLowerCase()
        const excludeTerms = ['media', 'font', 'keyframes', 'layer', 'import', 'charset', 'namespace', 'document', 'supports', 'page', 'counter', 'using', 'imprint', 'articles', 'privacy', 'tos', 'twitter', 'login', 'resources', 'rules']
        
        for (const pattern of htmlPatterns) {
          let match
          while ((match = pattern.exec(htmlContent)) !== null) {
            const username = match[1]?.toLowerCase()
            if (username && 
                username.length >= 3 && 
                username.length <= 15 &&
                /^[a-zA-Z0-9_]+$/.test(username) &&
                username !== currentUsername &&
                !excludeTerms.includes(username) &&
                !username.startsWith('_') &&
                !/^\d+$/.test(username)) {
              followers.add(username)
            }
          }
        }
      }

      // Convert to array and limit results
      const validFollowers = Array.from(followers).slice(0, 200)
      console.log(`Extracted ${validFollowers.length} unique followers`)
      console.log('Sample followers:', validFollowers.slice(0, 10))
      
      // Debug logging
      if (validFollowers.length === 0) {
        console.log('No followers found. XHR calls:', xhrCalls.length)
        if (xhrCalls.length > 0) {
          console.log('Sample XHR URLs:', xhrCalls.slice(0, 3).map((call: any) => call.url))
        }
        const htmlContent = scrapflyResult.result?.content || ''
        console.log('HTML content length:', htmlContent.length)
        console.log('HTML sample:', htmlContent.substring(0, 500))
      }

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
      const firebase = await getFirebaseAdmin()
      const db = firebase.firestore()
      const batch = db.batch()
      
      // Clear existing followers from this source
      const existingFollowersQuery = db
        .collection('users')
        .doc(userId)
        .collection('followers')
        .where('source', '==', 'scrapfly')
      
      const existingFollowers = await existingFollowersQuery.get()
      existingFollowers.docs.forEach((doc: any) => {
        batch.delete(doc.ref)
      })
      
      // Add new followers
      followersData.forEach((follower, index) => {
        const followerRef = db
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
        followers: followersData,
        scan_method: 'scrapfly-html',
        message: `Successfully scraped ${followersData.length} followers using Scrapfly`
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
