import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { DaytonaSandboxManager } from '@/lib/daytona-client'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 600

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

    const { xUsername, sessionCookies } = await request.json()

    if (!xUsername) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    if (!sessionCookies?.auth_token) {
      return NextResponse.json({ error: 'Session cookies with auth_token are required' }, { status: 400 })
    }

    console.log(`🚀 Starting SIMPLE scan for @${xUsername} with session cookies`)

    // Create scan record
    const scanDoc = await adminDb.collection('follower_scans').add({
      userId,
      xUsername,
      status: 'initializing',
      progress: 0,
      createdAt: new Date(),
      method: 'session_cookies'
    })

    const scanId = scanDoc.id

    // Start scan asynchronously
    setImmediate(async () => {
      try {
        // Create sandbox
        console.log('📦 Creating Daytona sandbox...')
        const sandbox = await DaytonaSandboxManager.createSandbox({
          name: `simple-scan-${scanId.substring(0, 8)}`,
          repository: 'https://github.com/microsoft/vscode-dev-containers',
          image: 'node:18'
        })

        await adminDb.collection('follower_scans').doc(scanId).update({
          status: 'setting_up',
          progress: 25,
          sandboxId: sandbox.id
        })

        // Setup environment
        console.log('⚙️ Setting up sandbox environment...')
        await DaytonaSandboxManager.setupSandboxEnvironment(sandbox)

        await adminDb.collection('follower_scans').doc(scanId).update({
          status: 'scanning',
          progress: 50
        })

        // Execute scan with session cookies
        console.log('🔍 Executing follower scan with session cookies...')
        const result = await DaytonaSandboxManager.executeFollowerScanWithCookies(
          sandbox, 
          xUsername, 
          sessionCookies
        )

        // Update with results
        await adminDb.collection('follower_scans').doc(scanId).update({
          status: result.status === 'success' ? 'completed' : 'failed',
          progress: 100,
          followers: result.followers || [],
          followerCount: result.followerCount || 0,
          completedAt: new Date(),
          error: result.error || null
        })

        console.log(`✅ Scan completed: ${result.followerCount} followers found`)

        // Cleanup sandbox
        try {
          await DaytonaSandboxManager.cleanupSandbox(sandbox)
        } catch (cleanupError) {
          console.error('Sandbox cleanup failed:', cleanupError)
        }

      } catch (error: any) {
        console.error('❌ Scan failed:', error)
        await adminDb.collection('follower_scans').doc(scanId).update({
          status: 'failed',
          error: error.message,
          completedAt: new Date()
        })
      }
    })

    return NextResponse.json({
      success: true,
      scanId,
      message: 'Scan started successfully',
      status: 'initializing'
    })

  } catch (error: any) {
    console.error('Failed to start scan:', error)
    return NextResponse.json({
      error: 'Failed to start scan',
      details: error.message
    }, { status: 500 })
  }
}
