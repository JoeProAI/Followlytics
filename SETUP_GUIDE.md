# XScope Analytics - Complete Setup Guide

## 🚀 Quick Start (5 Steps to Profitable)

### **Step 1: Install Stripe Package**
```bash
npm install stripe
```

### **Step 2: Get Stripe Keys**
1. Go to https://dashboard.stripe.com/
2. Get your keys from Developers → API keys
3. Add to Vercel environment variables:
```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=(will get after Step 3)
STRIPE_SETUP_SECRET=any_random_string_for_security
```

### **Step 3: Create Products (One-Time)**
```bash
# After deploying to Vercel, run:
curl -X POST https://your-app.vercel.app/api/stripe/create-products \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_STRIPE_SETUP_SECRET"}'

# Save the price IDs returned and add to Vercel:
NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_...
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_...
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE=price_...
```

### **Step 4: Setup Webhook**
1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://your-app.vercel.app/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy webhook secret and add to Vercel:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

### **Step 5: Add Remaining Env Vars**
```bash
# Cron job security
CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Add to Vercel:
CRON_SECRET=your_generated_secret
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## 💰 Pricing Model Summary

### **Revenue Goal: $300/month (Break Even)**

| Tier | Price | Competitors | API Calls/mo | Break Even Count |
|------|-------|-------------|--------------|------------------|
| FREE | $0 | 0 | 150 | ∞ |
| STARTER | $29 | 3 | 600 | 11 users |
| PRO | $79 | 10 | 3,000 | 4 users ⭐ |
| ENTERPRISE | $199 | 50 | 5,000 | 2 users 🎯 |

**Profitability:**
- 4 PRO users = $316/mo = ✅ PROFITABLE
- 2 ENTERPRISE users = $398/mo = ✅ PROFITABLE  
- 11 STARTER users = $319/mo = ✅ PROFITABLE

---

## 🔧 How It Works (The Magic)

### **Daytona Caching = 90% API Savings**

Traditional approach (expensive):
```
User searches → API call (uses quota)
User searches again → API call (uses quota)
100 users searching → 100 API calls = $$$
```

Our approach (profitable):
```
Cron job fetches data → Stores in Firestore
User searches → Reads from cache (FREE)
User searches again → Reads from cache (FREE)
100 users searching → 0 API calls = FREE!
```

### **Competitor Monitoring**

**Every 6 hours:**
1. Daytona job runs (automated)
2. Fetches all competitor data (2 API calls per competitor)
3. Caches in Firestore for 6 hours
4. Detects changes, creates alerts
5. Users get instant results from cache

**Value:**
- User sees "real-time" data
- Actually 6-hour cached data
- Saves 90% of API calls
- Profitable at scale

---

## 📊 Firestore Collections Created

### **`subscriptions`**
```typescript
{
  userId: string
  tier: 'free' | 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'canceled' | 'past_due'
  customerId: string
  subscriptionId: string
  current_period_end: string
}
```

### **`usage`**
```typescript
{
  userId: string
  date: string // YYYY-MM-DD
  api_calls: number
  searches: number
  endpoints: { [key: string]: number }
}
```

### **`competitors`**
```typescript
{
  userId: string
  username: string
  enabled: boolean
  last_monitored: string
  last_followers: number
  last_engagement: number
}
```

### **`competitor_cache`**
```typescript
{
  userId: string
  username: string
  timestamp: string
  followers: number
  avg_engagement: number
  recent_tweets: Tweet[]
}
```

### **`alerts`**
```typescript
{
  userId: string
  username: string
  type: 'follower_spike' | 'engagement_spike'
  data: any
  read: boolean
  created_at: string
}
```

---

## 🎯 Feature Gates by Tier

```typescript
FREE:
  ✅ 5 searches/day
  ✅ Basic analytics
  ❌ No competitor tracking
  ❌ No AI analysis

STARTER:
  ✅ 20 searches/day
  ✅ 3 competitors
  ✅ Weekly reports
  ❌ No AI analysis

PRO:
  ✅ 100 searches/day
  ✅ 10 competitors
  ✅ AI-powered insights
  ✅ Daily reports
  ✅ Real-time alerts

ENTERPRISE:
  ✅ Unlimited searches
  ✅ 50 competitors
  ✅ Custom AI models
  ✅ API access
  ✅ Team collaboration
```

---

## 📈 Growth Strategy

### **Month 1: Launch**
- Goal: 4 PRO users or 2 ENTERPRISE users
- Focus: Free users → PRO trial conversions
- Target: Break even ($300/mo revenue)

### **Month 2-3: Scale**
- Goal: 10 PRO + 2 ENTERPRISE users
- Revenue: $1,188/mo
- Profit: ~$800/mo

### **Month 6: Sustainable**
- Goal: 30 PRO + 5 ENTERPRISE users
- Revenue: $3,365/mo
- Profit: ~$2,800/mo

---

## 🔒 Security Checklist

- [ ] `CRON_SECRET` set (protects cron endpoints)
- [ ] `STRIPE_WEBHOOK_SECRET` set (verifies webhooks)
- [ ] `STRIPE_SETUP_SECRET` set (protects product creation)
- [ ] X Bearer Token in Vercel only (never in code)
- [ ] Firebase Admin SDK key secure
- [ ] All API routes have auth checks

---

## 🚦 Testing Checklist

- [ ] Install Stripe package
- [ ] Deploy to Vercel
- [ ] Create Stripe products
- [ ] Setup webhook
- [ ] Add all env vars
- [ ] Test free signup
- [ ] Test PRO upgrade
- [ ] Test competitor monitoring
- [ ] Test usage limits
- [ ] Test cron jobs

---

## 💡 Key Insights

**Why This Works:**
1. **Caching** = Low costs, high value
2. **Daytona** = Automation = Set & forget
3. **Clear tiers** = Easy upsells
4. **Real value** = AI analysis, competitor tracking
5. **Recurring** = Predictable revenue

**Set & Forget:**
- Cron jobs run automatically
- Caching happens in background  
- Alerts generated automatically
- Users see instant results
- You collect revenue

**Profitable Because:**
- API calls minimized via caching
- High-value features (AI, monitoring)
- Clear upgrade path
- Recurring revenue model

---

## 🎉 You're Ready!

Once setup complete:
1. Free users sign up → Try features
2. Upgrade to PRO → Get AI + competitors
3. Cron jobs cache data → Save API calls
4. Users see instant results → Happy
5. You collect revenue → Profitable

**Estimated time:** 30 minutes setup
**Break even:** 4 PRO users  
**Profitability:** 10+ PRO users = $800/mo profit
