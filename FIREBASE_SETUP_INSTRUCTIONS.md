# Firebase Environment Variables Setup

## Problem
OAuth tokens are not being stored in Firestore because Firebase Admin SDK environment variables are missing.

## Required Environment Variables

Add these to your Vercel project environment variables:

```bash
FIREBASE_PROJECT_ID=followlytics-cd4e1
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@followlytics-cd4e1.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...
-----END PRIVATE KEY-----"
```

## How to Get Service Account Key

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com/project/followlytics-cd4e1/settings/serviceaccounts/adminsdk
   - Click "Generate new private key"
   - Download the JSON file

2. **Extract Values from JSON:**
   ```json
   {
     "project_id": "followlytics-cd4e1",           // → FIREBASE_PROJECT_ID
     "client_email": "firebase-adminsdk-...",      // → FIREBASE_CLIENT_EMAIL  
     "private_key": "-----BEGIN PRIVATE KEY-----..." // → FIREBASE_PRIVATE_KEY
   }
   ```

## Setting in Vercel

1. **Go to Vercel Dashboard:**
   - Project Settings → Environment Variables

2. **Add Each Variable:**
   - `FIREBASE_PROJECT_ID` = `followlytics-cd4e1`
   - `FIREBASE_CLIENT_EMAIL` = `firebase-adminsdk-xxxxx@followlytics-cd4e1.iam.gserviceaccount.com`
   - `FIREBASE_PRIVATE_KEY` = `"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"`

3. **Important Notes:**
   - Include the quotes around the private key
   - Keep the `\n` newline characters
   - Include the full PEM headers and footers
   - Set for "Production" environment

## Testing

After setting the environment variables:

1. **Redeploy the app** (or wait for auto-deploy)
2. **Run the test:** `node test-firebase-config.js`
3. **Try OAuth flow** - tokens should now be stored in Firestore
4. **Check Firestore Console** to verify user documents are created

## Expected Result

After setup, the OAuth callback should successfully:
- ✅ Store user data in Firestore `users` collection
- ✅ Include `access_token` and `access_token_secret` fields
- ✅ Allow Daytona sandbox to retrieve tokens for authenticated scanning
