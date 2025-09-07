import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

// Initialize Firebase Admin dynamically
async function initializeFirebaseAdmin() {
  try {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app')
    const { getFirestore } = await import('firebase-admin/firestore')
    
    if (getApps().length === 0) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        })
      })
    }
    
    return getFirestore()
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature')
  const body = await request.text()
  
  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }
  
  let event: Stripe.Event
  
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  
  const db = await initializeFirebaseAdmin()
  
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription, db)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription, db)
        break
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice, db)
        break
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, db)
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription, db: any) {
  const userId = subscription.metadata.userId
  if (!userId) return
  
  const tier = getTierFromPriceId(subscription.items.data[0].price.id)
  
  await db.collection('users').doc(userId).update({
    'subscription.status': subscription.status,
    'subscription.tier': tier,
    'subscription.currentPeriodEnd': subscription.current_period_end,
    'subscription.updatedAt': new Date().toISOString()
  })
  
  // Reset usage limits on subscription update
  await resetUsageLimits(userId, tier, db)
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription, db: any) {
  const userId = subscription.metadata.userId
  if (!userId) return
  
  await db.collection('users').doc(userId).update({
    'subscription.status': 'canceled',
    'subscription.tier': 'starter',
    'subscription.canceledAt': new Date().toISOString()
  })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, db: any) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const userId = subscription.metadata.userId
    
    if (userId) {
      // Reset usage limits on successful payment
      const tier = getTierFromPriceId(subscription.items.data[0].price.id)
      await resetUsageLimits(userId, tier, db)
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice, db: any) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const userId = subscription.metadata.userId
    
    if (userId) {
      await db.collection('users').doc(userId).update({
        'subscription.status': 'past_due',
        'subscription.lastPaymentFailed': new Date().toISOString()
      })
    }
  }
}

async function resetUsageLimits(userId: string, tier: string, db: any) {
  const limits = {
    starter: 10000,
    professional: 100000,
    business: 500000,
    enterprise: 999999999
  }
  
  const today = new Date().toISOString().split('T')[0]
  
  await db.collection('usage').doc(`${userId}_${today}`).set({
    userId,
    date: today,
    calls: 0,
    limit: limits[tier as keyof typeof limits] || 10000,
    resetAt: new Date().toISOString()
  })
}

function getTierFromPriceId(priceId: string): string {
  const priceToTier: { [key: string]: string } = {
    'price_starter': 'starter',
    'price_professional': 'professional',
    'price_business': 'business', 
    'price_enterprise': 'enterprise'
  }
  return priceToTier[priceId] || 'starter'
}
