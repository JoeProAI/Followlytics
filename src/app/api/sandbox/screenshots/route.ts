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

    console.log(`📸 Getting screenshots for scan: ${scanId}`)

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

    // In a real implementation, we would retrieve screenshots from the sandbox
    // For now, we'll return mock screenshot data
    const screenshots = [
      {
        name: '01_login_page.png',
        timestamp: new Date().toISOString(),
        description: 'Twitter login page loaded',
        url: `/api/sandbox/screenshot/${sandboxId}/01_login_page.png`
      },
      {
        name: '02_signed_in.png',
        timestamp: new Date().toISOString(),
        description: 'User signed in successfully',
        url: `/api/sandbox/screenshot/${sandboxId}/02_signed_in.png`
      },
      {
        name: '03_followers_page.png',
        timestamp: new Date().toISOString(),
        description: 'Followers page loaded',
        url: `/api/sandbox/screenshot/${sandboxId}/03_followers_page.png`
      },
      {
        name: '04_extraction_complete.png',
        timestamp: new Date().toISOString(),
        description: 'Extraction completed',
        url: `/api/sandbox/screenshot/${sandboxId}/04_extraction_complete.png`
      }
    ]

    return NextResponse.json({
      success: true,
      sandboxId,
      screenshots,
      message: 'Screenshots retrieved successfully'
    })

  } catch (error: any) {
    console.error('Screenshot retrieval failed:', error)
    return NextResponse.json({
      error: 'Failed to retrieve screenshots',
      details: error.message
    }, { status: 500 })
  }
}
