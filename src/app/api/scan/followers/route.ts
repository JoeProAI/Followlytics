import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { DaytonaSandboxManager, SandboxConfig } from '@/lib/daytona-client'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
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
      // Create sandbox configuration
      const config = {
        userId,
        twitterUsername: xUsername,
        sessionId,
        autoDelete: true
      }
      
      // Create sandbox and execute scan
      const sandbox = await DaytonaSandboxManager.createFollowerScanSandbox(config)
      const result = await DaytonaSandboxManager.executeFollowerScan(sandbox, xUsername, [])
      
      // Update scan with results
      await adminDb.collection('follower_scans').doc(scanId).update({
        status: result.status,
        followers: result.followers,
        followerCount: result.followerCount,
        completedAt: new Date(),
        error: result.error || null
      })
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
  twitterCookies?: any[]
) {
  let sandbox: any = null

  try {
    // Update scan status to 'initializing'
    await adminDb.collection('follower_scans').doc(scanId).update({
      status: 'initializing',
      progress: 10,
    })

    // Create Daytona sandbox
    const sandboxConfig: SandboxConfig = {
      userId,
      twitterUsername,
      sessionId,
      autoDelete: true, // Auto-delete after completion
    }

    sandbox = await DaytonaSandboxManager.createFollowerScanSandbox(sandboxConfig)

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
    const scanResult = await DaytonaSandboxManager.executeFollowerScan(
      sandbox,
      twitterUsername,
      twitterCookies
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
      completedAt: scanResult.scanDate,
    })

    // Check for unfollowers if this isn't the first scan
    await checkForUnfollowers(userId, twitterUsername, scanResult.followers, scanId)

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
