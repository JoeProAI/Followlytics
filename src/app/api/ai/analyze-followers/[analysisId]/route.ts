import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { analysisId: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    const { analysisId } = params

    if (!analysisId) {
      return NextResponse.json({ 
        error: 'Analysis ID required' 
      }, { status: 400 })
    }

    // Verify the analysis belongs to the user
    const analysisRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('follower_analyses')
      .doc(analysisId)

    const analysisDoc = await analysisRef.get()

    if (!analysisDoc.exists) {
      return NextResponse.json({ 
        error: 'Analysis not found' 
      }, { status: 404 })
    }

    // Delete the analysis
    await analysisRef.delete()

    // Also delete any associated Gamma reports
    const gammaReports = await adminDb
      .collection('gamma_reports')
      .where('analysisId', '==', analysisId)
      .where('userId', '==', userId)
      .get()

    const deletePromises = gammaReports.docs.map(doc => doc.ref.delete())
    await Promise.all(deletePromises)

    return NextResponse.json({
      success: true,
      message: 'Analysis deleted successfully',
      deletedGammaReports: gammaReports.size
    })

  } catch (error: any) {
    console.error('Delete analysis error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete analysis',
      details: error.message 
    }, { status: 500 })
  }
}
