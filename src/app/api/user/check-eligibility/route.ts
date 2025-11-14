// SIMPLE LOGIC: Check database first, extract if needed, return price
// Under 500 followers = FREE
// Over 500 followers = PAY
// PUBLIC ENDPOINT - No auth required

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

// Allow up to 2 minutes for eligibility check (max 500 followers)
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const cleanUsername = username.replace('@', '').toLowerCase()

    // STEP 1: ALWAYS get current follower count (fast check)
    console.log(`[Eligibility] Getting current follower count for @${cleanUsername}`)
    
    // Set initial status
    await adminDb.collection('price_check_status').doc(cleanUsername).set({
      status: 'analyzing',
      message: 'Checking account...',
      progress: 10,
      startedAt: new Date()
    })
    
    const { getDataProvider } = await import('@/lib/data-provider')
    const provider = getDataProvider()
    
    // Update status: getting profile data
    await adminDb.collection('price_check_status').doc(cleanUsername).update({
      message: 'Fetching follower count...',
      progress: 50
    })
    
    // Use Apify - returns EXACT follower count (~10s, $0.05)
    const profile = await provider.getUserProfile(cleanUsername)
    
    if (!profile) {
      // Update status: failed
      await adminDb.collection('price_check_status').doc(cleanUsername).update({
        status: 'failed',
        message: 'Account not found or private',
        error: 'Profile not found',
        progress: 100
      })
      
      return NextResponse.json({ 
        error: 'Account not found or private',
        details: 'This X account does not exist, is private, or is suspended'
      }, { status: 404 })
    }
    
    const currentFollowerCount = profile.followersCount || 0
    
    console.log(`[Eligibility] @${cleanUsername} currently has ${currentFollowerCount} followers`)
    
    // STEP 2: Check if we have cached data with same follower count
    const cachedRef = adminDb.collection('follower_database').doc(cleanUsername)
    const cached = await cachedRef.get()
    let needsExtraction = true
    let cachedCount = 0
    let cachedApiCount = 0
    
    if (cached.exists) {
      const data = cached.data()!
      cachedCount = data.followerCount || 0 // Actual extracted count
      cachedApiCount = data.apiFollowerCount || 0 // What API said last time
      
      // Compare API counts (not extracted counts) to detect real changes
      // This handles the 805 API vs 800 extracted discrepancy
      if (cachedApiCount === currentFollowerCount && cachedApiCount > 0) {
        needsExtraction = false
        console.log(`[Eligibility] API count unchanged (${currentFollowerCount}) - using cached ${cachedCount} extracted followers`)
      } else {
        console.log(`[Eligibility] API count changed: ${cachedApiCount} → ${currentFollowerCount} (${currentFollowerCount - cachedApiCount > 0 ? '+' : ''}${currentFollowerCount - cachedApiCount}) - needs fresh extraction`)
      }
    } else {
      console.log(`[Eligibility] No cached data - needs extraction`)
    }
    
    // Update status: analyzing
    await adminDb.collection('price_check_status').doc(cleanUsername).update({
      message: needsExtraction ? 'New followers detected - extraction needed' : 'Data up to date!',
      progress: 80,
      followerCount: currentFollowerCount,
      needsExtraction: needsExtraction
    })
    
    // Store in X database for analytics
    const { xDatabase } = await import('@/lib/firebase-x-database')
    await xDatabase.upsertProfile(cleanUsername, {
      displayName: profile.name || cleanUsername,
      followerCount: currentFollowerCount,
      verified: profile.verified || false,
      bio: profile.bio || '',
      location: '',  // Prevent undefined error
      website: '',   // Prevent undefined error
      profileImageUrl: '',  // Prevent undefined error
      botScore: 0,
      botFlags: [],
      isLikelyBot: false
    })
    
    // Store minimal info in follower_database (for extraction workflow)
    await adminDb.collection('follower_database').doc(cleanUsername).set({
      username: cleanUsername,
      followers: [], // Empty - will extract after payment
      apiFollowerCount: currentFollowerCount, // What Twitter API says (805)
      followerCount: needsExtraction ? 0 : cachedCount, // What we actually extracted (800) - only set if not extracting
      lastCheckedAt: new Date(),
      extractedBy: 'pending-payment',
      accessGranted: [],
      extractionProgress: {
        status: needsExtraction ? 'pending' : 'complete',
        message: needsExtraction ? 'Awaiting payment - will extract' : 'Ready to use cached data',
        percentage: needsExtraction ? 0 : 100
      },
      needsExtraction: needsExtraction
    }, { merge: true }) // Merge to preserve existing data if count matches
    
    console.log(`[Eligibility] Stored profile in X database and follower_database`)

    const { isFree, price, tier } = calculatePricing(currentFollowerCount)

    // Update status: complete
    await adminDb.collection('price_check_status').doc(cleanUsername).update({
      status: 'complete',
      message: needsExtraction ? 'Ready for extraction' : 'Ready with cached data',
      progress: 100,
      price: price,
      isFree: isFree,
      tier: tier,
      needsExtraction: needsExtraction,
      completedAt: new Date()
    })

    // Use the actual count they'll receive (extracted if available, API if needs extraction)
    const displayCount = needsExtraction ? currentFollowerCount : cachedCount
    
    return NextResponse.json({
      username: cleanUsername,
      followerCount: displayCount, // Show the count they'll actually get
      isFree,
      price,
      tier,
      needsExtraction,
      status: 'pending_payment',
      message: isFree 
        ? `🎉 You have ${displayCount.toLocaleString()} followers - FREE download!`
        : needsExtraction
          ? `💰 ${currentFollowerCount.toLocaleString()} followers detected - Pay $${price} to extract and download.`
          : `💰 ${displayCount.toLocaleString()} followers ready - Pay $${price} to download instantly!`
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
