# Deploy Firestore Security Rules

## URGENT: Rules expire October 5, 2025

## Option 1: Deploy via Firebase Console (Easiest)

1. Go to **Firebase Console**: https://console.firebase.google.com
2. Select your **Followlytics** project
3. Click **Firestore Database** in the left menu
4. Click the **Rules** tab
5. Copy the contents from `firestore.rules` file
6. Paste into the editor
7. Click **Publish**

## Option 2: Deploy via Firebase CLI

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

## What These Rules Do

### Security Model:
- **Users can only access their own data** (based on `request.auth.uid`)
- **X tokens are protected** - only the owner can read/write
- **Scans are private** - only the user who created them can access
- **Subscriptions are read-only** - only Stripe webhooks can write
- **Admin-only collections** for system metrics and logs

### Collections Protected:
- ✅ `/users/{userId}` - User profiles
- ✅ `/x_tokens/{userId}` - OAuth tokens
- ✅ `/scans/{scanId}` - Follower scan data
- ✅ `/followers/{userId}` - Follower analytics
- ✅ `/analytics/{userId}` - User analytics
- ✅ `/competitors/{userId}` - Competitor tracking
- ✅ `/subscriptions/{userId}` - Stripe subscriptions (read-only)
- ✅ `/usage/{userId}` - API usage tracking (server-only)

### Example Queries That Work:
```javascript
// ✅ User reading their own data
const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))

// ✅ User reading their own scans
const scans = await getDocs(query(
  collection(db, 'scans'),
  where('userId', '==', auth.currentUser.uid)
))

// ❌ User trying to read another user's data
const otherUserDoc = await getDoc(doc(db, 'users', 'someOtherUserId')) // DENIED
```

## Verify Rules After Deployment

Test in Firebase Console:
1. Go to **Rules** tab
2. Click **Rules Playground**
3. Test various scenarios with authenticated/unauthenticated users
