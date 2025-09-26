import { NextRequest, NextResponse } from 'next/server'
// Force deployment: 2025-09-24T15:52:39 - Fix 404 errors
import { adminAuth as auth, adminDb as db } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import OptimizedDaytonaSandboxManager from '@/lib/daytona-optimized'

interface ScanRequest {
  scanType?: 'small' | 'medium' | 'large' | 'enterprise'
  maxFollowers?: number
  useSnapshot?: boolean
  timeoutDisabled?: boolean
}

interface ScanProgress {
  scanId: string
  status: 'initializing' | 'creating_sandbox' | 'setting_up_environment' | 'authenticating' | 'extracting_followers' | 'processing_results' | 'completed' | 'failed'
  progress: number
  message: string
  sandboxId?: string
  startTime: number
  estimatedCompletion?: number
  followersFound?: number
  error?: string
}

// In-memory progress tracking
const scanProgress = new Map<string, ScanProgress>()

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting optimized follower scan...')
    
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse request body
    const body: ScanRequest = await request.json()
    const { scanType = 'medium', maxFollowers, useSnapshot = true, timeoutDisabled = true } = body

    // 🍪 RETRIEVE X SESSION COOKIES for authentication
    console.log('🍪 Retrieving X session cookies for user:', userId)
    let sessionCookies = null
    
    try {
      const sessionDoc = await db.collection('x_sessions').doc(userId).get()
      if (sessionDoc.exists) {
        const sessionData = sessionDoc.data()
        if (sessionData && sessionData.isValid) {
          sessionCookies = {
            cookies: sessionData.cookies,
            localStorage: sessionData.localStorage,
            sessionStorage: sessionData.sessionStorage,
            userAgent: sessionData.userAgent
          }
          console.log('✅ Found valid X session cookies')
        } else {
          console.log('⚠️ X session found but marked as invalid')
        }
      } else {
        console.log('⚠️ No X session found for user - scan may fail without authentication')
      }
    } catch (sessionError) {
      console.error('❌ Error retrieving X session:', sessionError)
    }

    console.log(`📋 Scan request: auto-detect user (type: ${scanType}, max: ${maxFollowers})`)

    // Generate scan ID
    const scanId = `scan_${userId}_${Date.now()}`
    
    // Initialize progress tracking
    const initialProgress: ScanProgress = {
      scanId,
      status: 'initializing',
      progress: 0,
      message: 'Initializing optimized scan...',
      startTime: Date.now()
    }
    scanProgress.set(scanId, initialProgress)

    // Get user's Twitter tokens
    console.log('🔑 Retrieving Twitter tokens...')
    updateProgress(scanId, 'initializing', 5, 'Retrieving Twitter authentication...')
    
    const twitterTokens = await getUserTwitterTokens(userId)
    if (!twitterTokens) {
      updateProgress(scanId, 'failed', 0, 'Twitter authentication required')
      return NextResponse.json({ 
        error: 'Twitter authentication required',
        scanId,
        authUrl: '/api/auth/twitter'
      }, { status: 401 })
    }

    // Start background processing
    processOptimizedScan(scanId, userId, scanType, twitterTokens, {
      maxFollowers,
      useSnapshot,
      timeoutDisabled,
      sessionCookies  // 🍪 Pass session cookies to sandbox
    }).catch(error => {
      console.error('❌ Background scan failed:', error)
      updateProgress(scanId, 'failed', 0, `Scan failed: ${error.message}`)
    })

    return NextResponse.json({
      success: true,
      scanId,
      message: 'Optimized scan started',
      estimatedTime: getEstimatedTime(scanType, maxFollowers),
      features: {
        optimizedSandbox: true,
        snapshotEnabled: useSnapshot,
        timeoutDisabled,
        enterprisePatterns: true,
        parallelProcessing: scanType === 'large' || scanType === 'enterprise'
      }
    })

  } catch (error: any) {
    console.error('❌ Optimized scan initialization failed:', error)
    return NextResponse.json({ 
      error: 'Failed to initialize scan',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scanId = searchParams.get('scanId')

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID required' }, { status: 400 })
    }

    const progress = scanProgress.get(scanId)
    if (!progress) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    // Calculate estimated completion time
    if (progress.status !== 'completed' && progress.status !== 'failed') {
      const elapsed = Date.now() - progress.startTime
      const estimatedTotal = getEstimatedTime('medium', 1000) // Default estimate
      const estimatedCompletion = progress.startTime + estimatedTotal
      progress.estimatedCompletion = estimatedCompletion
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

async function processOptimizedScan(
  scanId: string,
  userId: string,
  scanType: 'small' | 'medium' | 'large' | 'enterprise',
  twitterTokens: any,
  options: {
    maxFollowers?: number
    useSnapshot?: boolean
    timeoutDisabled?: boolean
    sessionCookies?: any  // 🍪 X session cookies for authentication
  }
) {
  let sandboxId: string | undefined

  try {
    // Step 1: Create optimized sandbox
    updateProgress(scanId, 'creating_sandbox', 10, 'Creating optimized Daytona sandbox...')
    
    const sandbox = await OptimizedDaytonaSandboxManager.createOptimizedSandbox({
      name: `followlytics-optimized-${scanId}`,
      userId,
      scanType,
      twitterTokens: {
        access_token: twitterTokens.access_token,
        access_token_secret: twitterTokens.access_token_secret,
        bearer_token: twitterTokens.bearer_token || process.env.TWITTER_BEARER_TOKEN
      },
      maxFollowers: options.maxFollowers,
      timeoutDisabled: options.timeoutDisabled,
      useSnapshot: options.useSnapshot,
      sessionCookies: options.sessionCookies  // 🍪 Pass session cookies to sandbox
    })

    sandboxId = sandbox.id
    updateProgress(scanId, 'creating_sandbox', 25, `Sandbox created: ${sandboxId}`, sandboxId)

    // Step 2: Setup environment
    updateProgress(scanId, 'setting_up_environment', 35, 'Setting up optimized environment...')
    
    await OptimizedDaytonaSandboxManager.setupOptimizedEnvironment(sandbox)
    updateProgress(scanId, 'setting_up_environment', 50, 'Environment ready')

    // Step 3: Authenticate
    updateProgress(scanId, 'authenticating', 60, 'Authenticating with Twitter...')
    
    // Authentication is handled within the scan script
    updateProgress(scanId, 'authenticating', 70, 'Authentication completed')

    // Step 4: Extract followers
    updateProgress(scanId, 'extracting_followers', 75, 'Extracting followers from authenticated user...')
    
    const scanResult = await OptimizedDaytonaSandboxManager.executeOptimizedScan(sandbox, {
      name: `followlytics-optimized-${scanId}`,
      userId,
      scanType,
      twitterTokens: {
        access_token: twitterTokens.access_token,
        access_token_secret: twitterTokens.access_token_secret,
        bearer_token: twitterTokens.bearer_token || process.env.TWITTER_BEARER_TOKEN
      },
      maxFollowers: options.maxFollowers,
      timeoutDisabled: options.timeoutDisabled,
      useSnapshot: options.useSnapshot
    })

    if (!scanResult.success) {
      throw new Error(scanResult.error || 'Scan execution failed')
    }

    updateProgress(scanId, 'processing_results', 85, `Processing ${scanResult.followers?.length || 0} followers...`)

    // Step 5: Store results
    const followers = scanResult.followers || []
    
    await storeOptimizedScanResults(userId, scanId, {
      followers,
      scanType,
      totalFound: followers.length,
      detectedUsername: scanResult.detectedUsername || 'unknown',
      scanDuration: Date.now() - scanProgress.get(scanId)!.startTime,
      sandboxId,
      optimizations: {
        snapshotUsed: options.useSnapshot,
        timeoutDisabled: options.timeoutDisabled,
        enterprisePatterns: true
      }
    })

    updateProgress(scanId, 'completed', 100, `Scan completed! Found ${followers.length} followers`, sandboxId, followers.length)

    console.log(`✅ Optimized scan completed: ${scanId} (${followers.length} followers)`)

  } catch (error: any) {
    console.error(`❌ Optimized scan failed: ${scanId}`, error)
    updateProgress(scanId, 'failed', 0, `Scan failed: ${error.message}`, sandboxId)
  } finally {
    // Cleanup sandbox
    if (sandboxId) {
      setTimeout(async () => {
        await OptimizedDaytonaSandboxManager.cleanupSandbox(sandboxId!)
        console.log(`🧹 Sandbox cleanup completed: ${sandboxId}`)
      }, 5 * 60 * 1000) // Cleanup after 5 minutes
    }
  }
}

function updateProgress(
  scanId: string, 
  status: ScanProgress['status'], 
  progress: number, 
  message: string,
  sandboxId?: string,
  followersFound?: number
) {
  const current = scanProgress.get(scanId)
  if (current) {
    current.status = status
    current.progress = progress
    current.message = message
    if (sandboxId) current.sandboxId = sandboxId
    if (followersFound !== undefined) current.followersFound = followersFound
    scanProgress.set(scanId, current)
  }
  
  console.log(`📊 Progress [${scanId}]: ${status} (${progress}%) - ${message}`)
}

async function getUserTwitterTokens(userId: string) {
  try {
    console.log(`🔍 Looking up Twitter tokens for user: ${userId}`)
    
    // Try multiple lookup strategies
    const strategies = [
      // Strategy 1: Direct lookup by userId
      () => db.collection('x_tokens').doc(userId).get(),
      
      // Strategy 2: Query by twitter_id field
      () => db.collection('x_tokens').where('twitter_id', '==', userId).limit(1).get(),
      
      // Strategy 3: Query by user_id field
      () => db.collection('x_tokens').where('user_id', '==', userId).limit(1).get()
    ]

    for (const [index, strategy] of strategies.entries()) {
      try {
        console.log(`🔍 Trying lookup strategy ${index + 1}...`)
        const result = await strategy()
        
        if ('docs' in result) {
          // Query result
          if (!result.empty) {
            const doc = result.docs[0]
            const data = doc.data()
            console.log(`✅ Found tokens via strategy ${index + 1}`)
            return data
          }
        } else {
          // Document result
          if (result.exists) {
            const data = result.data()
            console.log(`✅ Found tokens via strategy ${index + 1}`)
            return data
          }
        }
      } catch (strategyError) {
        console.log(`⚠️ Strategy ${index + 1} failed:`, strategyError)
        continue
      }
    }

    console.log('❌ No Twitter tokens found for user')
    return null

  } catch (error) {
    console.error('❌ Error retrieving Twitter tokens:', error)
    return null
  }
}

async function storeOptimizedScanResults(
  userId: string, 
  scanId: string, 
  results: {
    followers: string[]
    scanType: string
    totalFound: number
    detectedUsername: string
    scanDuration: number
    sandboxId?: string
    optimizations: any
  }
) {
  try {
    console.log(`💾 Storing optimized scan results: ${scanId}`)
    
    const scanDoc = {
      userId,
      username: results.detectedUsername,
      scanId,
      followers: results.followers,
      totalFollowers: results.totalFound,
      scanType: results.scanType,
      scanDuration: results.scanDuration,
      sandboxId: results.sandboxId,
      optimizations: results.optimizations,
      createdAt: new Date(),
      status: 'completed',
      version: '2.0-optimized'
    }

    await db.collection('follower_scans').doc(scanId).set(scanDoc)
    
    // Update user's scan history
    await db.collection('users').doc(userId).update({
      lastScan: new Date(),
      totalScans: FieldValue.increment(1),
      lastScanType: results.scanType
    })

    console.log(`✅ Scan results stored: ${scanId}`)

  } catch (error) {
    console.error('❌ Failed to store scan results:', error)
    throw error
  }
}

function getEstimatedTime(scanType: string, maxFollowers?: number): number {
  // Estimated completion times in milliseconds
  const baseEstimates = {
    small: 2 * 60 * 1000,      // 2 minutes
    medium: 5 * 60 * 1000,     // 5 minutes
    large: 15 * 60 * 1000,     // 15 minutes
    enterprise: 30 * 60 * 1000 // 30 minutes
  }

  let estimate = baseEstimates[scanType as keyof typeof baseEstimates] || baseEstimates.medium

  // Adjust based on maxFollowers
  if (maxFollowers) {
    if (maxFollowers > 100000) {
      estimate *= 2
    } else if (maxFollowers > 10000) {
      estimate *= 1.5
    }
  }

  return estimate
}
