# Followlytics

AI-powered X (Twitter) follower analytics platform helping creators understand their audience engagement patterns and track unfollows with intelligent insights.

🚀 **Ready for Production Deployment** using xAI Grok.

## 🚀 Features

- **Real-time Follower Tracking**: Monitor follower changes with smart rate limiting
- **AI-Powered Analysis**: Get detailed insights on why people unfollowed you using xAI Grok
- **Beautiful Dashboard**: Modern UI with charts, trends, and analytics
- **Multiple Subscription Tiers**: From free to agency-level plans
- **Secure Authentication**: X OAuth2 integration with Firebase Auth
- **Export Capabilities**: Download your data in various formats

## 🏗️ Tech Stack

### Frontend
- **Next.js 14** with App Router
- **Tailwind CSS** + **shadcn/ui** components
- **Recharts** for data visualization
- **Firebase Auth** for authentication

### Backend
- **Firebase Cloud Functions** (Node.js/TypeScript)
- **Firestore** database
- **Firebase Cloud Scheduler** for automated polling

### External APIs
- **X API v2** for follower data
- **xAI Grok** for unfollow analysis
- **Stripe** for payment processing

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- Firebase CLI
- X Developer Account
- xAI API Key
- Stripe Account

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin SDK
FIREBASE_ADMIN_SDK_KEY=your_admin_sdk_private_key

# X (Twitter) API
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_BEARER_TOKEN=your_twitter_bearer_token

# xAI Grok API
XAI_API_KEY=your_xai_api_key

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### Installation

1. **Install dependencies**:
```bash
npm install
cd functions && npm install
```

2. **Set up Firebase**:
```bash
firebase login
firebase init
```

3. **Deploy Firestore rules**:
```bash
firebase deploy --only firestore:rules
```

4. **Deploy Cloud Functions**:
```bash
firebase deploy --only functions
```

5. **Run development server**:
```bash
npm run dev
```

## 📊 Database Schema

### Users Collection (`/users/{uid}`)
```typescript
{
  xHandle: string,
  xUserId: string,
  xName: string,
  xAccessToken: string,
  xRefreshToken: string,
  subscription: 'free' | 'starter' | 'professional' | 'agency',
  subscriptionStatus: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string,
  createdAt: Timestamp,
  lastSync: Timestamp,
  settings: {
    notifications: {
      email: boolean,
      webhook: boolean,
      webhookUrl?: string
    },
    syncFrequency: string
  }
}
```

### Followers Snapshots (`/users/{uid}/followers/{snapshotId}`)
```typescript
{
  timestamp: Timestamp,
  followers: Array<{
    id: string,
    username: string,
    name: string,
    profile_image_url: string
  }>,
  totalCount: number,
  changes: {
    gained: number,
    lost: number
  }
}
```

### Unfollow Events (`/users/{uid}/unfollows/{eventId}`)
```typescript
{
  unfollowerHandle: string,
  unfollowerId: string,
  unfollowerName: string,
  unfollowerProfileImage: string,
  timestamp: Timestamp,
  grokAnalysis: {
    explanation: string,
    confidence: number,
    factors: Array<string>
  },
  recentTweets: Array<Tweet>,
  analyzedAt: Timestamp
}
```

## 🔧 API Endpoints

### Authentication
- `GET /api/auth/twitter/login` - Initiate X OAuth flow
- `GET /api/auth/twitter/callback` - Handle OAuth callback

### Stripe Integration
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/webhook` - Handle Stripe webhooks

## 🚀 Deployment

### Vercel Deployment
```bash
npm run build
vercel --prod
```

### Firebase Functions
```bash
firebase deploy --only functions
```

## 📈 Subscription Tiers

| Feature | Free | Starter ($19/mo) | Professional ($49/mo) | Agency ($149/mo) |
|---------|------|------------------|----------------------|------------------|
| Accounts | 1 | 1 | 3 | 10 |
| History | 7 days | 30 days | 90 days | 365 days |
| AI Insights | ❌ | ✅ | ✅ | ✅ |
| Webhooks | ❌ | ❌ | ✅ | ✅ |
| Export Data | ❌ | ✅ | ✅ | ✅ |
| API Access | ❌ | ❌ | ❌ | ✅ |

## 🔒 Security

- **OAuth2 Flow**: Secure X authentication
- **Firestore Rules**: User data isolation
- **Rate Limiting**: Smart API usage management
- **HTTPS Everywhere**: All communications encrypted
- **GDPR Compliant**: Privacy-first approach

## 📊 Rate Limits (X API Basic Plan)

- **User Lookups**: 100 requests/24hrs per user
- **Tweet Retrieval**: 5 requests/15mins per user
- **Follower Data**: 500 requests/24hrs per app
- **Posts Retrieval**: 15K posts/month total

The application implements smart rate limiting with premium user prioritization.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- Email: support@unfollowtracker.com
- Documentation: [docs.unfollowtracker.com](https://docs.unfollowtracker.com)
- Issues: [GitHub Issues](https://github.com/unfollowtracker/issues)

## 🎯 Roadmap

- [ ] Multi-platform support (Instagram, LinkedIn)
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features
- [ ] Mobile app
- [ ] API for third-party integrations

---

Built with ❤️ for the creator economy
