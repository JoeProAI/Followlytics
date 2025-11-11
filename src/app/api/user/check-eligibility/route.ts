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

    // STEP 2: No data → Get follower count ONLY (don't extract all followers yet!)
    console.log(`[Eligibility] Getting follower count for @${cleanUsername}`)
    
    const { getDataProvider } = await import('@/lib/data-provider')
    const provider = getDataProvider()
    
    // Just get profile info with minimal followers (cheap!)
    const result = await provider.getFollowers(cleanUsername, {
      maxFollowers: 1, // Only extract 1 follower to get the count
      includeDetails: false
    })
    
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Failed to get account info',
        details: result.error 
      }, { status: 500 })
    }
    
    // The actor returns profile data in the first follower object
    // We need the actual follower count from the profile
    const followerCount = result.totalExtracted || result.followers.length
    console.log(`[Eligibility] Account has ${followerCount} followers`)
    
    // Store minimal info (no followers yet - will extract after payment)
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
    
    console.log(`[Eligibility] Stored placeholder for @${cleanUsername}`)

    const { isFree, price, tier } = calculatePricing(followerCount)

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
      price = 20
      tier = '5,000-10,000 followers'
    } else if (followerCount < 20000) {
      price = 35
      tier = '10,000-20,000 followers'
    } else if (followerCount < 50000) {
      price = 50
      tier = '20,000-50,000 followers'
    } else if (followerCount < 100000) {
      price = 100
      tier = '50,000-100,000 followers'
    } else {
      price = 150
      tier = '100,000+ followers'
    }
  }

  return { isFree, price, tier }
}
