// SMART CHECK: Check database first, extract if needed
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

      if (isRecent) {
        const followerCount = data.profile.followersCount || 0
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
          } else if (followerCount < 250000) {
            price = 150
            tier = '100,000-250,000 followers'
          } else {
            price = 200
            tier = '250,000+ followers'
          }
        }

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

    // STEP 2: Not cached or too old → Get profile and start extraction
    const { getDataProvider } = await import('@/lib/data-provider')
    const provider = getDataProvider()
    
    const profile = await provider.getUserProfile(cleanUsername)
    
    if (!profile) {
      return NextResponse.json({ error: 'Could not find account' }, { status: 404 })
    }

    const followerCount = profile.followersCount || 0
    const isFree = followerCount < 500

    // Calculate pricing - AGGRESSIVE for bread & butter (20K-50K)
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
        price = 50  // BREAD & BUTTER - super competitive
        tier = '20,000-50,000 followers'
      } else if (followerCount < 100000) {
        price = 100
        tier = '50,000-100,000 followers'
      } else if (followerCount < 250000) {
        price = 150
        tier = '100,000-250,000 followers'
      } else {
        price = 200  // Beat CircleBoom pricing
        tier = '250,000+ followers'
      }
    }

    // STEP 3: Start extraction in background (handles ANY size automatically with chunking)
    startBackgroundExtraction(cleanUsername, profile, price).catch((err: any) => {
      console.error('[Smart Extract] Background extraction failed:', err)
    })

    return NextResponse.json({
      username: cleanUsername,
      followerCount,
      isFree,
      price,
      tier,
      status: 'extracting',
      estimatedTime: estimateExtractionTime(followerCount),
      message: isFree 
        ? `🎉 Extracting your ${followerCount} followers... This is FREE!`
        : `⏳ Extracting ${followerCount.toLocaleString()} followers... (${estimateExtractionTime(followerCount)}). Pay $${price} when ready.`
    })

  } catch (error: any) {
    console.error('[Eligibility Check] Error:', error)
    return NextResponse.json({
      error: 'Failed to check eligibility',
      details: error.message
    }, { status: 500 })
  }
}

// Background extraction (don't wait for this)
async function startBackgroundExtraction(username: string, profile: any, price: number) {
  try {
    console.log(`[Smart Extract] Starting background extraction for @${username}`)
    
    const { getDataProvider } = await import('@/lib/data-provider')
    const provider = getDataProvider()
    
    // Extract ALL followers
    const result = await provider.getFollowers(username, {
      maxFollowers: 1000000, // No limit
      includeDetails: true
    })
    
    if (!result.success) {
      console.error(`[Smart Extract] Extraction failed for @${username}:`, result.error)
      return
    }
    
    console.log(`[Smart Extract] Extracted ${result.followers.length} followers for @${username}`)
    
    // Store in central database
    await adminDb.collection('follower_database').doc(username).set({
      username,
      profile: {
        name: profile.name,
        bio: profile.bio,
        followersCount: profile.followersCount,
        followingCount: profile.followingCount,
        verified: profile.verified,
        location: profile.location,
        profileImageUrl: profile.profileImageUrl
      },
      followers: result.followers,
      lastExtractedAt: new Date(),
      extractionHistory: [{
        extractedAt: new Date(),
        extractedBy: 'system',
        followerCount: result.followers.length,
        cost: estimateDataCost(result.followers.length),
        tier: price
      }],
      totalRequests: 1,
      accessGranted: [] // No one has paid yet
    })
    
    console.log(`[Smart Extract] Stored ${result.followers.length} followers in database for @${username}`)
    
  } catch (error: any) {
    console.error(`[Smart Extract] Background extraction error for @${username}:`, error)
  }
}

// Estimate extraction time (with chunked extraction)
function estimateExtractionTime(followerCount: number): string {
  if (followerCount < 1000) return '1-2 min'
  if (followerCount < 5000) return '2-5 min'
  if (followerCount < 10000) return '5-10 min'
  if (followerCount < 50000) return '10-20 min'
  if (followerCount < 100000) return '20-40 min'
  if (followerCount < 200000) return '40-60 min'
  if (followerCount < 500000) return '1-2 hours (chunked)'
  if (followerCount < 1000000) return '2-4 hours (chunked)'
  return '4-8 hours (large account)'
}

// Estimate data extraction cost
function estimateDataCost(followerCount: number): number {
  // Internal cost calculation
  return (followerCount / 1000) * 0.15
}
