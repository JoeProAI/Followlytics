import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminAuth } from '@/lib/firebase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
})

// Create Stripe payment for credits purchase
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    const { amount } = await req.json() // Amount in dollars: 50, 100, 250, 500

    if (!amount || amount < 50) {
      return NextResponse.json({ 
        error: 'Minimum purchase is $50' 
      }, { status: 400 })
    }

    // Calculate bonus credits
    let credits = amount
    let bonus = 0
    if (amount >= 500) {
      bonus = amount * 0.10
      credits = amount * 1.10
    } else if (amount >= 100) {
      bonus = amount * 0.05
      credits = amount * 1.05
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      metadata: {
        userId,
        credits: credits.toString(),
        bonus: bonus.toString(),
        type: 'api_credits',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount,
      credits,
      bonus,
    })

  } catch (error: any) {
    console.error('[Credits] Error creating payment:', error)
    return NextResponse.json({ 
      error: 'Failed to create payment',
      details: error.message 
    }, { status: 500 })
  }
}
