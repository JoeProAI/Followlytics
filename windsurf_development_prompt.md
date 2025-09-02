# WINDSURF DEVELOPMENT PROMPT - X Unfollow Tracker

## 🎯 PROJECT OVERVIEW

**Project Name**: UnfollowTracker - AI-Powered X Unfollow Analytics
**Goal**: Build a full-stack SaaS application that tracks X (Twitter) unfollows and provides AI-powered insights using xAI Grok
**Timeline**: 4 weeks to MVP launch
**Revenue Target**: $15,000 MRR by Month 3

## 🏗️ TECHNICAL STACK

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: Firebase Auth with X OAuth2
- **Charts**: Recharts or Chart.js
- **State Management**: React Context + Custom hooks
- **Deployment**: Vercel

### Backend
- **Functions**: Firebase Cloud Functions (Node.js)
- **Database**: Firestore
- **Scheduling**: Firebase Cloud Scheduler
- **Authentication**: Firebase Auth
- **Payments**: Stripe

### External APIs
- **X API v2**: Basic Plan ($200/month) - Rate limited
- **xAI Grok**: grok-beta model for unfollow analysis
- **Stripe**: Payment processing

## 🚨 CRITICAL CONSTRAINTS

### X API Rate Limits (Basic Plan)
- **User Lookups**: 100 requests/24hrs per user
- **Tweet Retrieval**: 5 requests/15mins per user
- **Follower Data**: 500 requests/24hrs per app
- **Posts Retrieval**: 15K posts/month total

**MANDATORY**: Implement smart rate limiting and user prioritization (premium users first)

## 📋 DETAILED REQUIREMENTS

### Phase 1: Core MVP (Week 1-2)

#### 1. Authentication System
```typescript
// Required: X OAuth2 integration with Firebase Auth
// File: lib/auth.ts
interface User {
  uid: string;
  xHandle: string;
  xUserId: string;
  xAccessToken: string;
  xRefreshToken: string;
  subscription: 'free' | 'starter' | 'professional' | 'agency';
  createdAt: Date;
}

// Required endpoints:
// - /api/auth/twitter/callback
// - /api/auth/twitter/login
```

#### 2. Follower Tracking System
```javascript
// Firebase Function: functions/src/followerTracking.js
exports.pollFollowers = functions.pubsub
  .schedule('*/15 * * * *') // Every 15 minutes
  .onRun(async (context) => {
    // 1. Get active users (prioritize premium)
    // 2. Check rate limits
    // 3. Fetch current followers
    // 4. Compare with last snapshot
    // 5. Detect unfollows
    // 6. Store results in Firestore
  });

// Required: Smart rate limiting class
class RateLimiter {
  // Implement token bucket algorithm
  // Priority queue for premium users
}
```

#### 3. Database Schema (Firestore)
```javascript
// Collection: /users/{uid}
{
  xHandle: string,
  xUserId: string,
  subscription: string,
  lastSync: timestamp,
  settings: {
    notifications: { email: boolean, webhook: boolean },
    syncFrequency: string
  }
}

// Collection: /users/{uid}/followers/{snapshotId}
{
  timestamp: timestamp,
  followers: Array<{id, username, name, profile_image_url}>,
  totalCount: number,
  changes: { gained: number, lost: number }
}

// Collection: /users/{uid}/unfollows/{eventId}
{
  unfollowerHandle: string,
  unfollowerId: string,
  timestamp: timestamp,
  grokAnalysis: {
    explanation: string,
    confidence: number,
    factors: Array<string>
  },
  recentTweets: Array<object>
}
```

#### 4. Basic Dashboard UI
```typescript
// Required components:
// - components/dashboard/FollowerChart.tsx
// - components/dashboard/UnfollowList.tsx
// - components/dashboard/StatsCards.tsx

// Must use shadcn/ui components:
// - Card, CardHeader, CardContent
// - Button variants
// - Table for unfollow list
// - Chart component (Recharts)
```

### Phase 2: AI Integration (Week 3)

#### 5. xAI Grok Integration
```javascript
// File: lib/grok.js
class GrokAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.x.ai/v1';
  }

  async analyzeUnfollow(recentTweets, unfollowerData) {
    const prompt = `
Analyze why @${unfollowerData.username} might have unfollowed based on these recent tweets:

${recentTweets.map(t => `"${t.text}" (${t.public_metrics.like_count} likes)`).join('\n')}

Provide a brief explanation (max 150 words) focusing on:
1. Content tone/sentiment
2. Controversial topics
3. Posting frequency
4. Engagement patterns

Format as JSON: {"explanation": "...", "confidence": 0.85, "factors": ["political_content"]}
`;

    // Call grok-beta model
    // Return structured analysis
  }
}

// Firebase Function: Process unfollows with Grok
exports.processUnfollows = functions.firestore
  .document('users/{uid}/unfollows/{eventId}')
  .onCreate(async (snap, context) => {
    // 1. Get user's recent tweets
    // 2. Analyze with Grok
    // 3. Update unfollow record
    // 4. Send notification
  });
```

#### 6. Enhanced Dashboard
```typescript
// Add AI insights to dashboard
// - Grok analysis display
// - Confidence indicators
// - Factor tags (political_content, high_frequency, etc.)
// - Trend analysis
```

### Phase 3: Premium Features (Week 4)

#### 7. Subscription System
```typescript
// Stripe integration
// File: lib/stripe.ts
interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  features: {
    accounts: number;
    historyDays: number;
    aiInsights: boolean;
    webhooks: boolean;
  };
}

// Required tiers:
const TIERS = {
  free: { accounts: 1, historyDays: 7, aiInsights: false },
  starter: { accounts: 1, historyDays: 30, aiInsights: true, price: 19 },
  professional: { accounts: 3, historyDays: 90, aiInsights: true, price: 49 },
  agency: { accounts: 10, historyDays: 365, aiInsights: true, price: 149 }
};
```

#### 8. Advanced Features
- Multiple account support
- Webhook notifications
- Export functionality (CSV, PDF)
- Advanced analytics
- Email notifications

## 🎨 UI/UX REQUIREMENTS

### Design System
- **Use shadcn/ui exclusively** - No custom components where shadcn exists
- **Color Scheme**: Professional blue/gray palette
- **Typography**: Inter font family
- **Layout**: Clean, minimal, data-focused
- **Responsive**: Mobile-first design

### Key Pages
1. **Landing Page** (`/`)
   - Hero section with value proposition
   - Feature highlights
   - Pricing tiers
   - Social proof/testimonials

2. **Dashboard** (`/dashboard`)
   - Follower count chart (line chart)
   - Recent unfollows table
   - AI insights cards
   - Quick stats (gained/lost today)

3. **Analytics** (`/analytics`)
   - Detailed follower trends
   - Unfollow patterns by time/day
   - Top unfollow reasons
   - Export functionality

4. **Settings** (`/settings`)
   - Account management
   - Notification preferences
   - Subscription management
   - API usage stats

### Component Requirements
```typescript
// Must implement these exact components:

// Dashboard Components
<FollowerChart data={followerHistory} />
<UnfollowList unfollows={recentUnfollows} />
<StatsCards stats={{gained, lost, total}} />
<GrokInsights analysis={aiAnalysis} />

// UI Components (using shadcn/ui)
<Button variant="default|outline|ghost" />
<Card><CardHeader><CardContent /></Card>
<Table><TableHeader><TableBody /></Table>
<Badge variant="default|secondary|destructive" />
<Alert><AlertDescription /></Alert>
```

## 🔧 IMPLEMENTATION DETAILS

### File Structure
```
project-root/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── callback/
│   │   ├── dashboard/
│   │   ├── analytics/
│   │   ├── settings/
│   │   └── pricing/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── auth/
│   │   ├── dashboard/
│   │   └── subscription/
│   ├── lib/
│   │   ├── firebase.ts
│   │   ├── stripe.ts
│   │   ├── grok.ts
│   │   └── utils.ts
│   └── hooks/
│       ├── useAuth.ts
│       ├── useSubscription.ts
│       └── useFirestore.ts
├── functions/
│   ├── src/
│   │   ├── index.js
│   │   ├── followerTracking.js
│   │   ├── grokAnalysis.js
│   │   └── notifications.js
│   └── package.json
└── firestore.rules
```

### Environment Variables
```bash
# Next.js (.env.local)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
FIREBASE_ADMIN_SDK_KEY=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
XAI_API_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Firebase Functions (.env)
TWITTER_BEARER_TOKEN=
XAI_API_KEY=
STRIPE_SECRET_KEY=
```

## 🚀 DEPLOYMENT REQUIREMENTS

### Vercel Deployment
```json
// vercel.json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NEXT_PUBLIC_FIREBASE_API_KEY": "@firebase-api-key",
    "STRIPE_SECRET_KEY": "@stripe-secret-key"
  }
}
```

### Firebase Deployment
```bash
# Deploy functions and Firestore rules
firebase deploy --only functions,firestore:rules

# Required Firebase services:
# - Authentication (X OAuth2)
# - Firestore Database
# - Cloud Functions
# - Cloud Scheduler
```

## 📊 SUCCESS METRICS

### Technical KPIs
- **Page Load Time**: < 2 seconds
- **API Response Time**: < 500ms
- **Uptime**: > 99.9%
- **Error Rate**: < 0.1%

### Business KPIs
- **User Conversion**: 10% free to paid
- **Churn Rate**: < 5% monthly
- **MRR Growth**: 20% month-over-month
- **Customer Acquisition Cost**: < $50

## 🔒 SECURITY REQUIREMENTS

### Authentication
- Secure X OAuth2 flow
- JWT token validation
- Session management
- Rate limiting per user

### Data Protection
- User data isolation (Firestore rules)
- Encrypted API keys
- HTTPS everywhere
- GDPR compliance ready

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## 🎯 LAUNCH STRATEGY

### Pre-Launch (Week 4)
- Beta testing with 20 users
- Performance optimization
- Bug fixes and polish
- Content creation (landing page copy)

### Launch Week
- Product Hunt submission
- Social media announcement
- Influencer outreach
- Press release

### Post-Launch (Month 2)
- User feedback implementation
- Feature iterations
- Marketing campaigns
- Partnership development

## 🔄 DEVELOPMENT WORKFLOW

### Daily Tasks
1. **Morning**: Check overnight function logs
2. **Development**: Feature implementation
3. **Testing**: Manual and automated testing
4. **Evening**: Deploy to staging, review metrics

### Weekly Milestones
- **Week 1**: Auth + Basic tracking
- **Week 2**: Dashboard + UI polish
- **Week 3**: AI integration + Premium features
- **Week 4**: Launch preparation + Marketing

## 🚨 CRITICAL SUCCESS FACTORS

1. **Rate Limit Management**: Must handle X API limits gracefully
2. **Real-time Updates**: Dashboard must feel responsive
3. **AI Quality**: Grok insights must be valuable and accurate
4. **User Experience**: Onboarding must be seamless
5. **Performance**: App must be fast and reliable

## 📞 SUPPORT & MAINTENANCE

### Monitoring
- Firebase Performance Monitoring
- Error tracking (Sentry)
- User analytics (Google Analytics)
- Business metrics dashboard

### Maintenance Tasks
- Daily: Monitor error logs
- Weekly: Review user feedback
- Monthly: Performance optimization
- Quarterly: Feature planning

---

## 🎯 WINDSURF EXECUTION CHECKLIST

### Phase 1 Deliverables
- [ ] Next.js project setup with shadcn/ui
- [ ] Firebase Auth with X OAuth2
- [ ] Basic Firestore schema
- [ ] Follower tracking Cloud Function
- [ ] Rate limiting implementation
- [ ] Basic dashboard UI
- [ ] User authentication flow

### Phase 2 Deliverables
- [ ] xAI Grok integration
- [ ] Unfollow analysis function
- [ ] Enhanced dashboard with AI insights
- [ ] Real-time updates
- [ ] Notification system

### Phase 3 Deliverables
- [ ] Stripe subscription system
- [ ] Multiple account support
- [ ] Advanced analytics
- [ ] Export functionality
- [ ] Admin dashboard

### Launch Deliverables
- [ ] Production deployment
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation
- [ ] Marketing materials

**REMEMBER**: This is a revenue-focused project. Prioritize features that drive subscriptions and user retention. The goal is $15,000 MRR by Month 3!