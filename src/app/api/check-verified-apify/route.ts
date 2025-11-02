import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const maxDuration = 300 // 5 minutes - should be enough for ~800 followers

/**
 * Check verified status using Apify Twitter scraper
 * No Twitter API needed - scrapes public profiles!
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

    const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN
    if (!APIFY_API_TOKEN) {
      return NextResponse.json({ error: 'Apify not configured' }, { status: 500 })
    }

    // Check ALL followers at once
    const usernamesToCheck = usernames
    
    console.log(`[Apify Verify] Checking ALL ${usernamesToCheck.length} users`)

    // Build profile URLs for each username
    const profileUrls = usernamesToCheck.map(username => `https://x.com/${username}`)
    
    // Start Apify Actor run (pay-per-result model: $0.2 per 1K)
    console.log('[Apify Verify] Starting Apify Actor run...')
    const actorInput = {
      startUrls: profileUrls,
      maxItems: usernamesToCheck.length
    }

    // Run Actor synchronously and get results
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/fastcrawler~tweet-x-twitter-scraper-0-2-1k-pay-per-result-v2/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(actorInput)
      }
    )

    if (!runResponse.ok) {
      const errorText = await runResponse.text()
      console.error('[Apify Verify] Actor run failed:', runResponse.status, errorText)
      throw new Error(`Apify Actor failed: ${runResponse.status}`)
    }

    const profiles = await runResponse.json()
    console.log(`[Apify Verify] Got ${profiles.length} profiles from Apify`)

    // Log first profile structure for debugging
    if (profiles.length > 0) {
      console.log('[Apify Verify] Sample profile structure:', JSON.stringify(profiles[0], null, 2))
    }

    // Process results
    const results = []
    let checkedCount = 0
    let verifiedCount = 0

    for (const item of profiles) {
      // This actor returns author info with verified status
      const author = item.author || item.user
      if (!author) {
        console.log('[Apify Verify] Item missing author data:', JSON.stringify(item).substring(0, 200))
        continue
      }
      
      const username = author.userName || author.screen_name || author.username
      const isVerified = author.isBlueVerified || author.verified || author.blue_verified || false
      
      results.push({
        username,
        verified: isVerified,
        checked: true
      })
      
      checkedCount++
      if (isVerified) verifiedCount++
      
      // Log every 50 users + verified users
      if (checkedCount % 50 === 0 || isVerified) {
        console.log(`[Apify Verify] Progress: ${checkedCount}/${profiles.length} | Verified so far: ${verifiedCount} | Latest: @${username} ${isVerified ? '✓ VERIFIED' : ''}`)
      }
    }

    // Add any usernames that weren't returned (failed to scrape)
    const scrapedUsernames = new Set(profiles.map((p: any) => {
      const author = p.author || p.user
      return author?.userName || author?.screen_name || author?.username
    }).filter(Boolean))
    
    for (const username of usernamesToCheck) {
      if (!scrapedUsernames.has(username)) {
        console.log(`[Apify Verify] @${username}: NOT FOUND (suspended/deleted?)`)
        results.push({
          username,
          verified: false,
          checked: false,
          error: 'Profile not found or inaccessible'
        })
      }
    }

    // Update Firestore with verified status
    console.log(`[Apify Verify] Updating Firestore with ${results.length} results`)
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
          verified_method: 'apify_scraper'
        }, { merge: true })
      }
    })

    await batch.commit()

    console.log(`[Apify Verify] ✅ Complete! ${verifiedCount} verified out of ${checkedCount} checked`)

    return NextResponse.json({
      success: true,
      total: results.length,
      checked: checkedCount,
      verified: verifiedCount,
      failed: results.length - checkedCount,
      hasMore: false,
      remaining: 0,
      message: `✅ Checked all ${checkedCount} followers. ${verifiedCount} verified!`
    })

  } catch (error) {
    console.error('[Apify Verify] Error:', error)
    return NextResponse.json(
      { 
        error: 'Verification failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
