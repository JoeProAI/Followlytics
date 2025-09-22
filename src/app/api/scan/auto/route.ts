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
        error: 'No X OAuth tokens found. Please authorize X access first.',
        requiresAuth: true 
      }, { status: 401 })
    }

    const tokenData = tokensDoc.data()
    const accessToken = tokenData?.accessToken
    const accessTokenSecret = tokenData?.accessTokenSecret

    if (!accessToken || !accessTokenSecret) {
      return NextResponse.json({ 
        error: 'Invalid X tokens. Please re-authorize X access.',
        requiresAuth: true 
      }, { status: 401 })
    }

    // Try to get captured X session data (preferred method)
    let sessionData = null
    try {
      const sessionDoc = await adminDb.collection('x_sessions').doc(userId).get()
      if (sessionDoc.exists) {
        const session = sessionDoc.data()
        // Check if session is recent (within 24 hours)
        const capturedAt = session?.capturedAt?.toDate()
        const isRecent = capturedAt && (Date.now() - capturedAt.getTime()) < 24 * 60 * 60 * 1000
        
        if (isRecent && session?.isValid) {
          sessionData = {
            cookies: session.cookies || {},
            localStorage: session.localStorage || {},
            sessionStorage: session.sessionStorage || {},
            userAgent: session.userAgent || ''
          }
          console.log('✅ Found recent captured X session data')
        } else {
          console.log('⚠️ Captured session data is too old or invalid')
        }
      } else {
        console.log('ℹ️ No captured X session data found, will use OAuth tokens')
      }
    } catch (error) {
      console.log('⚠️ Error retrieving session data:', error)
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
          status: 'scanning_followers',
          progress: 50,
          message: 'Using 7-step X OAuth injection method - no manual sign-in required',
          userActionRequired: false,
          authenticationMethod: '7-step-oauth-injection'
        })

        // Execute AUTOMATED scan using OAuth tokens and/or session data
        console.log('🔍 Executing AUTOMATED follower scan...')
        const authMethod = sessionData ? 'captured_session' : 'oauth_tokens'
        console.log(`🔐 Authentication method: ${authMethod}`)
        
        const result = await DaytonaSandboxManager.executeFollowerScan(
          sandbox, 
          xUsername, 
          accessToken,
          accessTokenSecret,
          scanId,
          sessionData
        )

        console.log(`📊 Scan result: ${result.status}, ${result.followerCount} followers`)

        // Update with results - treat any completed extraction as success
        const isSuccess = result.status === 'success' || result.status === 'partial'
        await adminDb.collection('follower_scans').doc(scanId).update({
          status: isSuccess ? 'completed' : 'failed',
          progress: 100,
          followers: result.followers || [],
          followerCount: result.followerCount || 0,
          completedAt: new Date(),
          message: `Scan completed! Found ${result.followerCount || 0} followers.${result.followerCount === 0 ? ' This may be due to privacy settings or authentication issues.' : ''}`
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
        // Delay cleanup to allow background process to complete
        if (sandbox) {
          console.log('⏰ Scheduling delayed sandbox cleanup in 5 minutes...')
          
          // Schedule cleanup after 5 minutes to allow background process to complete
          setTimeout(async () => {
            try {
              console.log('🧹 Executing delayed sandbox cleanup...')
              await DaytonaSandboxManager.cleanupSandbox(sandbox)
              console.log('✅ Delayed sandbox cleanup completed')
            } catch (cleanupError) {
              console.error('❌ Delayed sandbox cleanup failed:', cleanupError)
            }
          }, 5 * 60 * 1000) // 5 minutes delay
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
