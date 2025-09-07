# Followlytics Deployment Guide

## Web App Deployment (Vercel)

### Prerequisites
- Vercel account connected to GitHub
- Environment variables configured

### Deploy Steps
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard:
   ```
   FIREBASE_PROJECT_ID=followlytics-cd4e1
   FIREBASE_CLIENT_EMAIL=your-service-account-email
   FIREBASE_PRIVATE_KEY=your-private-key
   TWITTER_API_KEY=your-twitter-api-key
   TWITTER_API_SECRET=your-twitter-api-secret
   ```
4. Deploy automatically on push

### Verify Deployment
- Visit https://your-app.vercel.app
- Test user authentication
- Generate API key
- Check all endpoints respond

## Browser Extension Distribution

### Option 1: Direct Distribution (Immediate)
1. Zip the `browser-extension` folder
2. Host download link on your website
3. Provide installation instructions to users
4. Users install via Developer mode

### Option 2: Chrome Web Store (Production)
1. Create Chrome Developer account ($5 fee)
2. Package extension as .zip
3. Submit for review (2-3 days)
4. Users install from Chrome Web Store

## User Onboarding Flow

### Step 1: Dashboard Setup
1. User visits https://followlytics.vercel.app
2. Signs in with Twitter OAuth
3. Generates API key in dashboard
4. Copies API key (format: flw_xxxxxxxxxxxx)

### Step 2: Extension Installation
1. Downloads extension from your site
2. Goes to chrome://extensions/
3. Enables Developer mode
4. Clicks "Load unpacked"
5. Selects extension folder

### Step 3: Extension Setup
1. Clicks extension icon in Chrome
2. Pastes API key from dashboard
3. Clicks "Connect to Followlytics"
4. Extension shows "Ready to Scan"

### Step 4: Follower Scanning
1. Goes to any Twitter profile
2. Clicks "Followers" tab
3. Clicks extension icon
4. Clicks "Start Follower Scan"
5. Extension automatically scrolls and collects followers
6. Data appears in Followlytics dashboard

## Technical Architecture

### API Endpoints
- `/api/extension/validate` - Validates user API keys
- `/api/extension/upload` - Receives follower data
- `/api/user/api-keys` - Manages API key generation
- `/api/twitter/followers-api` - Twitter OAuth integration

### Data Storage
- User data: Firestore users collection
- Followers: users/{userId}/followers subcollection
- API keys: users/{userId}/api_keys subcollection
- Scan metadata: users/{userId}/scans subcollection

### Security
- API keys use Bearer token authentication
- All requests validate against Firestore
- Extension only accesses Twitter domains
- No credentials stored in extension

## Monitoring & Analytics

### Key Metrics to Track
- Extension installations
- API key generations
- Successful scans
- Error rates
- User retention

### Error Handling
- Extension shows clear error messages
- API returns detailed error responses
- Dashboard displays connection status
- Automatic retry mechanisms

## Scaling Considerations

### Performance
- Firestore batch writes for large follower lists
- Rate limiting on API endpoints
- Extension throttling to avoid Twitter blocks

### Costs
- Firestore: ~$0.06 per 100K operations
- Vercel: Free tier supports moderate usage
- Firebase: Pay-as-you-go after free tier

### User Limits
- API keys: Unlimited per user
- Followers: No limit (Firestore scales)
- Scans: Rate limited to prevent abuse
