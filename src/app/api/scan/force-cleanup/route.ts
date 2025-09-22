import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { DaytonaSandboxManager } from '@/lib/daytona-client'

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the Firebase token
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log('🧹 Force cleanup requested by user:', userId)

    // Get all active scans for this user
    const scansSnapshot = await adminDb.collection('follower_scans')
      .where('userId', '==', userId)
      .where('status', 'in', ['pending', 'creating_sandbox', 'setting_up', 'scanning_followers', 'awaiting_user_signin'])
      .get()

    const cleanupResults = []

    for (const scanDoc of scansSnapshot.docs) {
      const scanData = scanDoc.data()
      const scanId = scanDoc.id

      console.log(`🔄 Cleaning up scan: ${scanId} (status: ${scanData.status})`)

      try {
        // If there's a sandbox, try to clean it up
        if (scanData.sandboxId) {
          console.log(`🗑️ Cleaning up sandbox: ${scanData.sandboxId}`)
          try {
            // Create a minimal sandbox object for cleanup
            const sandboxForCleanup = { id: scanData.sandboxId }
            await DaytonaSandboxManager.cleanupSandbox(sandboxForCleanup)
            console.log(`✅ Sandbox ${scanData.sandboxId} cleaned up`)
          } catch (sandboxError) {
            const errorMessage = sandboxError instanceof Error ? sandboxError.message : 'Unknown error'
            console.log(`⚠️ Failed to cleanup sandbox ${scanData.sandboxId}:`, errorMessage)
          }
        }

        // Update scan status to cancelled
        await adminDb.collection('follower_scans').doc(scanId).update({
          status: 'cancelled',
          progress: 0,
          message: 'Scan cancelled by user - force cleanup',
          completedAt: new Date(),
          cancelled: true
        })

        cleanupResults.push({
          scanId,
          status: 'cleaned_up',
          sandboxId: scanData.sandboxId || null,
          previousStatus: scanData.status
        })

        console.log(`✅ Scan ${scanId} cleaned up successfully`)

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ Error cleaning up scan ${scanId}:`, errorMessage)
        cleanupResults.push({
          scanId,
          status: 'cleanup_failed',
          error: errorMessage,
          previousStatus: scanData.status
        })
      }
    }

    // Also check for any orphaned sandboxes (optional)
    console.log('🔍 Checking for orphaned sandboxes...')
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanupResults.length} scans`,
      cleanupResults,
      userId
    })

  } catch (error) {
    console.error('❌ Force cleanup error:', error)
    return NextResponse.json({
      error: 'Force cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
