// Apify-based follower extraction
// Safe approach: Apify handles scraping, we just use their API
// Legal buffer: ToS violations happen on Apify's side, not ours

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { getExtractorClient } from '@/lib/follower-extractor'
import { checkCredits, deductCredits } from '@/lib/credits'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 300 // 5 minutes for Apify extraction

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get request body
    const { username, maxFollowers } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    console.log(`[Apify Scan] Starting extraction for @${username}`)
    console.log(`[Apify Scan] User: ${userId}, Max followers: ${maxFollowers || 1000}`)

    // Check credit balance
    const hasCredits = await checkCredits(userId, 'followers', maxFollowers || 1000)
    if (!hasCredits) {
      return NextResponse.json({
        error: 'Insufficient follower credits',
        details: 'You have exceeded your monthly follower limit. Please upgrade your plan or wait for next billing cycle.'
      }, { status: 402 })
    }

    // Create scan record
    const scanId = uuidv4()
    const scanRef = adminDb.collection('users').doc(userId).collection('scans').doc(scanId)
    
    await scanRef.set({
      scanId,
      userId,
      username: username.toLowerCase(),
      status: 'extracting',
      method: 'apify',
      createdAt: new Date(),
      maxFollowers: maxFollowers || 1000,
      progress: {
        phase: 'initializing',
        percentage: 0,
        message: 'Starting Apify extraction...'
      }
    })

    // Start Apify extraction in background
    extractFollowersWithApify(userId, username, maxFollowers || 1000, scanId).catch(err => {
      console.error('[Apify Scan] Background extraction failed:', err)
    })

    return NextResponse.json({
      success: true,
      scanId,
      message: 'Follower extraction started via Apify',
      estimatedTime: '2-5 minutes'
    })

  } catch (error: any) {
    console.error('[Apify Scan] Error:', error)
    return NextResponse.json({
      error: 'Failed to start follower extraction',
      details: error.message
    }, { status: 500 })
  }
}

// Background extraction function
async function extractFollowersWithApify(
  userId: string,
  username: string,
  maxFollowers: number,
  scanId: string
) {
  const scanRef = adminDb.collection('users').doc(userId).collection('scans').doc(scanId)
  
  try {
    // Update progress
    await scanRef.update({
      progress: {
        phase: 'extracting',
        percentage: 10,
        message: 'Apify extraction in progress...'
      }
    })

    // Use Apify client
    const apify = getExtractorClient()
    
    console.log(`[Apify] Extracting followers for @${username}...`)
    
    const result = await apify.extractFollowers(username, {
      maxFollowers,
      includeDetails: true
    })

    if (!result.success) {
      throw new Error(result.error || 'Apify extraction failed')
    }

    console.log(`[Apify] Extracted ${result.followers.length} followers`)

    // Update progress
    await scanRef.update({
      progress: {
        phase: 'storing',
        percentage: 70,
        message: `Storing ${result.followers.length} followers...`
      }
    })

    // Store followers in database
    const batch = adminDb.batch()
    const followersRef = adminDb.collection('users').doc(userId).collection('followers')
    const now = new Date()

    // Check existing followers for unfollower detection
    const existingFollowersSnapshot = await followersRef
      .where('target_username', '==', username.toLowerCase())
      .get()

    const existingFollowers = new Set(
      existingFollowersSnapshot.docs.map(doc => doc.data().username)
    )

    for (const follower of result.followers) {
      const followerDoc = followersRef.doc(follower.username)
      const isExisting = existingFollowers.has(follower.username)

      const followerData: any = {
        username: follower.username,
        name: follower.name,
        bio: follower.bio || '',
        verified: follower.verified || false,
        followersCount: follower.followersCount || 0,
        followingCount: follower.followingCount || 0,
        profileImageUrl: follower.profileImageUrl || '',
        location: follower.location || '',
        target_username: username.toLowerCase(),
        scan_id: scanId,
        extraction_method: 'apify',
        extracted_at: now,
        last_seen: now,
        status: 'active'
      }

      // Only set first_seen for NEW followers
      if (!isExisting) {
        followerData.first_seen = now
      }

      batch.set(followerDoc, followerData, { merge: true })
    }

    await batch.commit()

    console.log(`[Apify] Stored ${result.followers.length} followers to database`)

    // Deduct credits
    await deductCredits(userId, 'followers', result.totalExtracted, {
      description: `Apify extraction for @${username}`,
      endpoint: '/api/scan/apify',
      username
    })

    // Mark scan as completed
    await scanRef.update({
      status: 'completed',
      completedAt: new Date(),
      followersExtracted: result.totalExtracted,
      progress: {
        phase: 'completed',
        percentage: 100,
        message: `✅ Extracted ${result.totalExtracted} followers successfully`
      }
    })

    console.log(`[Apify] Scan ${scanId} completed successfully`)

  } catch (error: any) {
    console.error('[Apify] Extraction error:', error)

    await scanRef.update({
      status: 'failed',
      error: error.message,
      failedAt: new Date(),
      progress: {
        phase: 'failed',
        percentage: 0,
        message: `❌ Extraction failed: ${error.message}`
      }
    })
  }
}
