import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-09-30.clover'
})

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ 
        error: 'Stripe not configured' 
      }, { status: 500 })
    }

    const { username, amount, includeGamma, gammaStyle, customInstructions } = await request.json()
    
    if (!username || amount === undefined) {
      return NextResponse.json({ 
        error: 'Username and amount are required' 
      }, { status: 400 })
    }

    // Build line items
    const lineItems: any[] = []
    
    // Main follower data export
    if (amount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Follower Data Export - @${username}`,
            description: 'Complete follower database with CSV, JSON, and Excel formats'
          },
          unit_amount: Math.round(amount * 100) // Convert to cents
        },
        quantity: 1
      })
    }

    // If amount is 0 and has Gamma, just Gamma
    if (amount === 0 && includeGamma) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Gamma Report - @${username}`,
            description: `AI-generated presentation (${gammaStyle} style)`
          },
          unit_amount: 0 // Free
        },
        quantity: 1
      })
    }

    // If no line items, it's completely free
    if (lineItems.length === 0) {
      // For free exports, redirect directly to success page
      return NextResponse.json({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/export/success?username=${username}&free=true`,
        free: true
      })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_creation: 'always', // Always create a customer (requires email)
      billing_address_collection: 'auto',
      phone_number_collection: {
        enabled: false
      },
      allow_promotion_codes: true, // Allow coupon codes
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/export/success?session_id={CHECKOUT_SESSION_ID}&username=${username}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/export?username=${username}`,
      // Custom branding
      custom_text: {
        submit: {
          message: 'Get instant access to your follower data after payment'
        }
      },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Follower Data Export for @${username}`,
          metadata: {
            username,
            product: 'follower_export'
          }
        }
      },
      metadata: {
        username,
        includeGamma: includeGamma ? 'true' : 'false',
        gammaStyle: gammaStyle || '',
        customInstructions: customInstructions || '',
        amount: amount.toString()
      }
    })

    return NextResponse.json({
      url: session.url,
      sessionId: session.id
    })

  } catch (error: any) {
    console.error('Checkout creation error:', error)
    
    return NextResponse.json({
      error: 'Failed to create checkout session',
      details: error.message
    }, { status: 500 })
  }
}
