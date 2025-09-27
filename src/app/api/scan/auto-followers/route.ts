import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth, adminDb as db } from '@/lib/firebase-admin'
import OptimizedDaytonaSandboxManager from '@/lib/daytona-optimized'

interface AutoScanRequest {
  username: string
  scanType: 'complete' | 'sample'
  useBackground: boolean
  useSandbox: boolean
}

interface ScanProgress {
  scanId: string
  phase: 'initializing' | 'getting_user_info' | 'creating_sandbox' | 'opening_browser' | 'navigating' | 'scrolling' | 'extracting' | 'processing' | 'completed' | 'failed'
  progress: number
  message: string
  followersFound: number
  estimatedTotal?: number
  error?: string
  startTime: number
  sandboxId?: string
}

// Use existing OptimizedDaytonaSandboxManager instead of reinventing

// In-memory progress tracking
const scanProgress = new Map<string, ScanProgress>()

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse request
    const body: AutoScanRequest = await request.json()
    const { username, scanType, useBackground, useSandbox } = body

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    console.log(`🤖 Starting automated scan for @${username} (type: ${scanType})`)

    // Generate scan ID
    const scanId = `auto_${userId}_${Date.now()}`

    // Initialize progress tracking
    const initialProgress: ScanProgress = {
      scanId,
      phase: 'initializing',
      progress: 0,
      message: 'Initializing automated follower scan...',
      followersFound: 0,
      startTime: Date.now()
    }

    scanProgress.set(scanId, initialProgress)

    // Start background processing
    processAutoScan(scanId, userId, username, scanType, useSandbox).catch(error => {
      console.error('❌ Auto scan failed:', error)
      updateProgress(scanId, 'failed', 0, `Scan failed: ${error.message}`, undefined, error.message)
    })

    // Get estimated total (this would normally come from Twitter API or previous scans)
    const estimatedTotal = await getEstimatedFollowerCount(username)

    return NextResponse.json({
      success: true,
      scanId,
      message: `Started automated scan for @${username}`,
      estimatedTotal,
      estimatedTime: getEstimatedTime(estimatedTotal)
    })

  } catch (error: any) {
    console.error('❌ Failed to start auto scan:', error)
    return NextResponse.json({ 
      error: 'Failed to start scan',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const scanId = url.searchParams.get('scanId')
    
    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID required' }, { status: 400 })
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const progress = scanProgress.get(scanId)
    if (!progress) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    return NextResponse.json(progress)

  } catch (error: any) {
    console.error('❌ Failed to get scan progress:', error)
    return NextResponse.json({ 
      error: 'Failed to get progress',
      details: error.message 
    }, { status: 500 })
  }
}

async function processAutoScan(
  scanId: string,
  userId: string,
  username: string,
  scanType: string,
  useSandbox: boolean
) {
  let sandbox: any = null

  try {
    // Step 1: Get user info
    updateProgress(scanId, 'getting_user_info', 10, `Getting profile info for @${username}...`)
    
    // This would normally call Twitter API to get user info
    // For now, we'll simulate it
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    if (useSandbox) {
      // Use EXISTING working system instead of reinventing
      updateProgress(scanId, 'creating_sandbox', 20, 'Using existing optimized sandbox system...')
      
      // Get Twitter tokens (we need these for the existing system)
      const twitterTokens = await getTwitterTokens(userId)
      if (!twitterTokens) {
        throw new Error('Twitter tokens required for sandbox scanning')
      }
      
      // Use the EXISTING OptimizedDaytonaSandboxManager
      sandbox = await OptimizedDaytonaSandboxManager.createOptimizedSandbox({
        name: `auto-follower-scan-${scanId}`,
        userId,
        targetUsername: username,
        scanType: 'medium',
        twitterTokens,
        maxFollowers: 10000,
        timeoutDisabled: true,
        useSnapshot: true
      })

      console.log(`✅ Sandbox created: ${sandbox.id}`)
      updateProgress(scanId, 'creating_sandbox', 40, `Sandbox created: ${sandbox.id}`, sandbox.id)

      // Setup environment
      updateProgress(scanId, 'opening_browser', 50, 'Setting up optimized environment...')
      await OptimizedDaytonaSandboxManager.setupOptimizedEnvironment(sandbox)
      
      // Execute scan using existing system
      updateProgress(scanId, 'navigating', 60, `Scanning @${username} followers...`)
      
      const scanResult = await OptimizedDaytonaSandboxManager.executeOptimizedScan(sandbox, {
        name: `auto-follower-scan-${scanId}`,
        userId,
        targetUsername: username,
        scanType: 'medium',
        twitterTokens,
        maxFollowers: 10000,
        timeoutDisabled: true,
        useSnapshot: true
      })
      
      if (!scanResult.success) {
        throw new Error(scanResult.error || 'Scan execution failed')
      }
      
      const followers = scanResult.followers || []
      
      // Process results
      updateProgress(scanId, 'processing', 90, `Processing ${followers.length} followers...`)
      await storeResults(userId, scanId, username, followers)
      
      updateProgress(scanId, 'completed', 100, `Scan completed! Found ${followers.length} followers`, sandbox.id, undefined, followers.length)

    } else {
      // Fallback: simulate extraction without sandbox
      updateProgress(scanId, 'navigating', 50, 'Simulating follower extraction...')
      
      // Simulate progressive extraction
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const progress = 50 + (i * 4)
        const found = i * 10
        updateProgress(scanId, 'extracting', progress, `Extracting followers... found ${found}`, undefined, undefined, found)
      }
      
      updateProgress(scanId, 'completed', 100, 'Simulation completed! Found 100 followers', undefined, undefined, 100)
    }

  } catch (error: any) {
    console.error(`❌ Auto scan failed for ${scanId}:`, error)
    updateProgress(scanId, 'failed', 0, 'Scan failed', undefined, error.message)
  } finally {
    // Cleanup handled by OptimizedDaytonaSandboxManager
    console.log('🧹 Cleanup handled by existing system')
  }
}

async function storeResults(userId: string, scanId: string, username: string, followers: string[]) {
  await db.collection('auto_scans').doc(scanId).set({
    userId,
    scanId,
    username,
    followers,
    totalFollowers: followers.length,
    scanType: 'automated',
    createdAt: new Date(),
    status: 'completed'
  })
}

function updateProgress(
  scanId: string, 
  phase: ScanProgress['phase'], 
  progress: number, 
  message: string, 
  sandboxId?: string,
  error?: string,
  followersFound?: number
) {
  const current = scanProgress.get(scanId)
  if (current) {
    const updated: ScanProgress = {
      ...current,
      phase,
      progress,
      message,
      sandboxId,
      error,
      followersFound: followersFound ?? current.followersFound
    }
    scanProgress.set(scanId, updated)
    console.log(`📊 Progress Update [${scanId}]: ${phase} - ${progress}% - ${message}`)
  }
}

async function getEstimatedFollowerCount(username: string): Promise<number> {
  // This would normally call Twitter API to get follower count
  // For now, return a reasonable estimate
  return Math.floor(Math.random() * 10000) + 1000
}

async function getTwitterTokens(userId: string) {
  try {
    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return null
    }

    const userData = userDoc.data()
    if (!userData?.twitterTokens) {
      return null
    }

    return {
      access_token: userData.twitterTokens.access_token,
      access_token_secret: userData.twitterTokens.access_token_secret,
      bearer_token: userData.twitterTokens.bearer_token || process.env.TWITTER_BEARER_TOKEN
    }
  } catch (error) {
    console.error('❌ Error retrieving Twitter tokens:', error)
    return null
  }
}

function getEstimatedTime(followerCount: number): string {
  const minutes = Math.ceil(followerCount / 100) // ~100 followers per minute
  if (minutes < 60) {
    return `${minutes} minutes`
  } else {
    return `${Math.ceil(minutes / 60)} hours`
  }
}
