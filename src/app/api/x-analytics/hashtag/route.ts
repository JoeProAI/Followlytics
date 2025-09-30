import { NextRequest, NextResponse } from 'next/server'
import XAPIService from '@/lib/xapi'
import { adminAuth as auth } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await auth.verifyIdToken(token)
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { hashtag, maxResults = 100 } = await request.json()
    
    if (!hashtag) {
      return NextResponse.json({ error: 'Hashtag is required' }, { status: 400 })
    }

    // Initialize X API service
    const xapi = new XAPIService()
    
    // Analyze hashtag
    const analysis = await xapi.analyzeHashtag(hashtag, maxResults)
    
    return NextResponse.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Hashtag Analysis API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to analyze hashtag',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Hashtag Analysis API',
    usage: 'POST with { hashtag: "AI", maxResults: 100 }',
    note: 'Returns engagement metrics, top tweets, and trends'
  })
}
