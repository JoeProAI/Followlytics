// COMPREHENSIVE SUBSCRIPTION MANAGEMENT SYSTEM
// Integrates with new tier configs and credit system

import { adminDb as db, adminDb } from '@/lib/firebase-admin'
import { getTierConfig, type TierName } from '@/config/tiers'
import { initializeCredits, refillCredits } from '@/lib/credits'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
})

// Legacy support - map old tier names to new
export type Tier = TierName | 'free'
export type { TierName }

export interface TierLimits {
  daily_searches: number // -1 = unlimited
  monthly_api_calls: number
  competitors: number
  history_days: number
  ai_analysis: boolean
  automated_reports: boolean
  real_time_alerts: boolean
  api_access: boolean
  team_seats: number
}

// Legacy tier limits (kept for backward compatibility)
export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    daily_searches: 5,
    monthly_api_calls: 150,
    competitors: 0,
    history_days: 7,
    ai_analysis: false,
    automated_reports: false,
    real_time_alerts: false,
    api_access: false,
    team_seats: 1
  },
  beta: {
    daily_searches: 5,
    monthly_api_calls: 150,
    competitors: 0,
    history_days: 7,
    ai_analysis: false,
    automated_reports: false,
    real_time_alerts: false,
    api_access: false,
    team_seats: 1
  },
  starter: {
    daily_searches: 50,
    monthly_api_calls: 1500,
    competitors: 5,
    history_days: 30,
    ai_analysis: true,
    automated_reports: true,
    real_time_alerts: true,
    api_access: false,
    team_seats: 1
  },
  pro: {
    daily_searches: 200,
    monthly_api_calls: 6000,
    competitors: 15,
    history_days: 90,
    ai_analysis: true,
    automated_reports: true,
    real_time_alerts: true,
    api_access: false,
    team_seats: 3
  },
  scale: {
    daily_searches: 500,
    monthly_api_calls: 15000,
    competitors: 50,
    history_days: 180,
    ai_analysis: true,
    automated_reports: true,
    real_time_alerts: true,
    api_access: true,
    team_seats: 10
  },
  enterprise: {
    daily_searches: -1,
    monthly_api_calls: -1,
    competitors: -1,
    history_days: 365,
    ai_analysis: true,
    automated_reports: true,
    real_time_alerts: true,
    api_access: true,
    team_seats: 50
  }
}

export async function getUserSubscription(userId: string): Promise<{
  tier: Tier
  status: string
  limits: TierLimits
}> {
  try {
    const subDoc = await db.collection('subscriptions').doc(userId).get()
    
    if (!subDoc.exists) {
      return {
        tier: 'free',
        status: 'active',
        limits: TIER_LIMITS.free
      }
    }

    const sub = subDoc.data()!
    const tier = (sub.tier || 'free') as Tier

    return {
      tier,
      status: sub.status || 'active',
      limits: TIER_LIMITS[tier]
    }
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return {
      tier: 'free',
      status: 'active',
      limits: TIER_LIMITS.free
    }
  }
}

export async function trackAPICall(userId: string, endpoint: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const usageRef = db.collection('usage').doc(`${userId}_${today}`)

  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(usageRef)
      
      if (!doc.exists) {
        transaction.set(usageRef, {
          userId,
          date: today,
          api_calls: 1,
          searches: endpoint.includes('search') ? 1 : 0,
          endpoints: { [endpoint]: 1 },
          created_at: new Date().toISOString()
        })
      } else {
        const data = doc.data()!
        transaction.update(usageRef, {
          api_calls: (data.api_calls || 0) + 1,
          searches: endpoint.includes('search') 
            ? (data.searches || 0) + 1 
            : (data.searches || 0),
          [`endpoints.${endpoint}`]: ((data.endpoints?.[endpoint] || 0) + 1)
        })
      }
    })
  } catch (error) {
    console.error('Error tracking API call:', error)
  }
}

export async function checkUsageLimits(userId: string, endpoint: string): Promise<{
  allowed: boolean
  reason?: string
  usage?: any
}> {
  const subscription = await getUserSubscription(userId)
  const today = new Date().toISOString().split('T')[0]
  const usageRef = db.collection('usage').doc(`${userId}_${today}`)
  
  const usageDoc = await usageRef.get()
  const usage = usageDoc.data() || { api_calls: 0, searches: 0 }

  // Check daily search limit
  if (endpoint.includes('search') || endpoint.includes('intelligence')) {
    const dailyLimit = subscription.limits.daily_searches
    
    // -1 means unlimited
    if (dailyLimit !== -1 && dailyLimit > 0 && usage.searches >= dailyLimit) {
      return {
        allowed: false,
        reason: `Daily search limit reached (${dailyLimit}). Upgrade to search more.`,
        usage
      }
    }
  }

  // Check monthly API call limit (approximate daily limit)
  const monthlyLimit = subscription.limits.monthly_api_calls
  
  // -1 means unlimited, skip check
  if (monthlyLimit !== -1) {
    const dailyApiLimit = Math.floor(monthlyLimit / 30)
    
    if (usage.api_calls >= dailyApiLimit) {
      return {
        allowed: false,
        reason: `Daily API limit reached. Upgrade for more calls.`,
        usage
      }
    }
  }

  return { allowed: true, usage }
}

export async function getMonthlyUsage(userId: string): Promise<{
  api_calls: number
  searches: number
  limit: number
}> {
  const subscription = await getUserSubscription(userId)
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const usageQuery = await db.collection('usage')
    .where('userId', '==', userId)
    .where('date', '>=', startOfMonth.toISOString().split('T')[0])
    .get()

  let totalCalls = 0
  let totalSearches = 0

  usageQuery.docs.forEach(doc => {
    const data = doc.data()
    totalCalls += data.api_calls || 0
    totalSearches += data.searches || 0
  })

  return {
    api_calls: totalCalls,
    searches: totalSearches,
    limit: subscription.limits.monthly_api_calls
  }
}

export async function canAccessFeature(
  userId: string, 
  feature: keyof TierLimits
): Promise<boolean> {
  const subscription = await getUserSubscription(userId)
  const featureValue = subscription.limits[feature]
  
  if (typeof featureValue === 'boolean') {
    return featureValue
  }
  
  if (typeof featureValue === 'number') {
    return featureValue > 0 || featureValue === -1
  }
  
  return false
}
