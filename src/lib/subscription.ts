import { adminDb as db } from '@/lib/firebase-admin'

export type Tier = 'free' | 'starter' | 'pro' | 'enterprise'

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
  starter: {
    daily_searches: 20,
    monthly_api_calls: 600,
    competitors: 3,
    history_days: 30,
    ai_analysis: false,
    automated_reports: true,
    real_time_alerts: false,
    api_access: false,
    team_seats: 1
  },
  pro: {
    daily_searches: 100,
    monthly_api_calls: 3000,
    competitors: 10,
    history_days: 90,
    ai_analysis: true,
    automated_reports: true,
    real_time_alerts: true,
    api_access: false,
    team_seats: 1
  },
  enterprise: {
    daily_searches: -1, // unlimited
    monthly_api_calls: 5000,
    competitors: 50,
    history_days: 365,
    ai_analysis: true,
    automated_reports: true,
    real_time_alerts: true,
    api_access: true,
    team_seats: 5
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
    
    if (dailyLimit > 0 && usage.searches >= dailyLimit) {
      return {
        allowed: false,
        reason: `Daily search limit reached (${dailyLimit}). Upgrade to search more.`,
        usage
      }
    }
  }

  // Check monthly API call limit (approximate daily limit)
  const dailyApiLimit = Math.floor(subscription.limits.monthly_api_calls / 30)
  
  if (usage.api_calls >= dailyApiLimit) {
    return {
      allowed: false,
      reason: `Daily API limit reached. Upgrade for more calls.`,
      usage
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
