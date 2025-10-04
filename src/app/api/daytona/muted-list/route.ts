import { NextRequest, NextResponse } from 'next/server'
import { withPaymentGate, isPaymentGateError } from '@/lib/paymentGate'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Payment gate: requires Enterprise tier for muted list scraping
    const gateResult = await withPaymentGate(request, {
      requireTier: 'enterprise',
      trackUsage: true,
      endpoint: '/api/daytona/muted-list'
    })

    if (isPaymentGateError(gateResult)) {
      return gateResult
    }

    const { userId } = gateResult

    // Placeholder: Daytona-powered scraping to be wired next
    return NextResponse.json({ success: true, items: [], provider: 'daytona', note: 'placeholder' })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch muted list', details: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Muted list endpoint. Use POST with Authorization header.' })
}
