import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { DaytonaSandboxManager, SandboxConfig } from '@/lib/daytona-client'

export const maxDuration = 300 // 5 minutes for hybrid capture

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

    const { captureType } = await request.json()

    if (captureType !== 'hybrid_oauth_session') {
      return NextResponse.json({ error: 'Invalid capture type' }, { status: 400 })
    }

    console.log(`🔐 Starting Daytona hybrid capture for user: ${userId}`)

    // Get user's existing Twitter OAuth tokens
    const userDoc = await adminDb.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()
    const twitterTokens = userData?.twitterTokens

    if (!twitterTokens?.access_token) {
      return NextResponse.json({ 
        error: 'No Twitter OAuth tokens found. Please authorize Twitter access first.' 
      }, { status: 400 })
    }

    // Create sandbox configuration for hybrid capture
    const sandboxConfig: SandboxConfig = {
      name: `hybrid-capture-${userId.substring(0, 8)}-${Date.now()}`,
      repository: 'https://github.com/microsoft/vscode-dev-containers',
      image: 'node:18',
      envVars: {
        TWITTER_ACCESS_TOKEN: twitterTokens.access_token,
        TWITTER_REFRESH_TOKEN: twitterTokens.refresh_token || '',
        TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID || '',
        TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET || '',
        USER_ID: userId
      }
    }

    // Execute the hybrid capture asynchronously
    setImmediate(async () => {
      let sandbox = null
      try {
        console.log('🏗️ Creating Daytona sandbox for hybrid capture...')
        sandbox = await DaytonaSandboxManager.createSandbox(sandboxConfig)
        
        console.log('⚙️ Setting up sandbox environment...')
        await DaytonaSandboxManager.setupSandboxEnvironment(sandbox)
        
        console.log('🔐 Executing hybrid session capture...')
        const result = await DaytonaSandboxManager.captureHybridSession(sandbox, userId, twitterTokens)
        
        if (result.success && result.sessionData) {
          // Store session data in Firebase
          await adminDb.collection('x_sessions').doc(userId).set({
            sessionData: result.sessionData,
            oauthTokens: twitterTokens,
            capturedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            method: 'hybrid_capture',
            captureType: 'daytona_hybrid'
          })
          
          console.log('✅ Hybrid session captured and stored successfully')
        } else {
          console.error('❌ Hybrid capture failed:', result.error)
        }
        
      } catch (error: any) {
        console.error('❌ Daytona hybrid capture failed:', error)
      } finally {
        // Always clean up sandbox
        if (sandbox) {
          try {
            await DaytonaSandboxManager.cleanupSandbox(sandbox)
            console.log('🧹 Sandbox cleaned up successfully')
          } catch (cleanupError) {
            console.error('⚠️ Sandbox cleanup failed:', cleanupError)
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Hybrid capture started using your Twitter OAuth tokens',
      status: 'capturing'
    })

  } catch (error: any) {
    console.error('Hybrid capture initialization failed:', error)
    return NextResponse.json({ 
      error: 'Failed to start hybrid capture',
      details: error.message
    }, { status: 500 })
  }
}
