import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { DaytonaSandboxManager, SandboxConfig } from '@/lib/daytona-client'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 600

export async function POST(request: NextRequest) {
  try {
    // Environment variable checks
    const requiredEnvVars = ['DAYTONA_API_KEY', 'DAYTONA_API_URL', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    
    if (missingEnvVars.length > 0) {
      console.error('❌ Missing environment variables:', missingEnvVars)
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: `Missing environment variables: ${missingEnvVars.join(', ')}`
      }, { status: 500 })
    }

    console.log('Environment variable check:', {
      DAYTONA_API_KEY: !!process.env.DAYTONA_API_KEY,
      DAYTONA_API_URL: !!process.env.DAYTONA_API_URL,
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY
    })

    // Verify user authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { scanId, sessionCookies } = await request.json()

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 })
    }

    if (!sessionCookies || !sessionCookies.auth_token) {
      return NextResponse.json({ error: 'Session cookies with auth_token are required' }, { status: 400 })
    }

    console.log(`🔄 Retrying scan ${scanId} with session cookies for user: ${userId}`)

    // Get the original scan
    const scanDoc = await adminDb.collection('follower_scans').doc(scanId).get()
    if (!scanDoc.exists) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    const scanData = scanDoc.data()
    if (scanData?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized access to scan' }, { status: 403 })
    }

    const xUsername = scanData?.xUsername
    if (!xUsername) {
      return NextResponse.json({ error: 'Username not found in original scan' }, { status: 400 })
    }

    // Update scan status to retrying
    await adminDb.collection('follower_scans').doc(scanId).update({
      status: 'initializing',
      retryAttempt: (scanData?.retryAttempt || 0) + 1,
      retryMethod: 'session_cookies',
      retryAt: new Date(),
      error: null,
      requiresSessionCookies: false,
      authenticationMessage: null
    })

    // Create sandbox configuration
    const sandboxConfig: SandboxConfig = {
      name: `retry-scan-${scanId.substring(0, 8)}-${Date.now()}`,
      repository: 'https://github.com/microsoft/vscode-dev-containers',
      image: 'node:18'
    }

    console.log('Creating sandbox configuration...')
    console.log('Creating Daytona sandbox...')

    // Execute the retry scan asynchronously
    setImmediate(async () => {
      try {
        const sandbox = await DaytonaSandboxManager.createSandbox(sandboxConfig)
        console.log('Setting up sandbox environment...')
        await DaytonaSandboxManager.setupSandboxEnvironment(sandbox)
        
        console.log('Executing RETRY follower scan with session cookies...')
        const result = await DaytonaSandboxManager.executeFollowerScanWithCookies(sandbox, xUsername, sessionCookies)
        
        // Update scan with results
        const updateData: any = {
          status: result.status || 'completed',
          followers: result.followers || [],
          followerCount: result.followerCount || 0,
          completedAt: new Date(),
          method: 'session_cookies_retry'
        }
        
        if (result.error) {
          updateData.error = result.error
        }
        
        await adminDb.collection('follower_scans').doc(scanId).update(updateData)
        
        // Clean up sandbox
        try {
          await DaytonaSandboxManager.cleanupSandbox(sandbox)
        } catch (cleanupError) {
          console.error('Sandbox cleanup failed:', cleanupError)
        }
        
      } catch (error: any) {
        console.error('Retry scan failed:', error)
        await adminDb.collection('follower_scans').doc(scanId).update({
          status: 'failed',
          error: error.message,
          completedAt: new Date(),
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Retry scan started with session cookies',
      scanId: scanId,
      status: 'initializing'
    })

  } catch (error: any) {
    console.error('Retry scan initialization failed:', error)
    return NextResponse.json({ 
      error: 'Failed to start retry scan',
      details: error.message
    }, { status: 500 })
  }
}
