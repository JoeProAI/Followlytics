import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { DaytonaSandboxManager, SandboxConfig } from '@/lib/daytona-client'

export const maxDuration = 300 // 5 minutes for session capture

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

    const { xUsername, xPassword } = await request.json()

    if (!xUsername || !xPassword) {
      return NextResponse.json({ error: 'X username and password are required' }, { status: 400 })
    }

    console.log(`🔐 Starting Daytona session capture for user: ${userId}, X username: ${xUsername}`)

    // Create sandbox configuration for session capture
    const sandboxConfig: SandboxConfig = {
      name: `x-session-capture-${userId.substring(0, 8)}-${Date.now()}`,
      repository: 'https://github.com/microsoft/vscode-dev-containers',
      image: 'node:18'
    }

    // Execute the session capture asynchronously
    setImmediate(async () => {
      let sandbox = null
      try {
        console.log('🏗️ Creating Daytona sandbox for session capture...')
        sandbox = await DaytonaSandboxManager.createSandbox(sandboxConfig)
        
        console.log('⚙️ Setting up sandbox environment...')
        await DaytonaSandboxManager.setupSandboxEnvironment(sandbox)
        
        console.log('🔐 Executing X session capture...')
        const result = await DaytonaSandboxManager.captureXSession(sandbox, xUsername, xPassword)
        
        if (result.success && result.sessionData) {
          // Store session data in Firebase
          await adminDb.collection('x_sessions').doc(userId).set({
            sessionData: result.sessionData,
            capturedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            method: 'daytona_capture',
            xUsername: xUsername
          })
          
          console.log('✅ X session captured and stored successfully')
        } else {
          console.error('❌ Session capture failed:', result.error)
        }
        
      } catch (error: any) {
        console.error('❌ Daytona session capture failed:', error)
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
      message: 'Session capture started in secure Daytona sandbox',
      status: 'capturing'
    })

  } catch (error: any) {
    console.error('Session capture initialization failed:', error)
    return NextResponse.json({ 
      error: 'Failed to start session capture',
      details: error.message
    }, { status: 500 })
  }
}
