import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { XAuth } from '@/lib/twitter-auth'

export const maxDuration = 300 // 5 minutes max

/**
 * Direct X API check for verified status
 * Uses Twitter API v1.1 /users/show endpoint (doesn't require special permissions)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const body = await request.json()
    const { usernames } = body

    if (!usernames || !Array.isArray(usernames)) {
      return NextResponse.json({ error: 'Missing usernames array' }, { status: 400 })
    }

    // Limit to 250 followers per request to fit in 5-minute timeout
    const MAX_PER_REQUEST = 250
    const usernamesToCheck = usernames.slice(0, MAX_PER_REQUEST)
    
    console.log(`[Direct Verify] Checking ${usernamesToCheck.length} of ${usernames.length} users via X API (batch 1)`)

    // Get X tokens
    const tokensDoc = await adminDb.collection('x_tokens').doc(userId).get()
    
    if (!tokensDoc.exists) {
      return NextResponse.json({ 
        error: 'X not connected',
        needsAuth: true
      }, { status: 401 })
    }

    const tokens = tokensDoc.data()
    
    if (!tokens || !tokens.accessToken || !tokens.accessTokenSecret) {
      return NextResponse.json({ 
        error: 'X tokens not found',
        needsAuth: true
      }, { status: 401 })
    }

    // Use Twitter API to check verified status
    const results = []
    let checkedCount = 0
    let verifiedCount = 0
    
    for (const username of usernamesToCheck) {
      try {
        // Call Twitter API v1.1 users/show endpoint with proper OAuth signing
        const response = await XAuth.makeAuthenticatedRequest(
          'https://api.twitter.com/1.1/users/show.json',
          'GET',
          tokens.accessToken,
          tokens.accessTokenSecret,
          { screen_name: username }
        )

        if (response.ok) {
          const userData = await response.json()
          const isVerified = userData.verified || userData.verified_type === 'blue'
          
          results.push({
            username,
            verified: isVerified,
            checked: true
          })
          
          checkedCount++
          if (isVerified) verifiedCount++
          
          // Log progress every 10 users
          if (checkedCount % 10 === 0) {
            console.log(`[Direct Verify] Progress: ${checkedCount}/${usernamesToCheck.length}, Verified: ${verifiedCount}`)
          }
        } else {
          console.error(`[Direct Verify] Error for @${username}: ${response.status}`)
          results.push({
            username,
            verified: false,
            checked: false,
            error: `API error: ${response.status}`
          })
        }
        
        // Rate limit: Wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`[Direct Verify] Exception for @${username}:`, error)
        results.push({
          username,
          verified: false,
          checked: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Update Firestore
    console.log(`[Direct Verify] Updating Firestore with ${results.length} results`)
    const batch = adminDb.batch()
    const followersRef = adminDb.collection('users').doc(userId).collection('followers')
    
    results.forEach(result => {
      if (result.checked) {
        const sanitizedUsername = result.username
          .replace(/^_+|_+$/g, '')
          .replace(/\//g, '_')
          .replace(/\./g, '_') || 'unknown_user'
        
        const docRef = followersRef.doc(sanitizedUsername)
        batch.set(docRef, {
          verified: result.verified,
          verified_checked_at: new Date().toISOString(),
          verified_method: 'twitter_api_direct'
        }, { merge: true })
      }
    })

    await batch.commit()

    console.log(`[Direct Verify] ✅ Complete! ${verifiedCount} verified out of ${checkedCount} checked`)

    const hasMore = usernames.length > MAX_PER_REQUEST
    const remaining = usernames.length - MAX_PER_REQUEST

    return NextResponse.json({
      success: true,
      total: results.length,
      checked: checkedCount,
      verified: verifiedCount,
      failed: results.length - checkedCount,
      hasMore,
      remaining: hasMore ? remaining : 0,
      message: hasMore 
        ? `Checked ${checkedCount}/${usernames.length} followers (${remaining} remaining - click again to continue)`
        : `Checked all ${checkedCount} followers via X API`
    })

  } catch (error) {
    console.error('[Direct Verify] Error:', error)
    return NextResponse.json(
      { 
        error: 'Verification failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
