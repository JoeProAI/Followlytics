import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { cookies } from 'next/headers'

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
  try {
    const { priceId } = await request.json()
    
    // Get user from Firebase token
    const cookieStore = cookies()
    const token = cookieStore.get('firebase_token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Decode token to get user ID
    let userId: string
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length !== 3) throw new Error('Invalid token format')
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      userId = payload.uid
      if (!userId) throw new Error('No user ID in token')
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const db = await initializeFirebaseAdmin()
    const userDoc = await db.collection('users').doc(userId).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const userData = userDoc.data()!
    let customerId = userData.stripeCustomerId
    
    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        name: userData.displayName,
        metadata: { userId }
      })
      customerId = customer.id
      
      // Update user with customer ID
      await db.collection('users').doc(userId).update({
        stripeCustomerId: customerId
      })
    }
    
    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId }
    })
    
    // Update user subscription in Firestore
    const tier = getTierFromPriceId(priceId)
    await db.collection('users').doc(userId).update({
      subscription: {
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        tier,
        currentPeriodEnd: subscription.current_period_end,
        createdAt: new Date().toISOString()
      }
    })
    
    const latestInvoice = subscription.latest_invoice as Stripe.Invoice
    const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent
    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret
    })
    
  } catch (error) {
    console.error('Subscription creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' }, 
      { status: 500 }
    )
  }
}

function getTierFromPriceId(priceId: string): string {
  // Map price IDs to tiers - you'll need to set these up in Stripe
  const priceToTier: { [key: string]: string } = {
    'price_starter': 'starter',
    'price_professional': 'professional', 
    'price_business': 'business',
    'price_enterprise': 'enterprise'
  }
  return priceToTier[priceId] || 'starter'
}
