# 🚀 Followlytics Deployment Guide

## Vercel Deployment

### 1. Connect to Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
```

### 2. Environment Variables Setup

Add these environment variables in your Vercel dashboard:

#### Daytona Configuration
```
DAYTONA_API_KEY=dtn_420f8063b62966174107e84d48ecf5c1d7f5c680abf8a1cdd48348c020e5eaa9
DAYTONA_API_URL=https://app.daytona.io/api
DAYTONA_TARGET=us
```

#### X (Twitter) OAuth Configuration
```
X_API_KEY=8Wm0CYQYt2K5ZhF1e8VnLuBZc
X_API_SECRET=f4uwgHAkd1oHKsHBeQFuf4LJbrWQed1Gra3pkPEPpYNWtzaUJI
X_ACCESS_TOKEN=your_x_access_token_here
X_ACCESS_TOKEN_SECRET=your_x_access_token_secret_here
X_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAM7f4AEAAAAAUgCCL1mqxpt6QJ6KavJUQWew8P8%3DU29VkcKOjSF0s7UgGYajQQG3V1P9EJzRY8x6ZWI1u5LCC5H5nu
```

#### Firebase Configuration
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----\n"
```

#### Next.js Configuration
```
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
NEXTAUTH_SECRET=your_random_32_character_secret
```

### 3. X Developer App Configuration

Update your X app callback URL to:
```
https://your-vercel-domain.vercel.app/api/auth/twitter/callback
```

### 4. Firebase Security Rules

Update Firestore security rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // X tokens - users can only access their own
    match /x_tokens/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Follower scans - users can only access their own
    match /follower_scans/{scanId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Unfollower reports - users can only access their own
    match /unfollower_reports/{reportId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## Production Checklist

- [ ] Firebase project created and configured
- [ ] X Developer app created with OAuth 1.0a
- [ ] All environment variables set in Vercel
- [ ] Firestore security rules updated
- [ ] Domain configured for X app callback
- [ ] NEXTAUTH_SECRET generated (32+ characters)
- [ ] Test deployment successful

## Monitoring & Analytics

Consider adding:
- Vercel Analytics
- Sentry for error tracking
- Firebase Performance Monitoring
- Custom metrics for scan success rates

## Security Notes

- All API keys are stored as Vercel environment variables
- Daytona sandboxes provide isolated execution
- Firebase security rules enforce user data isolation
- X tokens are encrypted in Firestore
