# Followlytics Database Schema

## Collections

### users
```typescript
{
  uid: string,
  email: string,
  displayName: string,
  createdAt: timestamp,
  
  // Subscription
  subscription: {
    tier: 'beta' | 'starter' | 'pro' | 'scale' | 'enterprise',
    status: 'active' | 'canceled' | 'past_due',
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    currentPeriodStart: timestamp,
    currentPeriodEnd: timestamp,
    cancelAtPeriodEnd: boolean,
  },
  
  // Multi-Wallet Credits
  credits: {
    followers: {
      included: number,        // Monthly allocation
      rollover: number,        // From previous months (max 2x included)
      total: number,           // included + rollover
      used: number,            // This billing period
      lastRefillDate: timestamp,
    },
    ai_analysis: {
      included: number,
      rollover: number,
      total: number,
      used: number,
      lastRefillDate: timestamp,
    },
    tweet_generation: {
      included: number,
      rollover: number,
      total: number,
      used: number,
      lastRefillDate: timestamp,
    },
  },
  
  // Overage charges (accumulated, charged at end of billing period)
  overage: {
    followers: number,         // $ amount owed
    ai_analysis: number,
    tweet_generation: number,
    total: number,
    lastChargedDate: timestamp,
  },
  
  // X API Access (activated when revenue hits $200)
  x_api: {
    enabled: boolean,
    accessToken: string,
    refreshToken: string,
    expiresAt: timestamp,
  },
  
  // API Keys (for Enterprise tier)
  api_keys: string[],          // References to api_keys collection
  
  // Settings
  settings: {
    emailNotifications: boolean,
    overageAlerts: boolean,
    autoUpgrade: boolean,
  },
}
```

### subscriptions
```typescript
{
  id: string,
  userId: string,
  tier: 'beta' | 'starter' | 'pro' | 'scale' | 'enterprise',
  status: 'active' | 'canceled' | 'past_due' | 'unpaid',
  stripeSubscriptionId: string,
  stripeCustomerId: string,
  currentPeriodStart: timestamp,
  currentPeriodEnd: timestamp,
  cancelAtPeriodEnd: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### usage_logs
```typescript
{
  id: string,
  userId: string,
  timestamp: timestamp,
  service: 'follower_extraction' | 'ai_analysis' | 'tweet_generation',
  
  // Service-specific data
  details: {
    // Follower extraction
    username?: string,
    followerCount?: number,
    creditsUsed?: number,
    isOverage?: boolean,
    
    // AI analysis
    profilesAnalyzed?: number,
    
    // Tweet generation
    tweetsGenerated?: number,
    prompt?: string,
  },
  
  // Costs
  credits: {
    used: number,
    remaining: number,
    isOverage: boolean,
    overageCharge: number,
  },
  
  // Request metadata
  ipAddress: string,
  userAgent: string,
  endpoint: string,
}
```

### credit_transactions
```typescript
{
  id: string,
  userId: string,
  timestamp: timestamp,
  type: 'refill' | 'usage' | 'rollover' | 'overage_charge' | 'manual_adjustment',
  service: 'followers' | 'ai_analysis' | 'tweet_generation',
  
  amount: number,              // Can be negative for usage
  balanceBefore: number,
  balanceAfter: number,
  
  metadata: {
    billingPeriod?: string,
    reason?: string,
    adminId?: string,          // For manual adjustments
  },
}
```

### api_keys (Enterprise only)
```typescript
{
  id: string,
  userId: string,
  key: string,                 // hashed
  keyPrefix: string,           // First 8 chars for display
  name: string,                // User-given name
  active: boolean,
  createdAt: timestamp,
  lastUsedAt: timestamp,
  expiresAt: timestamp | null,
  
  // Rate limiting
  rateLimit: {
    requestsPerDay: number,
    requestsToday: number,
    resetAt: timestamp,
  },
  
  // Permissions
  permissions: string[],       // ['extract', 'analyze', 'generate']
}
```

### tier_configs (Read-only reference)
```typescript
{
  tier: 'beta' | 'starter' | 'pro' | 'scale' | 'enterprise',
  price: number,
  stripePriceId: string,
  
  credits: {
    followers: number,
    ai_analysis: number,
    tweet_generation: number,
  },
  
  overageRates: {
    followers: number,         // $ per 1K
    ai_analysis: number,       // $ per profile
    tweet_generation: number,  // $ per tweet
  },
  
  features: {
    growthTracking: boolean,
    competitorAnalysis: boolean,
    apiAccess: boolean,
    teamSeats: number,
    prioritySupport: boolean,
  },
}
```

### revenue_milestones (System tracking)
```typescript
{
  id: string,
  milestone: 'first_dollar' | '200_threshold' | '1000_mrr' | '5000_mrr',
  achieved: boolean,
  achievedAt: timestamp | null,
  totalRevenue: number,
  activeSubscribers: number,
  
  triggers: {
    x_api_enabled?: boolean,   // Activate X API at $200
    feature_unlock?: string,
  },
}
```

### overage_invoices
```typescript
{
  id: string,
  userId: string,
  billingPeriod: string,       // '2025-10'
  status: 'pending' | 'paid' | 'failed',
  
  charges: {
    followers: number,
    ai_analysis: number,
    tweet_generation: number,
    total: number,
  },
  
  stripeInvoiceId: string,
  createdAt: timestamp,
  paidAt: timestamp | null,
}
```

## Indexes

### users
- `email` (unique)
- `subscription.stripeCustomerId`
- `subscription.tier`

### usage_logs
- `userId` + `timestamp` (compound, descending)
- `service` + `timestamp`

### credit_transactions
- `userId` + `timestamp` (compound, descending)

### api_keys
- `key` (unique, hashed)
- `userId`
- `active`
