import { NextRequest, NextResponse } from 'next/server'
import { withPaymentGate, isPaymentGateError } from '@/lib/paymentGate'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Payment gate: requires Pro tier for block checking
    const gateResult = await withPaymentGate(request, {
      requireTier: 'pro',
      trackUsage: true,
      endpoint: '/api/daytona/block-check'
    })

    if (isPaymentGateError(gateResult)) {
      return gateResult
    }

    const { userId } = gateResult
    const { usernames = [] } = await request.json()
    if (!Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ error: 'Provide usernames array' }, { status: 400 })
    }

    // Placeholder: Daytona-powered bulk checker to be wired next
    const results = usernames.map((u: string) => ({ username: u.replace('@',''), blocksYou: false }))
    return NextResponse.json({ success: true, results, provider: 'daytona', note: 'placeholder' })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed block-check', details: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Block-check endpoint. POST { usernames: string[] } with Authorization.' })
}
