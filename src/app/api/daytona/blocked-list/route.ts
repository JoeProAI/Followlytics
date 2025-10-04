import { NextRequest, NextResponse } from 'next/server'
import { withPaymentGate, isPaymentGateError } from '@/lib/paymentGate'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Payment gate: requires Starter tier for blocked list access
    const gateResult = await withPaymentGate(request, {
      requireTier: 'starter',
      trackUsage: true,
      endpoint: '/api/daytona/blocked-list'
    })

    if (isPaymentGateError(gateResult)) {
      return gateResult
    }

    const { userId } = gateResult

    // NOTE: Twitter API v2 blocked/muted lists require OAuth 2.0 user context
    // Bearer token (app-only auth) cannot access these endpoints
    // These endpoints need: blocks.read, mute.read scopes with user authentication
    
    return NextResponse.json({ 
      success: false,
      items: [],
      message: 'Blocked/Muted lists require OAuth 2.0 user authentication',
      technical_note: 'Twitter API v2 blocks.read and mute.read scopes require user context authentication, not available with bearer token',
      alternative: 'Connect your Twitter account via OAuth to access this feature (coming soon)',
      provider: 'twitter-api-v2'
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch blocked list', details: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Blocked list endpoint. Use POST with Authorization header.' })
}
