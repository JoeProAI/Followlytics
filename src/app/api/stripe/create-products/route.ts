import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

/**
 * One-time setup: Create Stripe products and prices
 * Run this once, then delete or protect this endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Security: Only allow in development or with secret key
    const { secret } = await request.json()
    if (secret !== process.env.STRIPE_SETUP_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Creating Stripe products...')

    // Create STARTER product
    const starterProduct = await stripe.products.create({
      name: 'XScope Starter',
      description: 'Perfect for solo creators and small brands',
      metadata: {
        tier: 'starter',
        searches_per_day: '20',
        competitors: '3',
        history_days: '30'
      }
    })

    const starterPrice = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 2900, // $29.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        tier: 'starter'
      }
    })

    // Create PRO product
    const proProduct = await stripe.products.create({
      name: 'XScope Pro',
      description: 'AI-powered insights for growing brands',
      metadata: {
        tier: 'pro',
        searches_per_day: '100',
        competitors: '10',
        history_days: '90',
        featured: 'true'
      }
    })

    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 7900, // $79.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        tier: 'pro'
      }
    })

    // Create ENTERPRISE product
    const enterpriseProduct = await stripe.products.create({
      name: 'XScope Enterprise',
      description: 'Full intelligence suite for enterprises',
      metadata: {
        tier: 'enterprise',
        searches_per_day: 'unlimited',
        competitors: '50',
        history_days: '365'
      }
    })

    const enterprisePrice = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 19900, // $199.00
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        tier: 'enterprise'
      }
    })

    console.log('Products created successfully!')

    return NextResponse.json({
      success: true,
      products: {
        starter: {
          product_id: starterProduct.id,
          price_id: starterPrice.id,
          amount: '$29/mo'
        },
        pro: {
          product_id: proProduct.id,
          price_id: proPrice.id,
          amount: '$79/mo'
        },
        enterprise: {
          product_id: enterpriseProduct.id,
          price_id: enterprisePrice.id,
          amount: '$199/mo'
        }
      },
      message: 'Save these IDs to your .env file!',
      env_vars: {
        STRIPE_PRICE_STARTER: starterPrice.id,
        STRIPE_PRICE_PRO: proPrice.id,
        STRIPE_PRICE_ENTERPRISE: enterprisePrice.id
      }
    })

  } catch (error: any) {
    console.error('Stripe setup error:', error)
    return NextResponse.json({
      error: 'Failed to create products',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Stripe Product Setup',
    usage: 'POST with { secret: STRIPE_SETUP_SECRET }',
    warning: 'This creates products in Stripe. Run once only!'
  })
}
