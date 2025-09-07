# Technical Specifications - X Unfollow Tracker

## System Architecture Overview

### Core Components
```
Frontend (Next.js/Vercel)
├── Authentication (Firebase Auth + X OAuth2)
├── Dashboard (Real-time Firestore listeners)
├── Analytics (Charts.js/Recharts)
└── Subscription Management (Stripe)

Backend (Firebase Functions)
├── Follower Polling Service (Cloud Scheduler)
├── Unfollow Detection Engine
├── xAI Grok Integration Service
└── Notification Service (Email/Webhook)

Database (Firestore)
├── User Management
├── Follower Snapshots
├── Unfollow Events
└── Subscription Data

External APIs
├── X API v2 (Basic Plan - $200/month)
├── xAI Grok API (grok-beta)
└── Stripe (Payments)
```

## Rate Limit Management Strategy

### X API Basic Plan Constraints
- **User Lookups**: 100 requests/24hrs per user
- **Tweet Retrieval**: 5 requests/15mins per user  
- **Follower Data**: 500 requests/24hrs per app
- **Posts Retrieval**: 15K posts/month total

### Smart Rate Limiting Implementation
```javascript
// Rate Limiter Class
class APIRateLimiter {
  constructor() {
    this.queues = {
      userLookups: new TokenBucket(100, '24h'),
      tweets: new TokenBucket(5, '15m'),
      followers: new TokenBucket(500, '24h')
    };
  }

  async executeWithLimit(endpoint, userId, apiCall) {
    const queue = this.queues[endpoint];
    await queue.waitForToken();
    return await apiCall();
  }
}

// Priority Queue for Premium Users
class UserPriorityQueue {
  constructor() {
    this.queues = {
      premium: [], // Agency/Pro users
      standard: [], // Starter users
      free: [] // Free tier users
    };
  }
}
```

## Database Schema Design

### Firestore Collections Structure
```javascript
// /users/{uid}
{
  xHandle: "johndoe",
  xUserId: "123456789",
  subscription: "professional", // free, starter, professional, agency
  subscriptionStatus: "active",
  createdAt: timestamp,
  lastSync: timestamp,
  settings: {
    notifications: {
      email: true,
      webhook: false,
      slack: false
    },
    syncFrequency: "daily" // hourly, daily, weekly
  },
  apiUsage: {
    currentMonth: {
      userLookups: 45,
      tweets: 120,
      followers: 8
    }
  }
}

// /users/{uid}/followers/{snapshotId}
{
  timestamp: timestamp,
  followers: [
    {
      id: "987654321",
      username: "follower1",
      name: "Follower Name",
      profile_image_url: "https://...",
      verified: false,
      followers_count: 1500
    }
  ],
  totalCount: 1247,
  changes: {
    gained: 5,
    lost: 3,
    net: 2
  }
}

// /users/{uid}/unfollows/{eventId}
{
  unfollowerHandle: "former_follower",
  unfollowerId: "555666777",
  unfollowerData: {
    name: "Former Follower",
    profile_image_url: "https://...",
    followers_count: 2500
  },
  timestamp: timestamp,
  detectedAt: timestamp,
  grokAnalysis: {
    explanation: "User may have unfollowed due to recent controversial political tweets...",
    confidence: 0.85,
    factors: ["political_content", "high_frequency_posting"],
    sentiment: "negative"
  },
  recentTweets: [
    {
      id: "tweet123",
      text: "Recent tweet content...",
      created_at: timestamp,
      public_metrics: {
        like_count: 10,
        retweet_count: 2
      }
    }
  ],
  processed: true
}

// /users/{uid}/analytics/{period}
{
  period: "2024-01", // YYYY-MM format
  followerGrowth: {
    startCount: 1200,
    endCount: 1247,
    gained: 67,
    lost: 20,
    netGrowth: 47
  },
  unfollowPatterns: {
    byDay: [2, 1, 0, 3, 1, 2, 1], // Mon-Sun
    byHour: [...], // 24 hour array
    topReasons: [
      { reason: "political_content", count: 8 },
      { reason: "high_frequency", count: 5 }
    ]
  }
}
```

## API Integration Strategy

### X API v2 Integration
```javascript
// X API Client with Rate Limiting
class XAPIClient {
  constructor(bearerToken) {
    this.client = new TwitterApi(bearerToken);
    this.rateLimiter = new APIRateLimiter();
  }

  async getFollowers(userId, maxResults = 1000) {
    return await this.rateLimiter.executeWithLimit('followers', userId, async () => {
      return await this.client.v2.followers(userId, {
        max_results: Math.min(maxResults, 1000),
        'user.fields': ['profile_image_url', 'verified', 'public_metrics']
      });
    });
  }

  async getUserTweets(userId, maxResults = 10) {
    return await this.rateLimiter.executeWithLimit('tweets', userId, async () => {
      return await this.client.v2.userTimeline(userId, {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics', 'context_annotations']
      });
    });
  }
}
```

### xAI Grok Integration
```javascript
// Grok API Client
class GrokAPIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.x.ai/v1';
  }

  async analyzeUnfollow(recentTweets, unfollowerData) {
    const prompt = this.buildAnalysisPrompt(recentTweets, unfollowerData);
    
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          {
            role: 'system',
            content: 'You are an expert social media analyst. Analyze why someone might unfollow a user based on their recent tweets.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    return await response.json();
  }

  buildAnalysisPrompt(tweets, unfollowerData) {
    return `
Analyze why @${unfollowerData.username} (${unfollowerData.followers_count} followers) might have unfollowed this user.

Recent tweets from the unfollowed user:
${tweets.map(tweet => `- "${tweet.text}" (${tweet.public_metrics.like_count} likes, ${tweet.public_metrics.retweet_count} retweets)`).join('\n')}

Consider:
1. Content tone/sentiment changes
2. Controversial or polarizing topics
3. Posting frequency (${tweets.length} tweets recently)
4. Engagement patterns
5. Relevance to follower's interests

Provide a brief, actionable explanation (max 150 words) focusing on the most likely reason.
`;
  }
}
```

## Firebase Functions Architecture

### Cloud Functions Structure
```javascript
// functions/src/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Scheduled function - runs every 15 minutes
exports.pollFollowers = functions.pubsub
  .schedule('*/15 * * * *')
  .onRun(async (context) => {
    const users = await getActiveUsers();
    
    for (const user of users) {
      await processUserFollowers(user);
    }
  });

// HTTP function for immediate sync
exports.syncUserFollowers = functions.https.onCall(async (data, context) => {
  const uid = context.auth.uid;
  return await processUserFollowers(uid);
});

// Process unfollow events
exports.processUnfollows = functions.firestore
  .document('users/{uid}/unfollows/{eventId}')
  .onCreate(async (snap, context) => {
    const unfollowData = snap.data();
    const uid = context.params.uid;
    
    // Get recent tweets
    const recentTweets = await getUserRecentTweets(uid);
    
    // Analyze with Grok
    const analysis = await analyzeWithGrok(recentTweets, unfollowData);
    
    // Update the document
    await snap.ref.update({
      grokAnalysis: analysis,
      processed: true
    });
    
    // Send notifications
    await sendUnfollowNotification(uid, unfollowData, analysis);
  });
```

### Follower Detection Algorithm
```javascript
async function detectUnfollows(userId, currentFollowers, previousSnapshot) {
  const previousFollowers = new Set(
    previousSnapshot.followers.map(f => f.id)
  );
  
  const currentFollowerIds = new Set(
    currentFollowers.map(f => f.id)
  );
  
  // Find unfollows
  const unfollows = [];
  for (const prevFollowerId of previousFollowers) {
    if (!currentFollowerIds.has(prevFollowerId)) {
      const unfollowerData = previousSnapshot.followers.find(
        f => f.id === prevFollowerId
      );
      unfollows.push(unfollowerData);
    }
  }
  
  // Find new follows
  const newFollows = [];
  for (const currentFollower of currentFollowers) {
    if (!previousFollowers.has(currentFollower.id)) {
      newFollows.push(currentFollower);
    }
  }
  
  return { unfollows, newFollows };
}
```

## Frontend Architecture (Next.js)

### Component Structure
```
src/
├── components/
│   ├── auth/
│   │   ├── LoginButton.tsx
│   │   └── AuthGuard.tsx
│   ├── dashboard/
│   │   ├── FollowerChart.tsx
│   │   ├── UnfollowList.tsx
│   │   ├── AnalyticsCard.tsx
│   │   └── RealtimeUpdates.tsx
│   ├── subscription/
│   │   ├── PricingTiers.tsx
│   │   └── SubscriptionManager.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Modal.tsx
├── pages/
│   ├── api/
│   │   ├── auth/
│   │   └── webhooks/
│   ├── dashboard/
│   ├── pricing/
│   └── settings/
├── hooks/
│   ├── useAuth.ts
│   ├── useFirestore.ts
│   └── useSubscription.ts
├── lib/
│   ├── firebase.ts
│   ├── stripe.ts
│   └── utils.ts
└── types/
    ├── user.ts
    ├── follower.ts
    └── subscription.ts
```

### Real-time Dashboard Implementation
```typescript
// components/dashboard/RealtimeDashboard.tsx
import { useEffect, useState } from 'react';
import { useFirestore } from '../hooks/useFirestore';

export default function RealtimeDashboard() {
  const { user } = useAuth();
  const [unfollows, setUnfollows] = useState([]);
  const [followers, setFollowers] = useState([]);

  useEffect(() => {
    if (!user) return;

    // Real-time listener for unfollows
    const unsubscribeUnfollows = db
      .collection(`users/${user.uid}/unfollows`)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .onSnapshot((snapshot) => {
        const unfollowData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUnfollows(unfollowData);
      });

    // Real-time listener for follower count
    const unsubscribeFollowers = db
      .collection(`users/${user.uid}/followers`)
      .orderBy('timestamp', 'desc')
      .limit(30)
      .onSnapshot((snapshot) => {
        const followerData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFollowers(followerData);
      });

    return () => {
      unsubscribeUnfollows();
      unsubscribeFollowers();
    };
  }, [user]);

  return (
    <div className="dashboard">
      <FollowerChart data={followers} />
      <UnfollowList unfollows={unfollows} />
      <AnalyticsCards />
    </div>
  );
}
```

## Security & Performance

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Nested collections inherit parent permissions
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Public subscription tiers (for pricing page)
    match /subscriptionTiers/{tierId} {
      allow read: if true;
    }
  }
}
```

### Performance Optimizations
1. **Firestore Indexing**: Create composite indexes for common queries
2. **Caching**: Implement Redis caching for API responses
3. **Pagination**: Limit query results and implement pagination
4. **Background Processing**: Use Cloud Tasks for heavy operations
5. **CDN**: Use Vercel's CDN for static assets

## Error Handling & Monitoring

### Error Handling Strategy
```javascript
// Centralized error handling
class APIError extends Error {
  constructor(message, statusCode, retryable = false) {
    super(message);
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

// Retry mechanism with exponential backoff
async function withRetry(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries || !error.retryable) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Monitoring & Logging
1. **Firebase Performance Monitoring**: Track app performance
2. **Cloud Logging**: Centralized logging for functions
3. **Error Reporting**: Automatic error tracking
4. **Custom Metrics**: Track business KPIs
5. **Alerting**: Set up alerts for critical issues

## Deployment Strategy

### Environment Configuration
```javascript
// Development
- Firebase Project: unfollow-tracker-dev
- Vercel: unfollow-tracker-dev.vercel.app
- X API: Development environment

// Production  
- Firebase Project: unfollow-tracker-prod
- Vercel: unfollowtracker.com
- X API: Production environment
```

### CI/CD Pipeline
1. **GitHub Actions**: Automated testing and deployment
2. **Staging Environment**: Pre-production testing
3. **Blue-Green Deployment**: Zero-downtime deployments
4. **Rollback Strategy**: Quick rollback capabilities
5. **Database Migrations**: Automated schema updates