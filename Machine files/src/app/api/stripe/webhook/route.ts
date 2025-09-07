import { NextRequest, NextResponse } from 'next/server'
import { handleWebhook } from '@/lib/stripe'
import { db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import admin from 'firebase-admin'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  try {
    const event = await handleWebhook(body, signature)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as any)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as any)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as any)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as any)
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 })
  }
}

async function handleCheckoutCompleted(session: any) {
  const userId = session.client_reference_id
  const customerId = session.customer
  const subscriptionId = session.subscription

  if (!userId) return

  // Update user's subscription status
  await admin.firestore().collection('users').doc(userId).update({
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    subscription: getSubscriptionTier(session.amount_total),
    subscriptionStatus: 'active',
    updatedAt: admin.firestore.Timestamp.now()
  })
}

async function handleSubscriptionUpdated(subscription: any) {
  const customerId = subscription.customer
  
  // Find user by customer ID
  const usersQuery = await admin.firestore()
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()

  if (!usersQuery.empty) {
    const userDoc = usersQuery.docs[0]
    await userDoc.ref.update({
      subscription: getSubscriptionTier(subscription.items.data[0].price.unit_amount),
      subscriptionStatus: subscription.status,
      updatedAt: admin.firestore.Timestamp.now()
    })
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.customer
  
  const usersQuery = await admin.firestore()
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get()

  if (!usersQuery.empty) {
    const userDoc = usersQuery.docs[0]
    await userDoc.ref.update({
      subscription: 'free',
      subscriptionStatus: 'canceled',
      updatedAt: admin.firestore.Timestamp.now()
    })
  }
}

async function handlePaymentFailed(invoice: any) {
  // Handle failed payments - could send notifications, etc.
  console.log('Payment failed for customer:', invoice.customer)
}

function getSubscriptionTier(amountInCents: number): string {
  switch (amountInCents) {
    case 1900: return 'starter'    // $19.00
    case 4900: return 'professional' // $49.00
    case 14900: return 'agency'    // $149.00
    default: return 'free'
  }
}
