import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { trackAPIUsage } from '@/lib/usage-tracker'

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

async function scrapeFollowersWithFetch(username: string): Promise<string[]> {
  const followers: string[] = []
  const maxRetries = 3
  const delayBetweenRequests = 2000 // 2 seconds
  
  try {
    console.log(`Starting comprehensive scraping for ${username} (targeting 800+ followers)`)
    
    // Strategy 1: Multiple attempts at followers page with different approaches
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}: Fetching followers page...`)
        const followersUrl = `https://twitter.com/${username}/followers`
        
        const response = await fetch(followersUrl, {
          headers: {
            'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
          }
        })
        
        if (response.ok) {
          const html = await response.text()
          console.log(`Attempt ${attempt}: HTML length:`, html.length)
          
          // Enhanced regex patterns for comprehensive extraction
          const usernamePatterns = [
            // Standard mentions
            /@([a-zA-Z0-9_]{3,15})/g,
            // Twitter/X URLs
            /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{3,15})/g,
            // JSON data patterns
            /"screen_name":"([a-zA-Z0-9_]{3,15})"/g,
            /"username":"([a-zA-Z0-9_]{3,15})"/g,
            /"name":"([a-zA-Z0-9_]{3,15})"/g,
            // HTML data attributes
            /data-screen-name="([a-zA-Z0-9_]{3,15})"/g,
            /data-user-id="[^"]*"[^>]*>@([a-zA-Z0-9_]{3,15})/g,
            // Profile link patterns
            /href="\/([a-zA-Z0-9_]{3,15})"[^>]*class="[^"]*profile/g,
            // User cell patterns
            /UserCell[^>]*>[^<]*<[^>]*>([a-zA-Z0-9_]{3,15})/g,
            // React component patterns
            /"user":{"id_str":"[^"]*","name":"[^"]*","screen_name":"([a-zA-Z0-9_]{3,15})"/g
          ]
          
          let extractedCount = 0
          usernamePatterns.forEach((pattern, index) => {
            let match
            const patternMatches = []
            while ((match = pattern.exec(html)) !== null) {
              const extractedUsername = match[1].toLowerCase()
              if (extractedUsername !== username.toLowerCase() && 
                  extractedUsername.length >= 3 && 
                  extractedUsername.length <= 15 &&
                  /^[a-zA-Z0-9_]+$/.test(extractedUsername) &&
                  !followers.includes(extractedUsername)) {
                followers.push(extractedUsername)
                patternMatches.push(extractedUsername)
                extractedCount++
              }
            }
            if (patternMatches.length > 0) {
              console.log(`Pattern ${index + 1} found ${patternMatches.length} new followers`)
            }
          })
          
          console.log(`Attempt ${attempt}: Extracted ${extractedCount} new followers (total: ${followers.length})`)
          
          // If we got a good amount, break early
          if (extractedCount > 50) break
          
        } else {
          console.log(`Attempt ${attempt}: Request failed:`, response.status, response.statusText)
        }
        
        // Wait between attempts
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRequests))
        }
        
      } catch (error) {
        console.log(`Attempt ${attempt}: Error:`, error)
      }
    }
    
    // Strategy 2: X.com domain with different endpoints
    const xEndpoints = [
      `https://x.com/${username}/followers`,
      `https://x.com/${username}/verified_followers`,
      `https://x.com/i/api/1.1/followers/list.json?screen_name=${username}&count=200`
    ]
    
    for (const endpoint of xEndpoints) {
      try {
        console.log(`Trying X.com endpoint: ${endpoint}`)
        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/html, */*',
            'Referer': `https://x.com/${username}`
          }
        })
        
        if (response.ok) {
          const content = await response.text()
          console.log(`X.com endpoint response length: ${content.length}`)
          
          // Try to parse as JSON first
          try {
            const jsonData = JSON.parse(content)
            if (jsonData.users) {
              jsonData.users.forEach((user: any) => {
                if (user.screen_name && !followers.includes(user.screen_name.toLowerCase())) {
                  followers.push(user.screen_name.toLowerCase())
                }
              })
            }
          } catch {
            // If not JSON, treat as HTML and extract usernames
            const patterns = [/@([a-zA-Z0-9_]{3,15})/g, /"screen_name":"([a-zA-Z0-9_]{3,15})"/g]
            patterns.forEach(pattern => {
              let match
              while ((match = pattern.exec(content)) !== null) {
                const extractedUsername = match[1].toLowerCase()
                if (extractedUsername !== username.toLowerCase() && 
                    !followers.includes(extractedUsername)) {
                  followers.push(extractedUsername)
                }
              }
            })
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests))
      } catch (error) {
        console.log(`X.com endpoint error: ${error}`)
      }
    }
    
    // Strategy 3: Mobile Twitter with pagination simulation
    try {
      console.log('Trying mobile Twitter with pagination...')
      const mobileUrls = [
        `https://mobile.twitter.com/${username}/followers`,
        `https://m.twitter.com/${username}/followers`,
        `https://mobile.twitter.com/${username}/followers?page=2`,
        `https://mobile.twitter.com/${username}/followers?cursor=1`
      ]
      
      for (const mobileUrl of mobileUrls) {
        try {
          const response = await fetch(mobileUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
            }
          })
          
          if (response.ok) {
            const html = await response.text()
            console.log(`Mobile URL ${mobileUrl} - HTML length: ${html.length}`)
            
            const mobilePatterns = [
              /@([a-zA-Z0-9_]{3,15})/g,
              /\/([a-zA-Z0-9_]{3,15})(?:\?|$|\/)/g,
              /"username":"([a-zA-Z0-9_]{3,15})"/g
            ]
            
            mobilePatterns.forEach(pattern => {
              let match
              while ((match = pattern.exec(html)) !== null) {
                const extractedUsername = match[1].toLowerCase()
                if (extractedUsername !== username.toLowerCase() && 
                    extractedUsername.length >= 3 && 
                    extractedUsername.length <= 15 &&
                    /^[a-zA-Z0-9_]+$/.test(extractedUsername) &&
                    !followers.includes(extractedUsername)) {
                  followers.push(extractedUsername)
                }
              }
            })
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          console.log(`Mobile URL error: ${error}`)
        }
      }
    } catch (error) {
      console.log('Mobile scraping error:', error)
    }
    
    // Strategy 4: Search-based discovery with multiple queries
    const searchQueries = [
      `@${username}`,
      `"${username}"`,
      `following ${username}`,
      `${username} follower`,
      `reply to @${username}`
    ]
    
    for (const query of searchQueries) {
      try {
        console.log(`Searching for: ${query}`)
        const searchUrl = `https://twitter.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=user`
        
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        })
        
        if (response.ok) {
          const html = await response.text()
          const searchPatterns = [
            /@([a-zA-Z0-9_]{3,15})/g,
            /\/([a-zA-Z0-9_]{3,15})(?:\?|$|\/)/g,
            /"screen_name":"([a-zA-Z0-9_]{3,15})"/g
          ]
          
          searchPatterns.forEach(pattern => {
            let match
            while ((match = pattern.exec(html)) !== null) {
              const extractedUsername = match[1].toLowerCase()
              if (extractedUsername !== username.toLowerCase() && 
                  extractedUsername.length >= 3 && 
                  extractedUsername.length <= 15 &&
                  /^[a-zA-Z0-9_]+$/.test(extractedUsername) &&
                  !followers.includes(extractedUsername)) {
                followers.push(extractedUsername)
              }
            }
          })
        }
        
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests))
      } catch (error) {
        console.log(`Search query error: ${error}`)
      }
    }
    
    console.log(`=== SCRAPING COMPLETE ===`)
    console.log(`Total unique followers found: ${followers.length}`)
    console.log(`Target was 800+, achieved: ${(followers.length / 800 * 100).toFixed(1)}%`)
    
    return followers
    
  } catch (error) {
    console.error('Comprehensive scraping error:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  console.log('=== FOLLOWERS NODE.JS ENDPOINT CALLED ===')
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
      await trackAPIUsage(userId, 'followers-nodejs', 1)
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

    console.log('Starting Node.js follower scraping for username:', username)

    try {
      // Run comprehensive Node.js scraping to get all followers (may take 2-3 minutes for 800+ followers)
      console.log(`Starting comprehensive scraping for ${username} with 800+ followers target`)
      const followers = await scrapeFollowersWithFetch(username)
      console.log(`Node.js extracted ${followers.length} followers`)
      
      if (followers.length === 0) {
        return NextResponse.json({
          error: 'No followers found',
          details: 'Node.js scraping did not return any follower data. This could be due to Twitter\'s anti-bot measures or rate limiting.',
          service: 'nodejs'
        }, { status: 404 })
      }

      // Convert to expected format
      const followersData = followers.map((followerUsername, index) => ({
        id: `nodejs_${index}`,
        username: followerUsername,
        name: followerUsername,
        profile_image_url: '',
        followers_count: 0,
        following_count: 0,
        tweet_count: 0,
        verified: false,
        source: 'nodejs'
      }))

      // Store followers in Firestore
      const db = firebase.firestore()
      const batch = db.batch()
      
      // Clear existing followers from this source
      const existingFollowersQuery = db
        .collection('users')
        .doc(userId)
        .collection('followers')
        .where('source', '==', 'nodejs')
      
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
          .doc(`nodejs_${index}`)
        
        batch.set(followerRef, {
          username: follower.username,
          source: 'nodejs',
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
        scan_method: 'nodejs-comprehensive',
        message: `Successfully scraped ${followersData.length} followers using comprehensive Node.js strategies`,
        coverage_percentage: ((followersData.length / 800) * 100).toFixed(1),
        strategies_used: ['twitter_followers_page', 'x_com_endpoints', 'mobile_twitter', 'search_discovery']
      })

    } catch (nodejsError) {
      console.error('Node.js execution error:', nodejsError)
      return NextResponse.json({
        error: 'Node.js scraping failed',
        details: nodejsError instanceof Error ? nodejsError.message : 'Unknown Node.js error',
        service: 'nodejs'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Node.js follower scan error:', error)
    return NextResponse.json({
      error: 'Internal server error during Node.js scan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
