import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession, SUBSCRIPTION_TIERS } from '@/lib/stripe'
import { auth } from '@/lib/firebase'

export async function POST(request: NextRequest) {
  try {
    const { priceId, userId } = await request.json()

    if (!priceId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the price ID exists in our tiers
    const tier = Object.values(SUBSCRIPTION_TIERS).find(t => t.priceId === priceId)
    if (!tier) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const successUrl = `${baseUrl}/dashboard?success=true&tier=${tier.id}`
    const cancelUrl = `${baseUrl}/pricing?canceled=true`

    const session = await createCheckoutSession(
      priceId,
      userId,
      successUrl,
      cancelUrl
    )

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Checkout session error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
