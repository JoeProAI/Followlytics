import { NextRequest, NextResponse } from 'next/server'
import { adminAuth as auth } from '@/lib/firebase-admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

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
    console.error('Checkout creation error:', error)
    return NextResponse.json({
      error: 'Failed to create checkout session',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Stripe Checkout API',
    usage: 'POST with { priceId: string, tier: string }'
  })
}
