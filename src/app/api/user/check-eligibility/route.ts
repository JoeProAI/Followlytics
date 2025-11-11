// SIMPLE LOGIC: Check database first, extract if needed, return price
// Under 500 followers = FREE
// Over 500 followers = PAY
// PUBLIC ENDPOINT - No auth required

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const cleanUsername = username.replace('@', '').toLowerCase()

    // STEP 1: Check if we already have this data
    const cachedRef = adminDb.collection('follower_database').doc(cleanUsername)
    const cached = await cachedRef.get()

    if (cached.exists) {
      const data = cached.data()!
      const age = Date.now() - data.lastExtractedAt?.toMillis()
      const isRecent = age < 30 * 24 * 60 * 60 * 1000 // 30 days

      if (isRecent && data.followers && data.followers.length > 0) {
        const followerCount = data.followers.length
        const { isFree, price, tier } = calculatePricing(followerCount)

        return NextResponse.json({
          username: cleanUsername,
          followerCount,
          isFree,
          price,
          tier,
          status: 'ready',
          extractedAt: data.lastExtractedAt?.toDate().toISOString(),
          message: isFree 
            ? `🎉 Already extracted! You have ${followerCount} followers - export is FREE!`
            : `✅ Already extracted! ${followerCount.toLocaleString()} followers ready. Pay $${price} to download.`
        })
      }
    }

    // STEP 2: No data → Get EXACT follower count with Daytona profile scraper
    console.log(`[Eligibility] Getting EXACT follower count for @${cleanUsername}`)
    
    // Set initial status
    await adminDb.collection('price_check_status').doc(cleanUsername).set({
      status: 'scraping',
      message: 'Creating sandbox...',
      progress: 10,
      startedAt: new Date()
    })
    
    const { DaytonaClient } = await import('@/lib/daytona-profile-scraper')
    const client = new DaytonaClient()
    
    // Update status: running scraper
    await adminDb.collection('price_check_status').doc(cleanUsername).update({
      message: 'Scraping profile page...',
      progress: 50
    })
    
    // Quick profile scrape - get exact follower count in ~15 seconds
    const profileResult = await client.getFollowerCount(cleanUsername)
    
    if (!profileResult.success) {
      // Update status: failed
      await adminDb.collection('price_check_status').doc(cleanUsername).update({
        status: 'failed',
        message: 'Account not found or private',
        error: profileResult.error,
        progress: 100
      })
      
      return NextResponse.json({ 
        error: 'Account not found or private',
        details: profileResult.error || 'Unable to access profile'
      }, { status: 404 })
    }
    
    const followerCount = profileResult.followerCount || 0
    
    console.log(`[Eligibility] @${cleanUsername} has EXACTLY ${followerCount} followers`)
    
    // Update status: analyzing
    await adminDb.collection('price_check_status').doc(cleanUsername).update({
      message: 'Calculating pricing...',
      progress: 80,
      followerCount: followerCount
    })
    
    // Store in X database for analytics
    const { xDatabase } = await import('@/lib/firebase-x-database')
    await xDatabase.upsertProfile(cleanUsername, {
      displayName: profileResult.name || cleanUsername,
      followerCount: followerCount,
      verified: profileResult.verified || false,
      bio: profileResult.bio || '',
      botScore: 0,
      botFlags: [],
      isLikelyBot: false
    })
    
    // Store minimal info in follower_database (for extraction workflow)
    await adminDb.collection('follower_database').doc(cleanUsername).set({
      username: cleanUsername,
      followers: [], // Empty - will extract after payment
      followerCount: followerCount,
      lastCheckedAt: new Date(),
      extractedBy: 'pending-payment',
      accessGranted: [],
      extractionProgress: {
        status: 'pending',
        message: 'Awaiting payment',
        percentage: 0
      }
    })
    
    console.log(`[Eligibility] Stored profile in X database and follower_database`)

    const { isFree, price, tier } = calculatePricing(followerCount)

    // Update status: complete
    await adminDb.collection('price_check_status').doc(cleanUsername).update({
      status: 'complete',
      message: 'Ready for download',
      progress: 100,
      price: price,
      isFree: isFree,
      tier: tier,
      completedAt: new Date()
    })

    return NextResponse.json({
      username: cleanUsername,
      followerCount,
      isFree,
      price,
      tier,
      status: 'pending_payment',
      message: isFree 
        ? `🎉 You have ${followerCount} followers - FREE download!`
        : `💰 ${followerCount.toLocaleString()} followers found - Pay $${price} to extract and download.`
    })

  } catch (error: any) {
    console.error('[Eligibility Check] Error:', error)
    
    // Update status: error
    try {
      const cleanUsername = (error.username || '').replace('@', '').toLowerCase()
      if (cleanUsername) {
        await adminDb.collection('price_check_status').doc(cleanUsername).update({
          status: 'failed',
          message: 'An error occurred',
          error: error.message,
          progress: 100
        })
      }
    } catch (statusError) {
      console.error('[Eligibility] Failed to update error status:', statusError)
    }
    
    return NextResponse.json({
      error: 'Failed to check eligibility',
      details: error.message
    }, { status: 500 })
  }
}

function calculatePricing(followerCount: number) {
  const isFree = followerCount < 500
  let price = 0
  let tier = 'FREE (Under 500 followers)'

  if (!isFree) {
    if (followerCount < 2000) {
      price = 5
      tier = '500-2,000 followers'
    } else if (followerCount < 5000) {
      price = 10
      tier = '2,000-5,000 followers'
    } else if (followerCount < 10000) {
      price = 15
      tier = '5,000-10,000 followers'
    } else if (followerCount < 50000) {
      price = 20
      tier = '10,000-50,000 followers'
    } else if (followerCount < 100000) {
      price = 50
      tier = '50,000-100,000 followers'
    } else {
      price = 100
      tier = '100,000+ followers'
    }
  }

  return { isFree, price, tier }
}
