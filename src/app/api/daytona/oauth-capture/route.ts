import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { DaytonaSandboxManager, SandboxConfig } from '@/lib/daytona-client'

export const maxDuration = 300 // 5 minutes for OAuth capture

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

    if (captureType !== 'oauth_session') {
      return NextResponse.json({ error: 'Invalid capture type' }, { status: 400 })
    }

    console.log(`🔐 Starting Daytona OAuth capture for user: ${userId}`)

    // Create sandbox configuration for OAuth capture
    const sandboxConfig: SandboxConfig = {
      name: `oauth-capture-${userId.substring(0, 8)}-${Date.now()}`,
      repository: 'https://github.com/microsoft/vscode-dev-containers',
      image: 'node:18',
      envVars: {
        TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID || '',
        TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET || '',
        CALLBACK_URL: `${process.env.NEXTAUTH_URL || 'https://followlytics-zeta.vercel.app'}/api/auth/twitter/callback`,
        USER_ID: userId
      }
    }

    // Execute the OAuth capture asynchronously
    setImmediate(async () => {
      let sandbox = null
      try {
        console.log('🏗️ Creating Daytona sandbox for OAuth capture...')
        sandbox = await DaytonaSandboxManager.createSandbox(sandboxConfig)
        
        console.log('⚙️ Setting up sandbox environment...')
        await DaytonaSandboxManager.setupSandboxEnvironment(sandbox)
        
        console.log('🔐 Executing OAuth session capture...')
        const result = await DaytonaSandboxManager.captureOAuthSession(sandbox, userId)
        
        if (result.success && result.sessionData) {
          // Store session data in Firebase
          await adminDb.collection('x_sessions').doc(userId).set({
            sessionData: result.sessionData,
            oauthTokens: result.oauthTokens,
            capturedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            method: 'oauth_capture',
            captureType: 'daytona_oauth'
          })
          
          console.log('✅ OAuth session captured and stored successfully')
        } else {
          console.error('❌ OAuth capture failed:', result.error)
        }
        
      } catch (error: any) {
        console.error('❌ Daytona OAuth capture failed:', error)
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
      message: 'OAuth capture started in secure Daytona sandbox',
      status: 'capturing'
    })

  } catch (error: any) {
    console.error('OAuth capture initialization failed:', error)
    return NextResponse.json({ 
      error: 'Failed to start OAuth capture',
      details: error.message
    }, { status: 500 })
  }
}
