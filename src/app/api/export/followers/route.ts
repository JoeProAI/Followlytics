// Paid Follower Export Service
// Pay-per-use model: User pays to extract follower list
// Results cached in Firebase for future queries (free reuse)

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 300

// Pricing tiers
const PRICING_TIERS = [
  { min: 0, max: 500, price: 1.00, label: 'Up to 500 followers' },
  { min: 500, max: 1000, price: 3.00, label: '500-1,000 followers' },
  { min: 1000, max: 2000, price: 5.00, label: '1,000-2,000 followers' },
  { min: 2000, max: 5000, price: 10.00, label: '2,000-5,000 followers' },
  { min: 5000, max: 10000, price: 20.00, label: '5,000-10,000 followers' },
  { min: 10000, max: 50000, price: 50.00, label: '10,000-50,000 followers' },
  { min: 50000, max: 100000, price: 100.00, label: '50,000-100,000 followers' },
  { min: 100000, max: Infinity, price: 200.00, label: '100,000+ followers' }
]

function calculatePrice(followerCount: number): { price: number; tier: string } {
  const tier = PRICING_TIERS.find(t => followerCount >= t.min && followerCount < t.max)
  return {
    price: tier?.price || 200.00,
    tier: tier?.label || 'Custom pricing'
  }
}

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

    const { username, action, paymentIntentId } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const cleanUsername = username.replace('@', '').toLowerCase()

    // Action: 'check' - Check if cached and get pricing
    if (action === 'check') {
      // Check if we have cached followers for this username
      const cacheRef = adminDb.collection('follower_cache').doc(cleanUsername)
      const cacheDoc = await cacheRef.get()

      if (cacheDoc.exists) {
        const cacheData = cacheDoc.data()
        const age = Date.now() - cacheData!.cachedAt.toMillis()
        const isRecent = age < 7 * 24 * 60 * 60 * 1000 // 7 days

        if (isRecent) {
          return NextResponse.json({
            cached: true,
            followerCount: cacheData!.followerCount,
            cachedAt: cacheData!.cachedAt.toDate().toISOString(),
            price: 0, // Free for cached data
            message: 'This account was recently extracted. Export is FREE!'
          })
        }
      }

      // Not cached - need to extract and charge
      // First get follower count estimate
      try {
        const { FollowerExtractor } = await import('@/lib/follower-extractor')
        const extractor = new FollowerExtractor()
        
        // Get profile to estimate follower count
        const profile = await extractor.extractProfile(cleanUsername)
        const followerCount = profile?.followersCount || 0

        const { price, tier } = calculatePrice(followerCount)

        return NextResponse.json({
          cached: false,
          followerCount,
          estimatedFollowers: followerCount,
          price,
          tier,
          message: `This account has ~${followerCount.toLocaleString()} followers. Extraction will cost $${price.toFixed(2)}.`
        })
      } catch (error: any) {
        return NextResponse.json({
          error: 'Could not estimate follower count',
          details: error.message
        }, { status: 500 })
      }
    }

    // Action: 'extract' - Perform extraction (after payment)
    if (action === 'extract') {
      if (!paymentIntentId) {
        return NextResponse.json({ error: 'Payment required' }, { status: 402 })
      }

      // Verify payment with Stripe
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json({ error: 'Payment not completed' }, { status: 402 })
      }

      const exportId = uuidv4()
      const exportRef = adminDb.collection('users').doc(userId).collection('follower_exports').doc(exportId)

      // Check if user already has this data from dashboard
      console.log(`[Export] Checking for existing followers for @${cleanUsername}`)
      const storedFollowersSnapshot = await adminDb
        .collection('users')
        .doc(userId)
        .collection('followers')
        .where('target_username', '==', cleanUsername)
        .where('status', '==', 'active')
        .get()

      if (!storedFollowersSnapshot.empty) {
        // User already has this data - use it instantly!
        console.log(`[Export] Found ${storedFollowersSnapshot.size} stored followers, using existing data`)
        
        const followers = storedFollowersSnapshot.docs.map(doc => doc.data())
        
        // Create export record (without followers array to avoid 1MB limit)
        await exportRef.set({
          exportId,
          userId,
          username: cleanUsername,
          status: 'completed',
          paymentIntentId,
          amountPaid: paymentIntent.amount / 100,
          createdAt: new Date(),
          completedAt: new Date(),
          followerCount: followers.length
        })

        // Store followers in SUBCOLLECTION to avoid document size limit
        // Process in batches of 500 (Firestore limit)
        const batchSize = 500
        for (let i = 0; i < followers.length; i += batchSize) {
          const batch = adminDb.batch()
          const chunk = followers.slice(i, i + batchSize)
          chunk.forEach((follower: any, chunkIndex: number) => {
            // Use index-based IDs to avoid reserved characters in usernames
            const docId = `f_${i + chunkIndex}`
            const followerRef = exportRef.collection('followers').doc(docId)
            batch.set(followerRef, follower)
          })
          await batch.commit()
        }

        console.log(`[Export] Export ready instantly with ${followers.length} followers in subcollection`)

        return NextResponse.json({
          success: true,
          exportId,
          message: 'Export ready',
          ready: true,
          followerCount: followers.length
        })
      }

      // No stored data - need to extract
      console.log(`[Export] No stored data found, starting fresh extraction`)
      await exportRef.set({
        exportId,
        userId,
        username: cleanUsername,
        status: 'extracting',
        paymentIntentId,
        amountPaid: paymentIntent.amount / 100,
        createdAt: new Date(),
        progress: {
          phase: 'extracting',
          percentage: 0,
          message: 'Starting follower extraction...'
        }
      })

      // Start extraction in background
      extractAndCacheFollowers(userId, cleanUsername, exportId).catch((err: any) => {
        console.error('[Follower Export] Extraction failed:', err)
      })

      return NextResponse.json({
        success: true,
        exportId,
        message: 'Follower extraction started',
        estimatedTime: '2-5 minutes'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('[Follower Export] Error:', error)
    return NextResponse.json({
      error: 'Failed to process export request',
      details: error.message
    }, { status: 500 })
  }
}

// Background extraction function
async function extractAndCacheFollowers(userId: string, username: string, exportId: string) {
  const exportRef = adminDb.collection('users').doc(userId).collection('follower_exports').doc(exportId)
  
  try {
    console.log(`[Follower Export] Extracting followers for @${username}...`)
    
    const { FollowerExtractor } = await import('@/lib/follower-extractor')
    const extractor = new FollowerExtractor()

    // Extract followers
    const result = await extractor.extractFollowers(username, {
      maxFollowers: 100000, // Max extraction
      includeDetails: true
    })

    if (!result.success || result.followers.length === 0) {
      throw new Error(result.error || 'No followers extracted')
    }

    console.log(`[Follower Export] Extracted ${result.followers.length} followers`)

    // Store in cache
    const cacheRef = adminDb.collection('follower_cache').doc(username)
    await cacheRef.set({
      username,
      followerCount: result.followers.length,
      followers: result.followers,
      cachedAt: new Date(),
      lastExtractedBy: userId
    })

    // Update export record (without followers array)
    await exportRef.update({
      status: 'completed',
      followerCount: result.followers.length,
      completedAt: new Date(),
      progress: {
        phase: 'completed',
        percentage: 100,
        message: 'Extraction complete! Ready to export.'
      }
    })

    // Store followers in subcollection (batches of 500)
    const batchSize = 500
    for (let i = 0; i < result.followers.length; i += batchSize) {
      const batch = adminDb.batch()
      const chunk = result.followers.slice(i, i + batchSize)
      chunk.forEach((follower: any, chunkIndex: number) => {
        // Use index-based IDs to avoid reserved characters
        const docId = `f_${i + chunkIndex}`
        const followerRef = exportRef.collection('followers').doc(docId)
        batch.set(followerRef, follower)
      })
      await batch.commit()
    }

    console.log(`[Follower Export] Export ${exportId} completed with ${result.followers.length} followers in subcollection`)

  } catch (error: any) {
    console.error('[Follower Export] Extraction failed:', error)
    
    await exportRef.update({
      status: 'failed',
      error: error.message,
      failedAt: new Date()
    })
  }
}

// Get export status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { searchParams } = new URL(request.url)
    const exportId = searchParams.get('exportId')

    if (!exportId) {
      return NextResponse.json({ error: 'Export ID required' }, { status: 400 })
    }

    const exportDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('follower_exports')
      .doc(exportId)
      .get()

    if (!exportDoc.exists) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 })
    }

    const exportData = exportDoc.data()

    return NextResponse.json({
      exportId,
      username: exportData!.username,
      status: exportData!.status,
      followerCount: exportData!.followerCount,
      progress: exportData!.progress,
      createdAt: exportData!.createdAt?.toDate?.().toISOString(),
      completedAt: exportData!.completedAt?.toDate?.().toISOString(),
      error: exportData!.error
    })

  } catch (error: any) {
    console.error('[Follower Export] Status check failed:', error)
    return NextResponse.json({
      error: 'Failed to get export status',
      details: error.message
    }, { status: 500 })
  }
}
