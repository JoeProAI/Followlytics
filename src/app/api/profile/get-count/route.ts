// Quick profile scraper to get EXACT follower count
// Uses Daytona to scrape X profile page and extract follower count
// NO EXTRACTION - just the count for pricing

import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60 // 1 minute max

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const cleanUsername = username.replace('@', '').toLowerCase()
    
    console.log(`[Profile Count] Getting exact follower count for @${cleanUsername}`)

    // Import Daytona client
    const { DaytonaClient } = await import('@/lib/daytona-profile-scraper')
    const client = new DaytonaClient()

    // Quick profile scrape - just get the count!
    const result = await client.getFollowerCount(cleanUsername)

    if (!result.success) {
      return NextResponse.json({
        error: 'Failed to get profile info',
        details: result.error
      }, { status: 500 })
    }

    console.log(`[Profile Count] @${cleanUsername} has EXACTLY ${result.followerCount} followers`)

    return NextResponse.json({
      username: cleanUsername,
      followerCount: result.followerCount,
      verified: result.verified || false,
      name: result.name || cleanUsername,
      bio: result.bio || '',
      success: true
    })

  } catch (error: any) {
    console.error('[Profile Count] Error:', error)
    return NextResponse.json({
      error: 'Failed to get profile count',
      details: error.message
    }, { status: 500 })
  }
}
