import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { searchParams } = new URL(request.url)
    const scanId = searchParams.get('scanId')

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID required' }, { status: 400 })
    }

    console.log(`🌐 Getting browser access for scan: ${scanId}`)

    // Get scan details to find sandbox ID
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

    // Generate browser access URL
    // This would connect to the remote debugging port in the sandbox
    const browserUrl = `https://sandbox-browser.daytona.io/${sandboxId}/devtools/inspector.html?ws=localhost:9222/devtools/page`
    
    // Alternative: Use noVNC for full desktop access
    const desktopUrl = `https://sandbox-desktop.daytona.io/${sandboxId}?token=${userId}`

    return NextResponse.json({
      success: true,
      sandboxId,
      browserUrl,
      desktopUrl,
      message: 'Browser access URLs generated - user can interact with sandbox browser',
      instructions: 'Click the browser URL to access the Twitter login page in your sandbox'
    })

  } catch (error: any) {
    console.error('Browser access setup failed:', error)
    return NextResponse.json({
      error: 'Failed to setup browser access',
      details: error.message
    }, { status: 500 })
  }
}
