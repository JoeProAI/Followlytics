import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export const maxDuration = 300 // 5 minutes

/**
 * PUBLIC API ENDPOINT - Monetized Apify Follower Extraction
 * 
 * Usage: POST /api/public/extract-followers
 * Headers: X-API-Key: your_api_key
 * Body: { username: string, maxFollowers?: number }
 * 
 * Pricing: 
 * - $0.20 per 1,000 followers (33% markup over Apify cost)
 * - We charge $0.20, pay Apify $0.15, keep $0.05 profit
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 })
    }

    // Look up API key in database
    const apiKeysRef = adminDb.collection('api_keys')
    const snapshot = await apiKeysRef.where('key', '==', apiKey).where('active', '==', true).limit(1).get()
    
    if (snapshot.empty) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }

    const apiKeyDoc = snapshot.docs[0]
    const apiKeyData = apiKeyDoc.data()
    const userId = apiKeyData.userId

    // Check usage limits
    const today = new Date().toISOString().split('T')[0]
    const usageRef = adminDb.collection('api_usage').doc(`${userId}_${today}`)
    const usageDoc = await usageRef.get()
    const currentUsage = usageDoc.exists ? usageDoc.data()?.requests || 0 : 0
    
    // Limit: 100 requests per day per user
    if (currentUsage >= 100) {
      return NextResponse.json({ 
        error: 'Daily API limit exceeded (100 requests/day)',
        limit: 100,
        used: currentUsage
      }, { status: 429 })
    }

    const { username, maxFollowers = 1000 } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    console.log(`[Public API] Extracting followers for @${username}, max: ${maxFollowers}`)

    // Initialize Apify client
    const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN
    if (!APIFY_API_TOKEN) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
    }

    // Call Apify Actor
    const runInput = {
      user_names: [username],
      user_ids: [],
      maxFollowers: Math.max(maxFollowers, 200),
      maxFollowings: 200,
      getFollowers: true,
      getFollowing: false,
    }

    console.log('[Public API] Starting Apify Actor run...')
    const startResponse = await fetch(
      `https://api.apify.com/v2/acts/kaitoeasyapi~premium-x-follower-scraper-following-data/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runInput)
      }
    )

    if (!startResponse.ok) {
      throw new Error(`Apify API error: ${startResponse.status}`)
    }

    const runData = await startResponse.json()
    const runId = runData.data.id
    const defaultDatasetId = runData.data.defaultDatasetId

    console.log(`[Public API] Actor run started: ${runId}`)

    // Wait for completion
    let status = 'RUNNING'
    let attempts = 0
    const maxAttempts = 60

    while (status === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      const statusResponse = await fetch(
        `https://api.apify.com/v2/acts/kaitoeasyapi~premium-x-follower-scraper-following-data/runs/${runId}?token=${APIFY_API_TOKEN}`
      )

      const statusData = await statusResponse.json()
      status = statusData.data.status
      attempts++

      console.log(`[Public API] Status check ${attempts}: ${status}`)
    }

    if (status !== 'SUCCEEDED') {
      return NextResponse.json({ 
        error: `Extraction failed or timed out. Status: ${status}`,
        runId 
      }, { status: 500 })
    }

    // Fetch results
    console.log(`[Public API] Fetching results from dataset: ${defaultDatasetId}`)
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${APIFY_API_TOKEN}`
    )

    const followers = await datasetResponse.json()
    console.log(`[Public API] Extracted ${followers.length} followers`)

    // Process results
    const processedFollowers = followers.map((follower: any) => ({
      username: follower.screen_name || follower.username,
      name: follower.name,
      bio: follower.description,
      followers_count: follower.followers_count,
      following_count: follower.friends_count,
      verified: follower.verified || false,
      location: follower.location,
    }))

    // Calculate costs
    const apifyCost = (processedFollowers.length / 1000) * 0.15 // Apify charges $0.15 per 1K
    const costPer1K = 2.00
    const customerCost = (processedFollowers.length / 1000) * costPer1K // We charge $2.00 per 1K
    const profit = customerCost - apifyCost

    // Track usage
    await usageRef.set({
      userId,
      date: today,
      requests: currentUsage + 1,
      followers_extracted: (usageDoc.data()?.followers_extracted || 0) + processedFollowers.length,
      revenue: (usageDoc.data()?.revenue || 0) + customerCost,
      cost: (usageDoc.data()?.cost || 0) + apifyCost,
      profit: (usageDoc.data()?.profit || 0) + profit,
    }, { merge: true })

    // Log to api_logs
    await adminDb.collection('api_logs').add({
      userId,
      apiKey: apiKey.substring(0, 10) + '...',
      timestamp: new Date().toISOString(),
      endpoint: '/api/public/extract-followers',
      username: username,
      followers_extracted: processedFollowers.length,
      customer_cost: customerCost,
      apify_cost: apifyCost,
      profit: profit,
      runId: runId,
    })

    return NextResponse.json({
      success: true,
      data: processedFollowers,
      metadata: {
        username: username,
        count: processedFollowers.length,
        cost: customerCost.toFixed(4),
        runId: runId,
      }
    })

  } catch (error: any) {
    console.error('[Public API] Error:', error)
    return NextResponse.json({
      error: 'Failed to extract followers',
      details: error.message,
    }, { status: 500 })
  }
}

// GET endpoint to check API key status
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 })
    }

    const apiKeysRef = adminDb.collection('api_keys')
    const snapshot = await apiKeysRef.where('key', '==', apiKey).limit(1).get()
    
    if (snapshot.empty) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const apiKeyData = snapshot.docs[0].data()
    
    // Get today's usage
    const today = new Date().toISOString().split('T')[0]
    const usageRef = adminDb.collection('api_usage').doc(`${apiKeyData.userId}_${today}`)
    const usageDoc = await usageRef.get()
    const usage = usageDoc.exists ? usageDoc.data() : { requests: 0, followers_extracted: 0, revenue: 0 }
    
    return NextResponse.json({
      active: apiKeyData.active,
      created: apiKeyData.createdAt,
      usage_today: {
        requests: usage?.requests || 0,
        followers_extracted: usage?.followers_extracted || 0,
        revenue: ((usage?.revenue || 0) as number).toFixed(4),
      },
      limits: {
        daily_requests: 100,
        remaining: 100 - (usage?.requests || 0),
      }
    })

  } catch (error: any) {
    console.error('[Public API] Error:', error)
    return NextResponse.json({
      error: 'Failed to check API key status',
      details: error.message,
    }, { status: 500 })
  }
}
