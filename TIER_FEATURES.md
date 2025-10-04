# Followlytics - Complete Tier Feature Matrix

## Production-Ready Payment Gates (All Endpoints Protected)

---

## FREE TIER ($0/month)
**Target**: Trial users, casual explorers
**Daily Limit**: 5 searches/day
**Monthly API Calls**: 150

### ✅ Available Features
- Basic user analytics (`POST /api/x-analytics`)
- View own profile stats
- 7-day history
- Community support

### ❌ Locked Features (Upgrade Required)
- ❌ Tweet generation (`/api/daytona/generate-tweets`) → Requires **Starter**
- ❌ Viral analysis (`/api/daytona/analyze-virality`) → Requires **Pro**
- ❌ Hashtag analysis (`/api/x-analytics/hashtag`) → Requires **Pro**
- ❌ Trending analysis (`/api/intelligence/trending`) → Requires **Pro**
- ❌ Block checking (`/api/daytona/block-check`) → Requires **Pro**
- ❌ Competitor tracking → Requires **Starter**
- ❌ Automated reports → Requires **Starter**
- ❌ AI analysis → Requires **Pro**
- ❌ Safety & Filters → Requires **Pro/Enterprise**

### When Limits Hit
```json
{
  "error": "Usage limit reached",
  "message": "Daily search limit reached (5). Upgrade to search more.",
  "upgradeUrl": "/pricing"
}
```

---

## STARTER TIER ($29/month)
**Target**: Solo creators, small influencers
**Daily Limit**: 20 searches/day
**Monthly API Calls**: 600

### ✅ Unlocked Features
- Everything in Free
- **Tweet Generation** (`POST /api/daytona/generate-tweets`)
  - 10 variations per request
  - AI-powered viral scoring
  - xAI Grok + OpenAI fallback
  - Multiple voice styles (viral, founder, shitpost, thread, data)
- **Save Tweets** (`POST /api/tweets/save`)
- **Competitor Tracking** (3 competitors)
- **30-day History**
- **Weekly Email Reports** (when implemented)
- **Email Support**

### ❌ Still Locked (Upgrade to Pro)
- ❌ Viral analysis (`/api/daytona/analyze-virality`)
- ❌ Hashtag analysis (`/api/x-analytics/hashtag`)
- ❌ Trending analysis (`/api/intelligence/trending`)
- ❌ Block checking (`/api/daytona/block-check`)
- ❌ Real-time alerts
- ❌ AI content analysis

### Use Cases
- Generate viral tweet variations
- Track 3 key competitors
- Basic analytics for personal brand
- Weekly performance summaries

---

## PRO TIER ($79/month)
**Target**: Professional creators, marketers, agencies
**Daily Limit**: 100 searches/day
**Monthly API Calls**: 3,000

### ✅ Unlocked Features
- Everything in Starter
- **Viral Analysis** (`POST /api/daytona/analyze-virality`)
  - Predict viral score (1-100)
  - Estimated reach forecasting
  - Strengths/weaknesses analysis
  - Improvement suggestions
  - Best time to post
  - Target audience insights
- **Hashtag Analysis** (`POST /api/x-analytics/hashtag`)
  - Engagement metrics by hashtag
  - Top tweets using hashtag
  - Trending patterns
  - Influencer identification
- **Trending Analysis** (`POST /api/intelligence/trending`)
  - Real-time trending topics
  - Pattern detection (hashtags, mentions)
  - Top influencers by topic
  - Engagement analysis
- **Block Checking** (`POST /api/daytona/block-check`)
  - Bulk check who blocks you
  - Paste list of @handles
  - Results show block status
- **Competitor Tracking** (10 competitors)
- **90-day History**
- **AI-Powered Insights**
- **Daily Automated Reports** (when implemented)
- **Real-time Alerts** (when implemented)
- **Trend Predictions**
- **Priority Support**

### ❌ Still Locked (Upgrade to Enterprise)
- ❌ Blocked accounts scraping (`/api/daytona/blocked-list`)
- ❌ Muted accounts scraping (`/api/daytona/muted-list`)
- ❌ API access
- ❌ Team collaboration
- ❌ White-label reports

### Use Cases
- Competitive intelligence
- Content strategy optimization
- Viral content forecasting
- Hashtag campaign planning
- Influencer identification
- Agency client reporting

---

## ENTERPRISE TIER ($199/month)
**Target**: Large agencies, brands, power users
**Daily Limit**: Unlimited searches
**Monthly API Calls**: 5,000

### ✅ Full Access - Everything Unlocked
- Everything in Pro
- **Blocked List Scraping** (`POST /api/daytona/blocked-list`)
  - Full list of accounts you blocked
  - Daytona browser automation
  - Real-time scraping from x.com/settings/blocked_all
- **Muted List Scraping** (`POST /api/daytona/muted-list`)
  - Full list of accounts you muted
  - Real-time scraping from x.com/settings/muted_all
- **Competitor Tracking** (50 competitors)
- **365-day History**
- **Custom AI Models** (when implemented)
- **Hourly Reports** (when implemented)
- **API Access** (when implemented)
  - Generate API keys
  - Programmatic access
  - Webhook support
- **Team Collaboration** (5 seats, when implemented)
  - Invite team members
  - Shared dashboards
  - Role-based access
- **White-label Reports** (when implemented)
- **Dedicated Support**

### Use Cases
- Enterprise competitive intelligence
- Agency multi-client management
- Advanced automation workflows
- Team collaboration at scale
- Custom integrations via API
- White-label client deliverables

---

## Payment Gate Implementation

### All Protected Endpoints

#### Free Tier (Usage Tracked)
```typescript
POST /api/x-analytics // Basic user analytics
```

#### Starter Tier Required
```typescript
POST /api/daytona/generate-tweets // Tweet generation
POST /api/tweets/save // Save tweets
```

#### Pro Tier Required
```typescript
POST /api/daytona/analyze-virality // Viral prediction
POST /api/x-analytics/hashtag // Hashtag analysis
POST /api/intelligence/trending // Trending analysis
POST /api/daytona/block-check // Block checking
```

#### Enterprise Tier Required
```typescript
POST /api/daytona/blocked-list // Blocked accounts scraping
POST /api/daytona/muted-list // Muted accounts scraping
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

#### 402 Payment Required (Tier Upgrade)
```json
{
  "error": "Upgrade required",
  "message": "This feature requires pro tier or higher",
  "currentTier": "starter",
  "requiredTier": "pro",
  "upgradeUrl": "/pricing"
}
```

#### 402 Payment Required (Feature Access)
```json
{
  "error": "Feature not available",
  "message": "Your current plan (starter) does not include this feature",
  "upgradeUrl": "/pricing"
}
```

#### 429 Too Many Requests (Usage Limit)
```json
{
  "error": "Usage limit reached",
  "message": "Daily search limit reached (20). Upgrade for more calls.",
  "usage": {
    "searches": 20,
    "api_calls": 35
  },
  "upgradeUrl": "/pricing"
}
```

---

## Upgrade Flow

### 1. User Hits Limit
Free user tries to generate tweets → 402 error with upgrade CTA

### 2. Navigate to Pricing
Click "Upgrade" button → Redirect to `/pricing`

### 3. Select Plan
Choose Starter/Pro/Enterprise → Click "Start Free Trial"

### 4. Stripe Checkout
```typescript
POST /api/stripe/create-checkout
{
  "priceId": "price_xxx",
  "tier": "starter"
}
→ Redirect to Stripe hosted checkout
```

### 5. Payment Success
Stripe webhook fires → `POST /api/stripe/webhook`
- Update `/subscriptions/{userId}` with new tier
- Redirect to `/dashboard?upgraded=true`

### 6. Features Unlocked
User now has access to tier features immediately

---

## Testing Payment Gates

### Test Free Tier Limits
```bash
# Make 6 requests to hit daily limit (5 allowed)
for i in {1..6}; do
  curl -X POST https://followlytics-zeta.vercel.app/api/x-analytics \
    -H "Authorization: Bearer $FIREBASE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"username":"elonmusk"}'
done
# Request #6 should return 429 error
```

### Test Tier Restrictions
```bash
# Free user tries Pro feature (should get 402)
curl -X POST https://followlytics-zeta.vercel.app/api/daytona/analyze-virality \
  -H "Authorization: Bearer $FREE_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Test tweet"}'

# Starter user tries Pro feature (should get 402)
curl -X POST https://followlytics-zeta.vercel.app/api/x-analytics/hashtag \
  -H "Authorization: Bearer $STARTER_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hashtag":"AI","maxResults":100}'

# Pro user tries Enterprise feature (should get 402)
curl -X POST https://followlytics-zeta.vercel.app/api/daytona/blocked-list \
  -H "Authorization: Bearer $PRO_USER_TOKEN"
```

---

## Revenue Optimization Strategy

### Free → Starter Conversion Triggers
- Hit 5 daily searches (aggressive prompt)
- Try to generate tweets (blocked with CTA)
- View competitor tracking (teaser with upgrade)

### Starter → Pro Conversion Triggers
- Request viral analysis (blocked with CTA)
- Hit 20 daily searches
- Try hashtag analysis
- View trending topics (teaser)

### Pro → Enterprise Conversion Triggers
- Request blocked/muted list scraping
- Need more than 10 competitors
- Hit 100 daily searches
- Request API access
- Need team collaboration

### Pricing Psychology
- **Free**: Generous enough to see value (5 searches)
- **Starter**: $29 entry point unlocks high-value feature (tweet gen)
- **Pro**: $79 unlocks AI intelligence (3x value jump)
- **Enterprise**: $199 unlocks automation + scale (business tier)

### Expected Conversion Rates
- Free → Starter: 8-12% (tweet generation is killer feature)
- Starter → Pro: 15-20% (AI analysis + competitive intel)
- Pro → Enterprise: 5-10% (agencies, power users)

---

## Immediate Next Steps

1. ✅ **Payment gates deployed** (this commit)
2. ⏳ **Create Stripe products** (manual in Stripe dashboard)
3. ⏳ **Set price ID environment variables** (Vercel)
4. ⏳ **Configure Stripe webhook** (production URL)
5. ⏳ **Test full payment flow** (test cards)
6. ⏳ **Add upgrade CTAs in UI** (when limits hit)
7. ⏳ **Monitor conversion funnel** (analytics)

All endpoints are now properly gated and ready for monetization. 🚀
