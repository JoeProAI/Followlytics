import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { Daytona } from '@daytonaio/sdk'

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

    const { scanId } = await request.json()

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID required' }, { status: 400 })
    }

    console.log(`🔄 Transferring session for scan: ${scanId}`)

    // Get scan details
    const scanDoc = await adminDb.collection('follower_scans').doc(scanId).get()
    
    if (!scanDoc.exists) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    const scanData = scanDoc.data()
    
    // Verify ownership
    if (scanData?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const sandboxId = scanData?.sandboxId

    if (!sandboxId) {
      return NextResponse.json({ error: 'Sandbox not found for this scan' }, { status: 404 })
    }

    // Initialize Daytona client
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY!,
      apiUrl: process.env.DAYTONA_API_URL!
    })

    // Get the sandbox and check its status
    let sandbox
    try {
      sandbox = await daytona.get(sandboxId)
      console.log(`📊 Sandbox status: ${sandbox?.state || 'unknown'}`)
      
      if (!sandbox) {
        return NextResponse.json({ error: 'Sandbox not found' }, { status: 404 })
      }

      // If sandbox is stopped, try to start it
      if (sandbox.state === 'stopped' || sandbox.state === 'stopping') {
        console.log('🔄 Sandbox is stopped, attempting to start...')
        try {
          await daytona.start(sandboxId)
          console.log('✅ Sandbox started successfully')
          // Wait a moment for startup
          await new Promise(resolve => setTimeout(resolve, 3000))
          // Get updated sandbox info
          sandbox = await daytona.get(sandboxId)
        } catch (startError) {
          console.error('❌ Failed to start sandbox:', startError)
          return NextResponse.json({ 
            error: 'Sandbox is stopped and could not be restarted',
            details: startError instanceof Error ? startError.message : 'Unknown error'
          }, { status: 500 })
        }
      }

      if (sandbox.state !== 'started') {
        // If sandbox is destroyed/destroying, create a new one automatically
        if (sandbox.state === 'destroyed' || sandbox.state === 'destroying') {
          console.log('🔄 Sandbox destroyed, creating new one automatically...')
          
          try {
            // Create new sandbox
            const newSandbox = await daytona.create({
              language: 'javascript'
            })
            
            console.log(`✅ New sandbox created: ${newSandbox.id}`)
            
            // Update the scan record with new sandbox ID
            await adminDb.collection('follower_scans').doc(scanId).update({
              sandboxId: newSandbox.id,
              status: 'setting_up',
              message: 'Created new sandbox - setting up environment...',
              progress: 25
            })
            
            // Wait for new sandbox to be ready
            await new Promise(resolve => setTimeout(resolve, 5000))
            
            // Get the new sandbox
            sandbox = await daytona.get(newSandbox.id)
            
            if (sandbox.state !== 'started') {
              return NextResponse.json({ 
                error: `New sandbox failed to start (status: ${sandbox.state})`,
                suggestion: 'Please try starting a completely new scan'
              }, { status: 500 })
            }
            
            // Set up the new sandbox with interactive script
            console.log('🔧 Setting up new sandbox environment...')
            
            // Get username from scan record
            const scanDoc = await adminDb.collection('follower_scans').doc(scanId).get()
            const scanData = scanDoc.data()
            const username = scanData?.username || 'unknown'
            
            // Start a simple setup script in the new sandbox
            await sandbox.process.codeRun(`
              echo "Setting up new sandbox for authentication transfer..."
              npm install playwright fs path
              npx playwright install chromium
              echo "New sandbox ready for authentication transfer"
            `)
            
            console.log('✅ New sandbox set up and ready for authentication transfer')
            
          } catch (createError) {
            console.error('❌ Failed to create new sandbox:', createError)
            return NextResponse.json({ 
              error: 'Previous sandbox expired and failed to create replacement',
              details: createError instanceof Error ? createError.message : 'Unknown error',
              suggestion: 'Please start a new scan from the dashboard'
            }, { status: 500 })
          }
          
        } else {
          return NextResponse.json({ 
            error: `Sandbox is not running (status: ${sandbox.state})`,
            suggestion: 'Please start a new scan - the previous sandbox has expired'
          }, { status: 400 })
        }
      }

    } catch (error) {
      console.error('❌ Error accessing sandbox:', error)
      return NextResponse.json({ 
        error: 'Failed to access sandbox',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'The sandbox may have expired. Please start a new scan.'
      }, { status: 500 })
    }

    // Signal the sandbox that user has authenticated and to continue extraction
    console.log('📝 Creating authentication signal file in sandbox...')
    
    try {
      const signalScript = `
echo "USER_AUTHENTICATED" > /tmp/auth_signal.txt
echo "$(date): User completed authentication in external browser" >> /tmp/extraction.log
echo "Continuing with follower extraction..." >> /tmp/extraction.log
`

      // Add retry logic for Daytona API calls
      let retryCount = 0
      const maxRetries = 3
      
      while (retryCount < maxRetries) {
        try {
          await sandbox.process.codeRun(signalScript)
          console.log('✅ Authentication signal sent successfully')
          break
        } catch (apiError: any) {
          retryCount++
          console.error(`❌ Signal attempt ${retryCount}/${maxRetries} failed:`, apiError)
          
          // Check if it's a 502 error (Bad Gateway) - Daytona service issue
          if (apiError?.statusCode === 502 || apiError?.message?.includes('502')) {
            console.log('🔄 Daytona API returned 502 - service may be temporarily unavailable')
            
            if (retryCount < maxRetries) {
              const delay = retryCount * 1000 // 1s, 2s, 3s delays
              console.log(`⏳ Waiting ${delay}ms before retry...`)
              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            }
          }
          
          // If max retries reached, throw the error
          if (retryCount >= maxRetries) {
            throw apiError
          }
        }
      }
      
    } catch (execError) {
      console.error('❌ Failed to execute signal script after retries:', execError)
      
      // Provide specific error message for 502 errors
      if ((execError as any)?.statusCode === 502 || (execError as Error)?.message?.includes('502')) {
        // Update scan status to reflect Daytona service issues
        await adminDb.collection('follower_scans').doc(scanId).update({
          status: 'error',
          message: 'Daytona service temporarily unavailable - please try again in a few minutes',
          userActionRequired: true,
          progress: 50
        })
        
        return NextResponse.json({ 
          error: 'Daytona service temporarily unavailable (502 Bad Gateway)',
          details: 'The sandbox service is experiencing issues. Please try again in a few moments.',
          suggestion: 'Wait 30 seconds and try the authentication transfer again, or restart the scan.'
        }, { status: 503 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to send authentication signal to sandbox',
        details: execError instanceof Error ? execError.message : 'Unknown error'
      }, { status: 500 })
    }
    
    // Update scan status with longer extraction time expectation
    await adminDb.collection('follower_scans').doc(scanId).update({
      status: 'extracting_followers',
      message: 'User authenticated - starting follower extraction (this may take 2-5 minutes)...',
      userActionRequired: false,
      progress: 75,
      extractionStarted: new Date(),
      expectedDuration: '2-5 minutes'
    })

    console.log('✅ Authentication signal sent to sandbox')

    return NextResponse.json({
      success: true,
      message: 'Session transfer initiated - extraction will continue automatically',
      status: 'extracting_followers'
    })

  } catch (error: any) {
    console.error('Session transfer failed:', error)
    return NextResponse.json({
      error: 'Failed to transfer session',
      details: error.message
    }, { status: 500 })
  }
}
