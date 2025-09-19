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

    // Get the sandbox
    const sandbox = await daytona.get(sandboxId)
    
    if (!sandbox) {
      return NextResponse.json({ error: 'Sandbox not accessible' }, { status: 404 })
    }

    // Signal the sandbox that user has authenticated and to continue extraction
    console.log('📝 Creating authentication signal file in sandbox...')
    
    const signalScript = `
echo "USER_AUTHENTICATED" > /tmp/auth_signal.txt
echo "$(date): User completed authentication in external browser" >> /tmp/extraction.log
echo "Continuing with follower extraction..." >> /tmp/extraction.log
`

    await sandbox.process.codeRun(signalScript)
    
    // Update scan status
    await adminDb.collection('follower_scans').doc(scanId).update({
      status: 'extracting_followers',
      message: 'User authenticated - extracting followers now...',
      userActionRequired: false,
      progress: 75
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
