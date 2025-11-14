import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ 
        success: false,
        error: 'Token required' 
      }, { status: 400 })
    }

    // Look up token in download_tokens collection
    const tokenDoc = await adminDb.collection('download_tokens').doc(token).get()
    
    if (!tokenDoc.exists) {
      console.log('[Verify Token] Token not found:', token)
      return NextResponse.json({ 
        success: false,
        error: 'Invalid token' 
      }, { status: 404 })
    }

    const tokenData = tokenDoc.data()!
    
    // Token found - return username
    console.log('[Verify Token] Valid token for:', tokenData.username)
    
    return NextResponse.json({
      success: true,
      username: tokenData.username
    })

  } catch (error: any) {
    console.error('[Verify Token] Error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Verification failed' 
    }, { status: 500 })
  }
}
