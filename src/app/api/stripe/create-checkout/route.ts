import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth } from '@/lib/firebase-admin'
import Stripe from 'stripe'

// Validate Stripe key exists
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not set in environment variables')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-09-30.clover'
})

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ Stripe not configured: STRIPE_SECRET_KEY missing')
      return NextResponse.json({ 
        error: 'Stripe not configured',
        details: 'STRIPE_SECRET_KEY environment variable is not set'
      }, { status: 500 })
    }

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

    const { priceId, tier } = await request.json()
    
    if (!priceId || !tier) {
      return NextResponse.json({ 
        error: 'Price ID and tier are required' 
      }, { status: 400 })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      client_reference_id: decodedToken.uid,
      customer_email: decodedToken.email,
      metadata: {
        userId: decodedToken.uid,
        tier: tier,
        email: decodedToken.email || ''
      },
      subscription_data: {
        metadata: {
          userId: decodedToken.uid,
          tier: tier
        }
      }
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url
    })

  } catch (error: any) {
    console.error('❌ Checkout creation error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack,
      raw: error.raw
    })
    
    // Better error messages for common issues
    let userMessage = error.message
    if (error.message?.includes('API key')) {
      userMessage = 'Stripe API key is invalid or not set'
    } else if (error.message?.includes('price')) {
      userMessage = 'Invalid price ID. Please contact support.'
    } else if (error.type === 'StripeAuthenticationError') {
      userMessage = 'Stripe authentication failed. API keys may be incorrect.'
    }
    
    return NextResponse.json({
      error: 'Failed to create checkout session',
      details: userMessage,
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Stripe Checkout API',
    usage: 'POST with { priceId: string, tier: string }'
  })
}
