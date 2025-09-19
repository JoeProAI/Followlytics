import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { DaytonaSandboxManager } from '@/lib/daytona-client'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 600

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting AUTOMATED follower scan...')

    // Verify user authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { xUsername } = await request.json()

    if (!xUsername) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    console.log(`🎯 Automated scan for @${xUsername} by user: ${userId}`)

    // Get OAuth tokens from Firebase
    console.log('🔑 Retrieving OAuth tokens...')
    const tokensDoc = await adminDb.collection('x_tokens').doc(userId).get()
    
    if (!tokensDoc.exists) {
      return NextResponse.json({ 
        error: 'No Twitter authorization found. Please authorize Twitter access first.',
        needsAuth: true
      }, { status: 400 })
    }

    const tokenData = tokensDoc.data()
    const accessToken = tokenData?.accessToken
    const accessTokenSecret = tokenData?.accessTokenSecret

    if (!accessToken || !accessTokenSecret) {
      return NextResponse.json({ 
        error: 'Invalid Twitter tokens. Please re-authorize Twitter access.',
        needsAuth: true
      }, { status: 400 })
    }

    console.log('✅ OAuth tokens retrieved successfully')

    // Create scan record
    const scanDoc = await adminDb.collection('follower_scans').add({
      userId,
      xUsername,
      status: 'initializing',
      progress: 0,
      createdAt: new Date(),
      method: 'automated_oauth'
    })

    const scanId = scanDoc.id
    console.log(`📝 Created scan record: ${scanId}`)

    // Start automated scan
    setImmediate(async () => {
      let sandbox: any = null
      
      try {
        console.log('📦 Creating Daytona sandbox...')
        
        // Create sandbox
        sandbox = await DaytonaSandboxManager.createSandbox({
          name: `auto-scan-${scanId.substring(0, 8)}`,
          repository: 'https://github.com/microsoft/vscode-dev-containers',
          image: 'node:18'
        })

        console.log(`✅ Sandbox created: ${sandbox.id}`)

        await adminDb.collection('follower_scans').doc(scanId).update({
          status: 'setting_up',
          progress: 25,
          sandboxId: sandbox.id
        })

        // Setup environment
        console.log('⚙️ Setting up sandbox environment...')
        await DaytonaSandboxManager.setupSandboxEnvironment(sandbox)

        await adminDb.collection('follower_scans').doc(scanId).update({
          status: 'awaiting_user_signin',
          progress: 50,
          message: 'Browser opened - please sign into your Twitter account to continue',
          userActionRequired: true,
          actionDescription: 'Sign into Twitter in the browser window that opened'
        })

        // Execute AUTOMATED scan using OAuth tokens
        console.log('🔍 Executing AUTOMATED follower scan...')
        const result = await DaytonaSandboxManager.executeFollowerScan(
          sandbox, 
          xUsername, 
          accessToken,
          accessTokenSecret
        )

        console.log(`📊 Scan result: ${result.status}, ${result.followerCount} followers`)

        // Update with results
        await adminDb.collection('follower_scans').doc(scanId).update({
          status: result.status === 'success' ? 'completed' : 'failed',
          progress: 100,
          followers: result.followers || [],
          followerCount: result.followerCount || 0,
          completedAt: new Date(),
          error: result.error || null
        })

        console.log(`✅ AUTOMATED scan completed successfully!`)

      } catch (error: any) {
        console.error('❌ AUTOMATED scan failed:', error)
        await adminDb.collection('follower_scans').doc(scanId).update({
          status: 'failed',
          error: error.message,
          completedAt: new Date()
        })
      } finally {
        // Cleanup sandbox
        if (sandbox) {
          try {
            console.log('🧹 Cleaning up sandbox...')
            await DaytonaSandboxManager.cleanupSandbox(sandbox)
          } catch (cleanupError) {
            console.error('Sandbox cleanup failed:', cleanupError)
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      scanId,
      message: 'Automated scan started successfully - no manual input required',
      status: 'initializing',
      automated: true
    })

  } catch (error: any) {
    console.error('Failed to start automated scan:', error)
    return NextResponse.json({
      error: 'Failed to start automated scan',
      details: error.message
    }, { status: 500 })
  }
}
