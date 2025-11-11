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

    // STEP 2: No data or too old → Extract NOW
    console.log(`[Eligibility] Extracting for @${cleanUsername}`)
    
    const { getDataProvider } = await import('@/lib/data-provider')
    const provider = getDataProvider()
    
    const result = await provider.getFollowers(cleanUsername, {
      maxFollowers: 10000,
      includeDetails: true
    })
    
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Failed to extract followers',
        details: result.error 
      }, { status: 500 })
    }
    
    const followerCount = result.followers.length
    console.log(`[Eligibility] Extracted ${followerCount} followers, storing`)
    
    // Store in database
    await adminDb.collection('follower_database').doc(cleanUsername).set({
      username: cleanUsername,
      followers: result.followers,
      followerCount,
      lastExtractedAt: new Date(),
      extractedBy: 'check-eligibility',
      accessGranted: [],
      extractionProgress: {
        status: 'complete',
        message: 'Ready to download',
        percentage: 100
      }
    })
    
    console.log(`[Eligibility] Stored for @${cleanUsername}`)

    const { isFree, price, tier } = calculatePricing(followerCount)

    return NextResponse.json({
      username: cleanUsername,
      followerCount,
      isFree,
      price,
      tier,
      status: 'ready',
      message: isFree 
        ? `🎉 ${followerCount} followers extracted - FREE download!`
        : `✅ ${followerCount} followers extracted - Pay $${price} to download.`
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
    } else {
      price = 35
      tier = '10,000+ followers'
    }
  }

  return { isFree, price, tier }
}
