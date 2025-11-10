// Subscription Tier Configuration
// This is the SINGLE SOURCE OF TRUTH for all pricing and features

export type TierName = 'beta' | 'starter' | 'pro' | 'scale' | 'enterprise'

export interface TierConfig {
  name: TierName
  displayName: string
  price: number
  stripePriceId: string
  popular?: boolean
  
  credits: {
    followers: number        // Number of followers that can be extracted
    ai_analysis: number      // Number of profiles that can be analyzed
    tweet_generation: number // Number of tweets that can be generated
  }
  
  overageRates: {
    followers: number         // $ per 1,000 followers
    ai_analysis: number       // $ per profile analyzed
    tweet_generation: number  // $ per tweet generated
  }
  
  features: {
    growthTracking: boolean
    competitorAnalysis: boolean
    emailExtraction: boolean
    apiAccess: boolean
    teamSeats: number
    prioritySupport: boolean
    whiteLabel: boolean
    customIntegrations: boolean
  }
  
  limits: {
    maxCompetitors: number
    apiCallsPerDay: number
    sandboxHoursPerMonth: number
  }
}

export const TIER_CONFIGS: Record<TierName, TierConfig> = {
  beta: {
    name: 'beta',
    displayName: 'Beta (Free)',
    price: 0,
    stripePriceId: '', // No Stripe price for free tier
    
    credits: {
      followers: 2_000,  // 2,000/month allows few extractions without spam
      ai_analysis: 10,
      tweet_generation: 5,
    },
    
    overageRates: {
      followers: 2.00,      // Encourage upgrade
      ai_analysis: 0.20,
      tweet_generation: 1.00,
    },
    
    features: {
      growthTracking: false,
      competitorAnalysis: false,
      emailExtraction: false,
      apiAccess: false,
      teamSeats: 1,
      prioritySupport: false,
      whiteLabel: false,
      customIntegrations: false,
    },
    
    limits: {
      maxCompetitors: 0,
      apiCallsPerDay: 0,
      sandboxHoursPerMonth: 0,
    },
  },
  
  starter: {
    name: 'starter',
    displayName: 'Starter',
    price: 39,
    stripePriceId: process.env.STRIPE_PRICE_STARTER || '',
    
    credits: {
      followers: 50_000,
      ai_analysis: 100,
      tweet_generation: 25,
    },
    
    overageRates: {
      followers: 1.50,
      ai_analysis: 0.15,
      tweet_generation: 0.75,
    },
    
    features: {
      growthTracking: true,
      competitorAnalysis: false,
      emailExtraction: true,
      apiAccess: false,
      teamSeats: 1,
      prioritySupport: false,
      whiteLabel: false,
      customIntegrations: false,
    },
    
    limits: {
      maxCompetitors: 0,
      apiCallsPerDay: 0,
      sandboxHoursPerMonth: 2,
    },
  },
  
  pro: {
    name: 'pro',
    displayName: 'Pro',
    price: 99,
    stripePriceId: process.env.STRIPE_PRICE_PRO || '',
    popular: true,
    
    credits: {
      followers: 300_000,
      ai_analysis: 500,
      tweet_generation: 100,
    },
    
    overageRates: {
      followers: 1.00,
      ai_analysis: 0.10,
      tweet_generation: 0.50,
    },
    
    features: {
      growthTracking: true,
      competitorAnalysis: true,
      emailExtraction: true,
      apiAccess: false,
      teamSeats: 3,
      prioritySupport: true,
      whiteLabel: false,
      customIntegrations: false,
    },
    
    limits: {
      maxCompetitors: 3,
      apiCallsPerDay: 0,
      sandboxHoursPerMonth: 10,
    },
  },
  
  scale: {
    name: 'scale',
    displayName: 'Scale',
    price: 299,
    stripePriceId: process.env.STRIPE_PRICE_SCALE || '',
    
    credits: {
      followers: 2_000_000,
      ai_analysis: 2_000,
      tweet_generation: 300,
    },
    
    overageRates: {
      followers: 0.75,
      ai_analysis: 0.08,
      tweet_generation: 0.40,
    },
    
    features: {
      growthTracking: true,
      competitorAnalysis: true,
      emailExtraction: true,
      apiAccess: true,
      teamSeats: 10,
      prioritySupport: true,
      whiteLabel: true,
      customIntegrations: false,
    },
    
    limits: {
      maxCompetitors: 10,
      apiCallsPerDay: 500,
      sandboxHoursPerMonth: 50,
    },
  },
  
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    price: 1499,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || '',
    
    credits: {
      followers: 10_000_000,
      ai_analysis: 10_000,
      tweet_generation: 1_000,
    },
    
    overageRates: {
      followers: 0.50,
      ai_analysis: 0.05,
      tweet_generation: 0.25,
    },
    
    features: {
      growthTracking: true,
      competitorAnalysis: true,
      emailExtraction: true,
      apiAccess: true,
      teamSeats: 50,
      prioritySupport: true,
      whiteLabel: true,
      customIntegrations: true,
    },
    
    limits: {
      maxCompetitors: 999,
      apiCallsPerDay: 10_000,
      sandboxHoursPerMonth: 500,
    },
  },
}

// Helper functions
export function getTierConfig(tier: TierName): TierConfig {
  return TIER_CONFIGS[tier]
}

export function calculateOverageCost(
  tier: TierName,
  service: 'followers' | 'ai_analysis' | 'tweet_generation',
  amount: number
): number {
  const config = getTierConfig(tier)
  const rate = config.overageRates[service]
  
  if (service === 'followers') {
    // Followers are priced per 1,000
    return (amount / 1000) * rate
  }
  
  // AI analysis and tweet generation are per-unit
  return amount * rate
}

export function getNextTier(currentTier: TierName): TierName | null {
  const tiers: TierName[] = ['beta', 'starter', 'pro', 'scale', 'enterprise']
  const currentIndex = tiers.indexOf(currentTier)
  
  if (currentIndex === -1 || currentIndex === tiers.length - 1) {
    return null
  }
  
  return tiers[currentIndex + 1]
}

export function canDowngrade(fromTier: TierName, toTier: TierName): boolean {
  const tiers: TierName[] = ['beta', 'starter', 'pro', 'scale', 'enterprise']
  const fromIndex = tiers.indexOf(fromTier)
  const toIndex = tiers.indexOf(toTier)
  
  // Can only downgrade to immediate lower tier
  return fromIndex - toIndex === 1
}

// Calculate monthly costs for a user
export function estimateMonthlyCost(
  tier: TierName,
  usage: {
    followers: number
    ai_analysis: number
    tweet_generation: number
  }
): {
  subscriptionCost: number
  overageCost: number
  totalCost: number
  breakdown: {
    followers: { included: number; overage: number; cost: number }
    ai_analysis: { included: number; overage: number; cost: number }
    tweet_generation: { included: number; overage: number; cost: number }
  }
} {
  const config = getTierConfig(tier)
  
  const followersOverage = Math.max(0, usage.followers - config.credits.followers)
  const aiOverage = Math.max(0, usage.ai_analysis - config.credits.ai_analysis)
  const tweetsOverage = Math.max(0, usage.tweet_generation - config.credits.tweet_generation)
  
  const followersCost = calculateOverageCost(tier, 'followers', followersOverage)
  const aiCost = calculateOverageCost(tier, 'ai_analysis', aiOverage)
  const tweetsCost = calculateOverageCost(tier, 'tweet_generation', tweetsOverage)
  
  const overageCost = followersCost + aiCost + tweetsCost
  
  return {
    subscriptionCost: config.price,
    overageCost,
    totalCost: config.price + overageCost,
    breakdown: {
      followers: {
        included: Math.min(usage.followers, config.credits.followers),
        overage: followersOverage,
        cost: followersCost,
      },
      ai_analysis: {
        included: Math.min(usage.ai_analysis, config.credits.ai_analysis),
        overage: aiOverage,
        cost: aiCost,
      },
      tweet_generation: {
        included: Math.min(usage.tweet_generation, config.credits.tweet_generation),
        overage: tweetsOverage,
        cost: tweetsCost,
      },
    },
  }
}
