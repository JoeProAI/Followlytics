import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { DaytonaSandboxManager, SandboxConfig } from '@/lib/daytona-client'
import { v4 as uuidv4 } from 'uuid'

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
    const { xUsername, sessionCookies } = await request.json()

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
      method: 'hybrid',
      hasSessionCookies: !!sessionCookies
    })

    const scanId = scanDoc.id

    // Start the scanning process asynchronously
    try {
      console.log('Starting HYBRID follower scan process for user:', userId)
      
      // Get user's OAuth tokens
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
        name: `hybrid-scan-${sessionId}`,
        repository: 'https://github.com/microsoft/vscode-dev-containers',
        image: 'node:18'
      }
      
      // Create sandbox and execute hybrid scan
      console.log('Creating Daytona sandbox...')
      const sandbox = await DaytonaSandboxManager.createSandbox(config)
      
      console.log('Setting up sandbox environment...')
      await DaytonaSandboxManager.setupSandboxEnvironment(sandbox)
      
      console.log('Executing HYBRID follower scan...')
      
      // Try session cookies first, then OAuth tokens
      let result
      if (sessionCookies && sessionCookies.auth_token) {
        console.log('🔐 Using provided session cookies for authentication')
        result = await DaytonaSandboxManager.executeFollowerScanWithCookies(sandbox, xUsername, sessionCookies)
      } else {
        console.log('🔐 Using OAuth tokens for authentication')
        result = await DaytonaSandboxManager.executeFollowerScan(sandbox, xUsername, oauthTokens.accessToken, oauthTokens.accessTokenSecret)
      }
      
      // Update scan with results
      const updateData: any = {
        status: result.status || 'completed',
        followers: result.followers || [],
        followerCount: result.followerCount || 0,
        completedAt: new Date(),
        method: sessionCookies ? 'session_cookies' : 'oauth_tokens'
      }
      
      if (result.error) {
        updateData.error = result.error
      }
      
      // Handle authentication failure specifically
      if (result.status === 'authentication_required' || result.authenticationFailed) {
        updateData.status = 'authentication_required'
        updateData.requiresSessionCookies = true
        updateData.authenticationMessage = result.message || 'Session cookies required for authentication'
      }
      
      await adminDb.collection('follower_scans').doc(scanId).update(updateData)
    } catch (error: any) {
      console.error('Hybrid follower scan failed:', error)
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
      message: 'Hybrid follower scan initiated successfully',
      method: sessionCookies ? 'session_cookies' : 'oauth_tokens'
    })

  } catch (error) {
    console.error('Hybrid scan initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate hybrid follower scan' },
      { status: 500 }
    )
  }
}
