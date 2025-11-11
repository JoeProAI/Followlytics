// Check if user qualifies for free export based on their follower count
// Under 500 followers = FREE
// Over 500 followers = PAY
// PUBLIC ENDPOINT - No auth required

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const cleanUsername = username.replace('@', '').toLowerCase()

    // Get their follower count via Apify
    const { ApifyFollowerExtractor } = await import('@/lib/apify-client')
    const apify = new ApifyFollowerExtractor()
    
    const profile = await apify.extractProfile(cleanUsername)
    
    if (!profile) {
      return NextResponse.json({ error: 'Could not find account' }, { status: 404 })
    }

    const followerCount = profile.followersCount || 0
    const isFree = followerCount < 500

    // Calculate pricing
    let price = 0
    let tier = 'FREE (Under 500 followers)'

    if (!isFree) {
      if (followerCount < 1000) {
        price = 5
        tier = '500-1,000 followers'
      } else if (followerCount < 5000) {
        price = 15
        tier = '1,000-5,000 followers'
      } else if (followerCount < 10000) {
        price = 30
        tier = '5,000-10,000 followers'
      } else if (followerCount < 50000) {
        price = 75
        tier = '10,000-50,000 followers'
      } else if (followerCount < 100000) {
        price = 150
        tier = '50,000-100,000 followers'
      } else {
        price = 300
        tier = '100,000+ followers'
      }
    }

    return NextResponse.json({
      username: cleanUsername,
      followerCount,
      isFree,
      price,
      tier,
      message: isFree 
        ? `🎉 FREE! You have ${followerCount} followers - export is on us!`
        : `You have ${followerCount.toLocaleString()} followers. One-time payment of $${price} for unlimited exports.`
    })

  } catch (error: any) {
    console.error('[Eligibility Check] Error:', error)
    return NextResponse.json({
      error: 'Failed to check eligibility',
      details: error.message
    }, { status: 500 })
  }
}
