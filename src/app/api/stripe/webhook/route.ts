import { NextRequest, NextResponse } from 'next/server'
import { adminDb as db } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log(`[Stripe Webhook] Event: ${event.type}`)

    // Handle subscription events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCanceled(subscription)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('[Stripe Webhook] Error:', error)
    return NextResponse.json({
      error: 'Webhook handler failed',
      details: error.message
    }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Check if this is a follower export payment or subscription payment
  const username = session.metadata?.username
  const userId = session.metadata?.userId
  const tier = session.metadata?.tier

  // FOLLOWER EXPORT PAYMENT
  if (username) {
    console.log(`[Checkout Completed] Follower export payment for @${username}`)
    
    const amount = parseFloat(session.metadata?.amount || '0')
    const includeGamma = session.metadata?.includeGamma === 'true'
    const gammaStyle = session.metadata?.gammaStyle || ''
    const customInstructions = session.metadata?.customInstructions || ''
    
    // Grant access to follower data
    await db.collection('follower_database').doc(username).set({
      accessGranted: FieldValue.arrayUnion(session.customer_email || session.id),
      paidAccess: FieldValue.arrayUnion({
        sessionId: session.id,
        email: session.customer_email,
        amount,
        includeGamma,
        gammaStyle,
        customInstructions,
        paidAt: new Date().toISOString()
      })
    }, { merge: true })
    
    // Store payment record
    await db.collection('payments').doc(session.id).set({
      type: 'follower_export',
      username,
      amount,
      includeGamma,
      gammaStyle,
      customInstructions,
      sessionId: session.id,
      customerId: session.customer,
      customerEmail: session.customer_email,
      status: 'completed',
      createdAt: new Date().toISOString()
    })
    
    console.log(`[Payment Success] @${username} - Access granted to ${session.customer_email}`)
    return
  }

  // SUBSCRIPTION PAYMENT
  if (!userId || !tier) {
    console.error('Missing userId or tier in session metadata')
    return
  }

  console.log(`[Checkout Completed] User ${userId} subscribed to ${tier}`)

  // Update user subscription in Firestore
  await db.collection('subscriptions').doc(userId).set({
    userId,
    tier,
    status: 'active',
    customerId: session.customer,
    subscriptionId: session.subscription,
    current_period_start: new Date(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { merge: true })
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  const tier = subscription.metadata?.tier

  if (!userId) {
    console.error('Missing userId in subscription metadata')
    return
  }

  console.log(`[Subscription Updated] User ${userId} - Status: ${subscription.status}`)

  await db.collection('subscriptions').doc(userId).set({
    userId,
    tier,
    status: subscription.status,
    subscriptionId: subscription.id,
    customerId: subscription.customer as string,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString()
  }, { merge: true })
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('Missing userId in subscription metadata')
    return
  }

  console.log(`[Subscription Canceled] User ${userId}`)

  await db.collection('subscriptions').doc(userId).set({
    status: 'canceled',
    canceled_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { merge: true })
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const userId = invoice.subscription_details?.metadata?.userId

  if (!userId) return

  console.log(`[Invoice Paid] User ${userId} - Amount: $${(invoice.amount_paid / 100).toFixed(2)}`)

  // Log payment in Firestore
  await db.collection('payments').add({
    userId,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency,
    status: 'paid',
    invoice_id: invoice.id,
    created_at: new Date().toISOString()
  })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const userId = invoice.subscription_details?.metadata?.userId

  if (!userId) return

  console.log(`[Payment Failed] User ${userId}`)

  // Update subscription status
  await db.collection('subscriptions').doc(userId).set({
    status: 'past_due',
    payment_failed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { merge: true })
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Stripe Webhook Endpoint',
    note: 'This endpoint receives events from Stripe',
    events_handled: [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_failed'
    ]
  })
}
