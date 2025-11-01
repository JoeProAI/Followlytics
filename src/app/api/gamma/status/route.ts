import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

/**
 * Check status of Gamma report generation
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const analysisId = request.nextUrl.searchParams.get('analysisId')

    if (!analysisId) {
      return NextResponse.json({ error: 'Analysis ID required' }, { status: 400 })
    }

    // Get the analysis document
    const analysisDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('follower_analyses')
      .doc(analysisId)
      .get()

    if (!analysisDoc.exists) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    const analysisData = analysisDoc.data()
    const gammaReport = analysisData?.gamma_report

    if (!gammaReport) {
      return NextResponse.json({ 
        gammaReport: null,
        message: 'No Gamma report generated yet' 
      })
    }

    // If we have a generation_id but no URL yet, check with Gamma API
    if (gammaReport.generation_id && gammaReport.status === 'generating') {
      try {
        // Check Gamma API for status
        const gammaResponse = await fetch(`https://public-api.gamma.app/v0.2/generations/${gammaReport.generation_id}`, {
          headers: {
            'X-API-Key': process.env.GAMMA_API_KEY!
          }
        })

        if (gammaResponse.ok) {
          const gammaData = await gammaResponse.json()
          
          // Check if generation is complete
          if (gammaData.status === 'completed' && gammaData.url) {
            // Update Firestore with completed status
            await adminDb
              .collection('users')
              .doc(userId)
              .collection('follower_analyses')
              .doc(analysisId)
              .update({
                'gamma_report.status': 'completed',
                'gamma_report.url': gammaData.url,
                'gamma_report.completed_at': new Date().toISOString()
              })

            return NextResponse.json({
              gammaReport: {
                ...gammaReport,
                status: 'completed',
                url: gammaData.url,
                completed_at: new Date().toISOString()
              }
            })
          } else if (gammaData.status === 'failed') {
            // Update Firestore with failed status
            await adminDb
              .collection('users')
              .doc(userId)
              .collection('follower_analyses')
              .doc(analysisId)
              .update({
                'gamma_report.status': 'failed',
                'gamma_report.error': gammaData.error || 'Generation failed'
              })

            return NextResponse.json({
              gammaReport: {
                ...gammaReport,
                status: 'failed',
                error: gammaData.error || 'Generation failed'
              }
            })
          }
        }
      } catch (gammaError) {
        console.error('[Gamma] Status check error:', gammaError)
        // Return current status even if API check fails
      }
    }

    return NextResponse.json({ gammaReport })

  } catch (error: any) {
    console.error('[Gamma] Status check error:', error)
    return NextResponse.json({
      error: 'Failed to check Gamma status',
      details: error.message
    }, { status: 500 })
  }
}
