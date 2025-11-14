import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    // Get follower data from database
    const dataDoc = await adminDb.collection('follower_database').doc(username).get()
    
    if (!dataDoc.exists) {
      return NextResponse.json({ 
        error: 'Data not ready yet',
        ready: false,
        message: 'Your data is still being extracted. Please check back in a few minutes or check your email.'
      }, { status: 202 })
    }

    const data = dataDoc.data()
    
    // Verify access (free, test, or paid with matching session)
    const hasAccess = sessionId === 'email_access' || // Email link access
                      sessionId === 'free' || 
                      sessionId === 'manual-test' ||
                      sessionId === 'test' ||
                      data?.accessGranted?.includes(sessionId) ||
                      data?.accessGranted?.includes('test') ||
                      data?.paidAccess?.some((p: any) => p.sessionId === sessionId)

    if (!hasAccess) {
      return NextResponse.json({ 
        error: 'Access denied',
        ready: false 
      }, { status: 403 })
    }

    // Check if extraction is in progress
    const progress = data?.extractionProgress
    const followerCount = data?.followerCount || 0
    const isComplete = progress?.status === 'complete' && followerCount > 0
    
    // Get payment details for Gamma generation
    const payment = data?.paidAccess?.find((p: any) => p.sessionId === sessionId)
    const customInstructions = payment?.customInstructions || data?.customerEmail || 'AI and Tech'
    const gammaStyle = payment?.gammaStyle || 'professional'
    
    // If not complete, return 202 so success page triggers extraction
    if (!isComplete) {
      return NextResponse.json({
        username,
        followerCount: followerCount,
        ready: false,
        progress: progress || {
          status: 'pending',
          message: 'Preparing extraction...',
          percentage: 0
        },
        customInstructions,
        gammaStyle
      }, { status: 202 })
    }
    
    // Check if there's a completed Gamma presentation
    const gammaData = data?.gammaGeneration
    let gammaStatus = null
    
    if (gammaData?.gammaId && gammaData?.status === 'complete' && gammaData?.viewUrl) {
      gammaStatus = {
        gammaId: gammaData.gammaId,
        url: gammaData.viewUrl,
        status: 'complete'
      }
      console.log('[Get Data] Found completed Gamma presentation:', gammaData.gammaId)
    }
    
    // Return complete data (followers are in subcollection, not in main doc)
    return NextResponse.json({
      username,
      followerCount: followerCount,
      ready: true,
      extractedAt: data?.lastExtractedAt,
      progress: progress,
      gamma: gammaStatus  // Include Gamma status if available
    })

  } catch (error: any) {
    console.error('Get data error:', error)
    return NextResponse.json({
      error: 'Failed to get data',
      details: error.message
    }, { status: 500 })
  }
}
