import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export interface SubscriptionTier {
  id: string
  name: string
  price: number
  priceId: string
  features: {
    accounts: number
    historyDays: number
    aiInsights: boolean
    webhooks: boolean
    exportData: boolean
  }
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: '',
    features: {
      accounts: 1,
      historyDays: 7,
      aiInsights: false,
      webhooks: false,
      exportData: false
    }
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 19,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    features: {
      accounts: 1,
      historyDays: 30,
      aiInsights: true,
      webhooks: false,
      exportData: true
    }
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 49,
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID!,
    features: {
      accounts: 3,
      historyDays: 90,
      aiInsights: true,
      webhooks: true,
      exportData: true
    }
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    price: 149,
    priceId: process.env.STRIPE_AGENCY_PRICE_ID!,
    features: {
      accounts: 10,
      historyDays: 365,
      aiInsights: true,
      webhooks: true,
      exportData: true
    }
  }
}

export async function createCheckoutSession(
  priceId: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    metadata: {
      userId,
    },
  })

  return session
}

export async function createPortalSession(customerId: string, returnUrl: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

export async function handleWebhook(body: string, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err}`)
  }

  return event
}

export default stripe
