// Credit Management System
// Handles multi-wallet credits for followers, AI analysis, and tweet generation

import { adminDb } from './firebase-admin'
import { getTierConfig, calculateOverageCost, type TierName } from '@/config/tiers'

export type ServiceType = 'followers' | 'ai_analysis' | 'tweet_generation'

export interface CreditWallet {
  included: number
  rollover: number
  total: number
  used: number
  lastRefillDate: string
}

export interface UserCredits {
  followers: CreditWallet
  ai_analysis: CreditWallet
  tweet_generation: CreditWallet
}

/**
 * Check if user has sufficient credits for an operation
 */
export async function checkCredits(
  userId: string,
  service: ServiceType,
  amount: number
): Promise<{
  sufficient: boolean
  available: number
  required: number
  wouldBeOverage: boolean
  overageCost?: number
  tier?: TierName
}> {
  const userDoc = await adminDb.collection('users').doc(userId).get()
  
  if (!userDoc.exists) {
    throw new Error('User not found')
  }
  
  const userData = userDoc.data()!
  const tier = userData.subscription?.tier || 'beta'
  const credits = userData.credits?.[service]
  
  if (!credits) {
    // User has no credits initialized
    return {
      sufficient: false,
      available: 0,
      required: amount,
      wouldBeOverage: true,
      overageCost: calculateOverageCost(tier, service, amount),
      tier,
    }
  }
  
  const available = credits.total - credits.used
  const sufficient = available >= amount
  const wouldBeOverage = !sufficient
  
  let overageCost = 0
  if (wouldBeOverage) {
    const overageAmount = amount - available
    overageCost = calculateOverageCost(tier, service, overageAmount)
  }
  
  return {
    sufficient,
    available,
    required: amount,
    wouldBeOverage,
    overageCost,
    tier,
  }
}

/**
 * Deduct credits from user's wallet
 */
export async function deductCredits(
  userId: string,
  service: ServiceType,
  amount: number,
  metadata: {
    description: string
    endpoint?: string
    username?: string
  }
): Promise<{
  success: boolean
  deducted: number
  overageCharged: number
  newBalance: number
  error?: string
}> {
  const userRef = adminDb.collection('users').doc(userId)
  
  return await adminDb.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef)
    
    if (!userDoc.exists) {
      return {
        success: false,
        deducted: 0,
        overageCharged: 0,
        newBalance: 0,
        error: 'User not found',
      }
    }
    
    const userData = userDoc.data()!
    const tier = userData.subscription?.tier || 'beta'
    const credits = userData.credits?.[service] || {
      included: 0,
      rollover: 0,
      total: 0,
      used: 0,
      lastRefillDate: new Date().toISOString(),
    }
    
    const available = credits.total - credits.used
    const newUsed = credits.used + Math.min(amount, credits.total)
    
    let overageCharged = 0
    if (amount > available) {
      // Calculate overage cost
      const overageAmount = amount - available
      overageCharged = calculateOverageCost(tier, service, overageAmount)
      
      // Add to overage balance
      const currentOverage = userData.overage?.[service] || 0
      transaction.update(userRef, {
        [`overage.${service}`]: currentOverage + overageCharged,
        'overage.total': (userData.overage?.total || 0) + overageCharged,
      })
    }
    
    // Update credits
    transaction.update(userRef, {
      [`credits.${service}.used`]: newUsed,
    })
    
    // Log transaction
    transaction.create(adminDb.collection('credit_transactions').doc(), {
      userId,
      timestamp: new Date().toISOString(),
      type: 'usage',
      service,
      amount: -amount,
      balanceBefore: available,
      balanceAfter: available - Math.min(amount, available),
      metadata: {
        ...metadata,
        isOverage: amount > available,
        overageCharged,
      },
    })
    
    // Log usage
    transaction.create(adminDb.collection('usage_logs').doc(), {
      userId,
      timestamp: new Date().toISOString(),
      service: `${service}_usage` as any,
      details: metadata,
      credits: {
        used: amount,
        remaining: Math.max(0, available - amount),
        isOverage: amount > available,
        overageCharge: overageCharged,
      },
    })
    
    return {
      success: true,
      deducted: Math.min(amount, available),
      overageCharged,
      newBalance: Math.max(0, available - amount),
    }
  })
}

/**
 * Refill credits at the start of billing period
 */
export async function refillCredits(userId: string): Promise<void> {
  const userRef = adminDb.collection('users').doc(userId)
  
  await adminDb.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef)
    
    if (!userDoc.exists) {
      throw new Error('User not found')
    }
    
    const userData = userDoc.data()!
    const tier = userData.subscription?.tier || 'beta'
    const tierConfig = getTierConfig(tier)
    const now = new Date().toISOString()
    
    // Calculate rollover for each service
    const services: ServiceType[] = ['followers', 'ai_analysis', 'tweet_generation']
    
    for (const service of services) {
      const currentCredits = userData.credits?.[service] || {
        included: 0,
        rollover: 0,
        total: 0,
        used: 0,
        lastRefillDate: now,
      }
      
      const unused = Math.max(0, currentCredits.total - currentCredits.used)
      const maxRollover = tierConfig.credits[service] * 2 // Max 2x monthly allocation
      const newRollover = Math.min(unused, maxRollover)
      const newIncluded = tierConfig.credits[service]
      const newTotal = newIncluded + newRollover
      
      transaction.update(userRef, {
        [`credits.${service}.included`]: newIncluded,
        [`credits.${service}.rollover`]: newRollover,
        [`credits.${service}.total`]: newTotal,
        [`credits.${service}.used`]: 0,
        [`credits.${service}.lastRefillDate`]: now,
      })
      
      // Log rollover transaction
      if (newRollover > 0) {
        transaction.create(adminDb.collection('credit_transactions').doc(), {
          userId,
          timestamp: now,
          type: 'rollover',
          service,
          amount: newRollover,
          balanceBefore: unused,
          balanceAfter: newTotal,
          metadata: {
            billingPeriod: now.substring(0, 7), // YYYY-MM
          },
        })
      }
      
      // Log refill transaction
      transaction.create(adminDb.collection('credit_transactions').doc(), {
        userId,
        timestamp: now,
        type: 'refill',
        service,
        amount: newIncluded,
        balanceBefore: newRollover,
        balanceAfter: newTotal,
        metadata: {
          billingPeriod: now.substring(0, 7),
          tier,
        },
      })
    }
  })
}

/**
 * Initialize credits for a new user or tier change
 */
export async function initializeCredits(
  userId: string,
  tier: TierName
): Promise<void> {
  const tierConfig = getTierConfig(tier)
  const now = new Date().toISOString()
  
  await adminDb.collection('users').doc(userId).set(
    {
      credits: {
        followers: {
          included: tierConfig.credits.followers,
          rollover: 0,
          total: tierConfig.credits.followers,
          used: 0,
          lastRefillDate: now,
        },
        ai_analysis: {
          included: tierConfig.credits.ai_analysis,
          rollover: 0,
          total: tierConfig.credits.ai_analysis,
          used: 0,
          lastRefillDate: now,
        },
        tweet_generation: {
          included: tierConfig.credits.tweet_generation,
          rollover: 0,
          total: tierConfig.credits.tweet_generation,
          used: 0,
          lastRefillDate: now,
        },
      },
      overage: {
        followers: 0,
        ai_analysis: 0,
        tweet_generation: 0,
        total: 0,
      },
    },
    { merge: true }
  )
}

/**
 * Get user's current credit balances
 */
export async function getCreditBalances(userId: string): Promise<{
  followers: { available: number; total: number; used: number; percentage: number }
  ai_analysis: { available: number; total: number; used: number; percentage: number }
  tweet_generation: { available: number; total: number; used: number; percentage: number }
  overage: { followers: number; ai_analysis: number; tweet_generation: number; total: number }
}> {
  const userDoc = await adminDb.collection('users').doc(userId).get()
  
  if (!userDoc.exists) {
    throw new Error('User not found')
  }
  
  const userData = userDoc.data()!
  const credits = userData.credits || {}
  const overage = userData.overage || { followers: 0, ai_analysis: 0, tweet_generation: 0, total: 0 }
  
  const calculateStats = (wallet: CreditWallet) => {
    const available = wallet.total - wallet.used
    const percentage = wallet.total > 0 ? (wallet.used / wallet.total) * 100 : 0
    return {
      available,
      total: wallet.total,
      used: wallet.used,
      percentage: Math.round(percentage),
    }
  }
  
  return {
    followers: calculateStats(credits.followers || { included: 0, rollover: 0, total: 0, used: 0, lastRefillDate: '' }),
    ai_analysis: calculateStats(credits.ai_analysis || { included: 0, rollover: 0, total: 0, used: 0, lastRefillDate: '' }),
    tweet_generation: calculateStats(credits.tweet_generation || { included: 0, rollover: 0, total: 0, used: 0, lastRefillDate: '' }),
    overage,
  }
}
