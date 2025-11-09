import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { DaytonaSandboxManager, SandboxConfig } from '@/lib/daytona-client'
import { v4 as uuidv4 } from 'uuid'
import { checkCredits, deductCredits, getCreditBalances } from '@/lib/credits'
import { getTierConfig } from '@/config/tiers'

// Set maximum duration to 10 minutes for follower scanning
export const maxDuration = 600

export async function POST(request: NextRequest) {
  try {
    // Check environment variables first
    const requiredEnvVars = [
      'DAYTONA_API_KEY',
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY'
    ]
    
    console.log('Environment variable check:', {
      DAYTONA_API_KEY: !!process.env.DAYTONA_API_KEY,
      DAYTONA_API_URL: !!process.env.DAYTONA_API_URL,
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY
    })
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars)
      return NextResponse.json({ 
        error: 'Server configuration error', 
        details: `Missing environment variables: ${missingVars.join(', ')}` 
      }, { status: 500 })
    }

    // Verify user authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get request body
    const { xUsername } = await request.json()

    if (!xUsername) {
      return NextResponse.json({ error: 'X username is required' }, { status: 400 })
    }

    // Check if user has X connected
    const userDoc = await adminDb.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()
    if (!userData?.xConnected) {
      return NextResponse.json({ error: 'X account not connected' }, { status: 400 })
    }

    // Check user's credit balance for follower extraction
    console.log('Checking credit balance for user:', userId)
    const credits = await getCreditBalances(userId)
    const tier = userData.subscription?.tier || 'beta'
    const tierConfig = getTierConfig(tier)
    
    // Estimate follower count (we'll deduct actual amount after extraction)
    // For now, show available credits and tier limits
    console.log(`User has ${credits.followers.available} follower credits available (Tier: ${tier})`)
    
    if (credits.followers.available <= 0) {
      return NextResponse.json({ 
        error: 'Insufficient follower credits',
        details: `You have 0 follower credits remaining. Your ${tier} plan includes ${tierConfig.credits.followers.toLocaleString()} followers per month. Please wait for your next billing cycle or upgrade your plan.`,
        available: credits.followers.available,
        tier: tier,
        upgrade_url: '/pricing'
      }, { status: 402 })
    }

    // Generate unique session ID for this scan
    const sessionId = uuidv4()

    const scanDoc = await adminDb.collection('follower_scans').add({
      userId,
      xUsername,
      sessionId,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      followers: [],
      followerCount: 0,
      sandboxId: null,
    })

    const scanId = scanDoc.id

    // Start the scanning process asynchronously
    try {
      console.log('Starting follower scan process for user:', userId)
      
      // Get user's OAuth tokens from x_tokens collection
      console.log('Retrieving OAuth tokens from x_tokens collection...')
      const xTokensDoc = await adminDb.collection('x_tokens').doc(userId).get()
      if (!xTokensDoc.exists) {
        console.error('No OAuth tokens found for user:', userId)
        throw new Error('Twitter OAuth tokens not found. Please re-authorize Twitter access.')
      }

      const tokenData = xTokensDoc.data()
      const oauthTokens = {
        accessToken: tokenData?.accessToken,
        accessTokenSecret: tokenData?.accessTokenSecret
      }

      console.log('OAuth tokens retrieved:', {
        hasAccessToken: !!oauthTokens.accessToken,
        hasAccessTokenSecret: !!oauthTokens.accessTokenSecret
      })

      if (!oauthTokens.accessToken || !oauthTokens.accessTokenSecret) {
        console.error('Invalid OAuth tokens:', oauthTokens)
        throw new Error('Invalid Twitter OAuth tokens. Please re-authorize Twitter access.')
      }

      // Create sandbox configuration
      console.log('Creating sandbox configuration...')
      const config = {
        name: `follower-scan-${sessionId}`,
        repository: 'https://github.com/microsoft/vscode-dev-containers',
        image: 'node:18'
      }
      
      // Create sandbox and execute scan with session cookies (preferred) or OAuth tokens (fallback)
      console.log('Creating Daytona sandbox...')
      const sandbox = await DaytonaSandboxManager.createSandbox(config)
      
      console.log('Setting up sandbox environment...')
      await DaytonaSandboxManager.setupSandboxEnvironment(sandbox)
      
      console.log('Executing follower scan...')
      console.log('🔐 Using OAuth tokens for authentication')
      const result = await DaytonaSandboxManager.executeFollowerScan(sandbox, xUsername, oauthTokens.accessToken, oauthTokens.accessTokenSecret)
      
      // Deduct credits based on actual followers extracted
      const extractedCount = result.followerCount || 0
      if (extractedCount > 0) {
        console.log(`Deducting ${extractedCount} follower credits for user ${userId}`)
        await deductCredits(userId, 'followers', extractedCount, {
          description: `Follower scan for @${xUsername}`,
          endpoint: '/api/scan/followers',
          username: xUsername
        })
        console.log(`✅ Deducted ${extractedCount} credits successfully`)
      }
      
      // Store extracted followers to user's collection for unfollower tracking
      if (result.followers && result.followers.length > 0) {
        console.log(`Storing ${result.followers.length} followers to database...`)
        const batch = adminDb.batch()
        const followersRef = adminDb.collection('users').doc(userId).collection('followers')
        const now = new Date()
        
        // Check which followers already exist to preserve their first_seen date
        const existingFollowersSnapshot = await followersRef
          .where('target_username', '==', xUsername.toLowerCase())
          .get()
        
        const existingFollowers = new Set(
          existingFollowersSnapshot.docs.map(doc => doc.data().username)
        )
        
        for (const follower of result.followers) {
          const followerDoc = followersRef.doc(follower.username)
          const isExistingFollower = existingFollowers.has(follower.username)
          
          const followerData: any = {
            ...follower,
            target_username: xUsername.toLowerCase(),
            scan_id: scanId,
            extracted_at: now,
            last_seen: now,
            status: 'active'
          }
          
          // Only set first_seen for NEW followers
          if (!isExistingFollower) {
            followerData.first_seen = now
          }
          
          batch.set(followerDoc, followerData, { merge: true })
        }
        
        await batch.commit()
        console.log(`✅ Stored ${result.followers.length} followers (${result.followers.length - existingFollowers.size} new)`)
      }
      
      // Check for unfollowers if this is a re-scan
      const followerUsernames = (result.followers || []).map((f: any) => f.username)
      await checkForUnfollowers(userId, xUsername, followerUsernames, scanId)
      
      // Update scan with results - filter out undefined values
      const updateData: any = {
        status: result.status || 'completed',
        followers: followerUsernames, // Store only usernames, not full objects
        followerCount: result.followerCount || 0,
        completedAt: new Date(),
        twitterUsername: xUsername,
        creditsUsed: extractedCount
      }
      
      if (result.error) {
        updateData.error = result.error
      }
      
      await adminDb.collection('follower_scans').doc(scanId).update(updateData)
    } catch (error: any) {
      console.error('Follower scan failed:', error)
      // Update scan status to failed
      await adminDb.collection('follower_scans').doc(scanId).update({
        status: 'failed',
        error: error.message,
        completedAt: new Date(),
      })
    }

    return NextResponse.json({
      scanId,
      sessionId,
      status: 'pending',
      message: 'Follower scan initiated successfully'
    })

  } catch (error) {
    console.error('Scan initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate follower scan' },
      { status: 500 }
    )
  }
}

async function startFollowerScan(
  scanId: string,
  userId: string,
  twitterUsername: string,
  sessionId: string,
  oauthTokens?: { accessToken: string, accessTokenSecret: string }
) {
  let sandbox: any = null

  try {
    // Update scan status to 'initializing'
    await adminDb.collection('follower_scans').doc(scanId).update({
      status: 'initializing',
      progress: 10,
    })

    // Create Daytona sandbox
    const sandboxConfig = {
      name: `follower-scan-${sessionId}`,
      repository: 'https://github.com/microsoft/vscode-dev-containers',
      image: 'node:18'
    }

    sandbox = await DaytonaSandboxManager.createSandbox(sandboxConfig)

    // Update scan with sandbox ID
    await adminDb.collection('follower_scans').doc(scanId).update({
      sandboxId: sandbox.id,
      status: 'setting_up',
      progress: 25,
    })

    // Set up sandbox environment
    await DaytonaSandboxManager.setupSandboxEnvironment(sandbox)

    // Update scan status to 'scanning'
    await adminDb.collection('follower_scans').doc(scanId).update({
      status: 'scanning',
      progress: 50,
    })

    // Execute the follower scan
    if (!oauthTokens) {
      throw new Error('OAuth tokens not found')
    }
    
    const scanResult = await DaytonaSandboxManager.executeFollowerScan(
      sandbox,
      twitterUsername,
      oauthTokens.accessToken,
      oauthTokens.accessTokenSecret
    )

    if (scanResult.status === 'failed') {
      throw new Error(scanResult.error || 'Scan failed')
    }

    // Update scan with results
    await adminDb.collection('follower_scans').doc(scanId).update({
      status: 'completed',
      progress: 100,
      followers: scanResult.followers,
      followerCount: scanResult.followerCount,
      completedAt: new Date(),
    })

    // Check for unfollowers if this isn't the first scan
    const followerUsernames = scanResult.followers.map((f: any) => f.username || f)
    await checkForUnfollowers(userId, twitterUsername, followerUsernames, scanId)

  } catch (error) {
    console.error('Follower scan error:', error)
    
    // Update scan status to failed
    await adminDb.collection('follower_scans').doc(scanId).update({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date(),
    })
  } finally {
    // Clean up sandbox
    if (sandbox) {
      await DaytonaSandboxManager.cleanupSandbox(sandbox)
    }
  }
}

async function checkForUnfollowers(
  userId: string,
  twitterUsername: string,
  currentFollowers: string[],
  currentScanId: string
) {
  try {
    // Get the most recent completed scan before this one
    const previousScansQuery = await adminDb
      .collection('follower_scans')
      .where('userId', '==', userId)
      .where('twitterUsername', '==', twitterUsername)
      .where('status', '==', 'completed')
      .orderBy('completedAt', 'desc')
      .limit(2)
      .get()

    if (previousScansQuery.docs.length < 2) {
      // This is the first scan or no previous completed scan
      return
    }

    const previousScan = previousScansQuery.docs[1] // Second most recent (first is current)
    const previousFollowers = previousScan.data().followers || []

    // Find unfollowers and new followers
    const currentFollowersSet = new Set(currentFollowers)
    const previousFollowersSet = new Set(previousFollowers)

    const unfollowers = previousFollowers.filter(
      (follower: string) => !currentFollowersSet.has(follower)
    )
    const newFollowers = currentFollowers.filter(
      (follower: string) => !previousFollowersSet.has(follower)
    )

    if (unfollowers.length > 0 || newFollowers.length > 0) {
      // Create unfollower report
      await adminDb.collection('unfollower_reports').add({
        userId,
        twitterUsername,
        previousScanId: previousScan.id,
        currentScanId,
        unfollowers,
        newFollowers,
        unfollowerCount: unfollowers.length,
        newFollowerCount: newFollowers.length,
        reportDate: new Date(),
      })
    }

  } catch (error) {
    console.error('Error checking for unfollowers:', error)
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get scan ID from query params
    const { searchParams } = new URL(request.url)
    const scanId = searchParams.get('scanId')

    if (!scanId) {
      // Return all scans for the user
      const scansQuery = await adminDb
        .collection('follower_scans')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()

      const scans = scansQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
        completedAt: doc.data().completedAt?.toDate?.()?.toISOString(),
      }))

      return NextResponse.json({ scans })
    }

    // Get specific scan
    const scanDoc = await adminDb.collection('follower_scans').doc(scanId).get()
    
    if (!scanDoc.exists) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    const scanData = scanDoc.data()
    
    // Verify ownership
    if (scanData?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      id: scanDoc.id,
      ...scanData,
      createdAt: scanData?.createdAt?.toDate?.()?.toISOString(),
      completedAt: scanData?.completedAt?.toDate?.()?.toISOString(),
    })

  } catch (error) {
    console.error('Get scan error:', error)
    return NextResponse.json(
      { error: 'Failed to get scan information' },
      { status: 500 }
    )
  }
}
