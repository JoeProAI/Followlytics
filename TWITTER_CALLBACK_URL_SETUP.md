# Twitter App Callback URL Configuration

## Issue
The Twitter OAuth flow is failing with error code 415: "Callback URL not approved for this client application"

## Required Callback URL
The following callback URL needs to be added to your Twitter app settings:

```
https://followlytics.vercel.app/api/auth/twitter/callback
```

## Steps to Fix

### 1. Access Twitter Developer Portal
1. Go to [https://developer.twitter.com/en/portal/dashboard](https://developer.twitter.com/en/portal/dashboard)
2. Sign in with your Twitter account
3. Navigate to your app (likely named "Followlytics" or similar)

### 2. Update App Settings
1. Click on your app name
2. Go to "App settings" or "Settings" tab
3. Look for "Authentication settings" or "Callback URLs"
4. Click "Edit" or "Set up"

### 3. Add Callback URL
1. In the "Callback URLs" section, add:
   ```
   https://followlytics.vercel.app/api/auth/twitter/callback
   ```
2. If there are existing URLs, keep them and add this as an additional URL
3. Save the changes

### 4. Verify App Permissions
While you're there, ensure the app has the correct permissions:
- **App permissions**: Read and write
- **Type of App**: Web App, Automated App or Bot
- **User authentication settings**: OAuth 1.0a should be enabled

### 5. Test the Fix
After updating the callback URL, run the test again:
```bash
node test-complete-oauth-scan-flow.js
```

## Alternative Callback URLs (if needed)
If you need to test locally or have multiple environments:

**Local Development:**
```
http://localhost:3000/api/auth/twitter/callback
```

**Production:**
```
https://followlytics.vercel.app/api/auth/twitter/callback
```

## Current Configuration
The app is currently configured to use:
- **Callback URL**: `${NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`
- **Production URL**: `https://followlytics.vercel.app/api/auth/twitter/callback`

## Verification
Once the callback URL is added, the OAuth flow should work and users will be able to:
1. Click "Authorize Twitter Access" in the dashboard
2. Be redirected to Twitter's authorization page
3. Grant permission to the app
4. Be redirected back to the dashboard with authorization success
5. Start scanning their followers

## Notes
- Callback URLs must match exactly (including https/http)
- Changes may take a few minutes to propagate
- You can have multiple callback URLs for different environments
