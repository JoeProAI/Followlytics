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
      
      // Compare API counts to detect follower changes
      const apiChanged = cachedApiCount !== currentFollowerCount && cachedApiCount > 0
      
      // ALSO check if extracted count is stale (>1% difference from API count)
      const extractedVsApi = cachedCount > 0 ? Math.abs(currentFollowerCount - cachedCount) : 0
      const isStale = extractedVsApi > Math.max(5, currentFollowerCount * 0.01) // More than 1% or 5 followers difference
      
      if (apiChanged) {
        needsExtraction = true
        console.log(`[Eligibility] API count changed: ${cachedApiCount} → ${currentFollowerCount} (${currentFollowerCount - cachedApiCount > 0 ? '+' : ''}${currentFollowerCount - cachedApiCount}) - needs fresh extraction`)
      } else if (isStale) {
        needsExtraction = true
        console.log(`[Eligibility] Cached data is stale (extracted: ${cachedCount}, API: ${currentFollowerCount}, diff: ${extractedVsApi}) - needs fresh extraction`)
      } else {
        needsExtraction = false
        console.log(`[Eligibility] API count unchanged (${currentFollowerCount}) and extracted count fresh (${cachedCount}) - using cache`)
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

    // Always show the Twitter API count (what they actually have)
    // But explain if some are inaccessible
    const hasInaccessible = cachedCount > 0 && cachedCount < currentFollowerCount
    const inaccessibleCount = hasInaccessible ? currentFollowerCount - cachedCount : 0
    
    return NextResponse.json({
      username: cleanUsername,
      followerCount: currentFollowerCount, // Always show real Twitter count
      extractableCount: cachedCount, // How many we can actually get
      isFree,
      price,
      tier,
      needsExtraction,
      status: 'pending_payment',
      message: isFree 
        ? `🎉 You have ${currentFollowerCount.toLocaleString()} followers - FREE download!`
        : needsExtraction
          ? `${currentFollowerCount.toLocaleString()} followers - Pay $${price} to extract (~${Math.floor(currentFollowerCount * 0.99)} accessible accounts).`
          : hasInaccessible
            ? `${currentFollowerCount.toLocaleString()} followers (${cachedCount.toLocaleString()} accessible, ${inaccessibleCount} private/protected) - Pay $${price} to download instantly!`
            : `${currentFollowerCount.toLocaleString()} followers ready - Pay $${price} to download instantly!`
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
    // 🔥 LAUNCH SPECIAL: Flat $2.99 for any account size!
    price = 2.99
    tier = `🔥 Launch Special: $2.99 (normally $4.99+)`
  }

  return { isFree, price, tier }
}
