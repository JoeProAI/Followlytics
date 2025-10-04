# Followlytics - Complete Architecture & Flow

## System Overview
**Purpose**: Competitive intelligence platform for X (Twitter) with AI-powered analytics
**Stack**: Next.js 14, Firebase (Auth + Firestore), Stripe, X API, OpenAI/xAI, Daytona

---

## User Journey Flow

### 1. Authentication Flow
```
User → /signup or /login
  → Firebase Auth (email/password)
  → Create user doc in Firestore /users/{userId}
  → Create subscription doc in /subscriptions/{userId} (tier: 'free')
  → Redirect to /dashboard
```

### 2. Subscription/Payment Flow
```
Dashboard → Click "UPGRADE" → /pricing
  → Select plan (Starter/Pro/Enterprise)
  → POST /api/stripe/create-checkout { priceId, tier }
    → Stripe Checkout Session created
    → User redirected to Stripe hosted checkout
    → User enters payment
    → Stripe webhook fires → POST /api/stripe/webhook
      → Update /subscriptions/{userId} with tier + Stripe metadata
    → User redirected to /dashboard?upgraded=true
  → Dashboard shows new tier badge
```

### 3. Feature Access Control
```
User makes API call (e.g., /api/x-analytics/hashtag)
  → Middleware: checkUsageLimits(userId, endpoint)
    → Get user subscription tier from /subscriptions/{userId}
    → Check TIER_LIMITS for feature access
    → Check daily/monthly usage from /usage/{userId}_{date}
    → If limit exceeded → 402 Payment Required
    → If allowed → trackAPICall(userId, endpoint) → Proceed
```

### 4. Analytics Features Flow

#### A. X Analytics (Basic - Free tier limited)
```
Dashboard → Professional Analytics Tab → Enter @username
  → POST /api/x-analytics/route { username }
    → Check usage limits
    → XAPIService.getUserProfile(username)
    → XAPIService.getUserTweets(username, 50)
    → Calculate engagement metrics
    → Return profile + top tweets + insights
```

#### B. Hashtag Analysis (Pro+ only)
```
Professional Analytics → Hashtag Tab → Enter #hashtag
  → POST /api/x-analytics/hashtag { hashtag, maxResults }
    → canAccessFeature(userId, 'ai_analysis') → Must be Pro+
    → XAPIService.analyzeHashtag(hashtag)
    → Return totalTweets, engagement, topTweet, recent_tweets
```

#### C. Tweet Generation (Starter+, AI analysis Pro+)
```
Dashboard → DaytonaFeatures → Enter idea + select voice
  → POST /api/daytona/generate-tweets { idea, variations, voice }
    → Check usage limits (Starter+ required)
    → Try xAI Grok API first (with timeout + retry)
    → Fallback to OpenAI GPT-4o-mini
    → Fetch viral context from X API (if X_BEARER_TOKEN)
    → Generate variations with viral analysis
    → Return tweets array with viralScore, hooks, why
```

#### D. Viral Analysis (Pro+ only)
```
DaytonaFeatures → Enter content → Click "Predict Viral Score"
  → POST /api/daytona/analyze-virality { content }
    → canAccessFeature(userId, 'ai_analysis') → Must be Pro+
    → OpenAI GPT-4o-mini analyzes content
    → Return viralScore, estimatedReach, strengths, improvements
```

#### E. Safety & Filters (Enterprise only)
```
Professional Analytics → Safety & Filters Tab
  → POST /api/daytona/blocked-list (Enterprise)
    → Daytona browser automation → scrape x.com/settings/blocked_all
    → Return list of blocked accounts
  → POST /api/daytona/muted-list (Enterprise)
    → Scrape x.com/settings/muted_all
    → Return list of muted accounts
  → POST /api/daytona/block-check { usernames } (Pro+)
    → Check each profile for "You're blocked" banner
    → Return { username, blocksYou: boolean }[]
```

---

## Database Schema (Firestore)

### /users/{userId}
```typescript
{
  email: string
  created_at: timestamp
  last_login: timestamp
  display_name?: string
}
```

### /subscriptions/{userId}
```typescript
{
  tier: 'free' | 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'canceled' | 'past_due'
  stripe_customer_id?: string
  stripe_subscription_id?: string
  price_id?: string
  current_period_start?: timestamp
  current_period_end?: timestamp
  cancel_at_period_end: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

### /usage/{userId}_{YYYY-MM-DD}
```typescript
{
  userId: string
  date: string (YYYY-MM-DD)
  api_calls: number
  searches: number
  endpoints: {
    [endpoint: string]: number  // e.g., "/api/x-analytics": 3
  }
  created_at: timestamp
}
```

---

## Tier Limits & Pricing

| Feature | Free | Starter ($29) | Pro ($79) | Enterprise ($199) |
|---------|------|---------------|-----------|-------------------|
| Daily Searches | 5 | 20 | 100 | Unlimited |
| Monthly API Calls | 150 | 600 | 3,000 | 5,000 |
| Competitors | 0 | 3 | 10 | 50 |
| History | 7 days | 30 days | 90 days | 365 days |
| AI Analysis | ❌ | ❌ | ✅ | ✅ |
| Tweet Generation | ❌ | ✅ (10/day) | ✅ (50/day) | ✅ (Unlimited) |
| Automated Reports | ❌ | Weekly | Daily | Hourly |
| Real-time Alerts | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ❌ | ✅ |
| Team Seats | 1 | 1 | 1 | 5 |
| Safety & Filters | ❌ | ❌ | Partial | Full |

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Firebase auth (handled by Firebase SDK)
- `POST /api/auth/signup` - Firebase auth
- `POST /api/auth/logout` - Clear session

### Subscription/Billing
- `GET /api/user/subscription` - Get user tier + limits
- `POST /api/stripe/create-checkout` - Create Stripe checkout session
- `POST /api/stripe/webhook` - Handle Stripe events (subscription.created, updated, deleted)
- `POST /api/stripe/create-products` - Admin: create Stripe products/prices

### X Analytics (Usage-limited)
- `POST /api/x-analytics` - Get user profile + analytics
- `POST /api/x-analytics/hashtag` - Analyze hashtag (Pro+)
- `POST /api/x-analytics/tweet-analysis` - Analyze single tweet
- `POST /api/intelligence/trending` - Discover trending topics

### AI Features (Paid tiers)
- `POST /api/daytona/generate-tweets` - Generate tweet variations (Starter+)
- `POST /api/daytona/analyze-virality` - Predict viral score (Pro+)

### Safety & Filters (Enterprise)
- `POST /api/daytona/blocked-list` - Get your blocked accounts
- `POST /api/daytona/muted-list` - Get your muted accounts
- `POST /api/daytona/block-check` - Bulk check who blocks you (Pro+)

---

## Environment Variables Required

```bash
# Firebase Admin
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY= (or FIREBASE_SERVICE_ACCOUNT_JSON)

# X/Twitter API
X_BEARER_TOKEN=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=
X_API_KEY=
X_API_SECRET=
X_CLIENT_ID=
X_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE=price_xxx

# AI Services
OPENAI_API_KEY=
XAI_API_KEY=
XAI_MODEL=grok-2-latest

# Daytona
DAYTONA_API_KEY=
DAYTONA_API_URL=https://app.daytona.io/api

# App Config
NEXT_PUBLIC_APP_URL=https://followlytics-zeta.vercel.app
NEXTAUTH_URL=https://followlytics-zeta.vercel.app
NEXTAUTH_SECRET= (generate with: openssl rand -base64 32)
CRON_SECRET= (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

---

## Known Issues & Fixes Needed

### ✅ FIXED
1. Firebase Admin initialization errors → Added proper error handling

### ❌ TO FIX
1. **Loading spinner** → Upgrade to premium animated component
2. **"Save" feature** → Implement save tweets to Firestore
3. **Payment gating** → Add middleware to all paid endpoints
4. **Stripe Price IDs** → Need to create products in Stripe dashboard
5. **Usage tracking** → Wire up trackAPICall() to all endpoints
6. **DaytonaFeatures emoji removal** → Clean UI pass needed
7. **Safety & Filters** → Wire Daytona scraping (currently placeholders)

---

## Monetization Strategy

### Revenue Streams
1. **Subscriptions** (Primary) - Starter/Pro/Enterprise monthly recurring
2. **Credits System** (Future) - Pay-per-use for burst usage
3. **API Access** (Enterprise) - Developer tier with API keys
4. **White-label** (Future) - Custom branding for agencies

### Conversion Funnel
1. Free tier users hit limits quickly (5 searches/day)
2. Upgrade prompt shows on dashboard when limit hit
3. Starter tier unlocks tweet generation (high perceived value)
4. Pro tier unlocks AI analysis (competitive intel)
5. Enterprise unlocks API + Safety & Filters (B2B)

### Pricing Psychology
- Free → Starter = 5x more searches ($29 = entry point)
- Starter → Pro = 5x searches + AI ($50 jump for power users)
- Pro → Enterprise = Unlimited searches + API ($120 jump for businesses)

---

## Next Steps to Production

1. Create Stripe products → Run `POST /api/stripe/create-products`
2. Add usage middleware to all analytics endpoints
3. Implement save/bookmark feature (Firestore /saved/{userId}/{tweetId})
4. Add premium loading component
5. Wire Daytona scraping for Safety & Filters
6. Add usage dashboard showing daily limits
7. Implement automated email reports (SendGrid)
8. Add real-time alerts (Firebase Cloud Messaging)

