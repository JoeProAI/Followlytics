import { NextRequest, NextResponse } from 'next/server'
import XAPIService from '@/lib/xapi'
import { withPaymentGate, isPaymentGateError } from '@/lib/paymentGate'

export async function POST(request: NextRequest) {
  try {
    // Payment gate: Starter tier can use hashtag tracking
    const gateResult = await withPaymentGate(request, {
      requireTier: 'starter',
      trackUsage: true,
      endpoint: '/api/x-analytics/hashtag'
    })

    if (isPaymentGateError(gateResult)) {
      return gateResult
    }

    const { userId } = gateResult
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
