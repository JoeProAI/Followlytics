# Deployment Setup - Required Environment Variables

## Vercel Environment Variables

Go to: https://vercel.com/joeproais-projects/followlytics/settings/environment-variables

### Required Variables:

#### X API Authentication
```
X_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA
```
**Where to get it:** 
- Go to https://developer.twitter.com/en/portal/dashboard
- Select your app
- Keys and tokens tab
- Copy the Bearer Token

---

#### Firebase Admin (Already Set)
```
FIREBASE_PROJECT_ID=followlytics-cd4e1
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@followlytics-cd4e1.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=(your private key)
```

---

#### Twitter OAuth (Already Set)
```
TWITTER_API_KEY=(your key)
TWITTER_API_SECRET=(your secret)
TWITTER_ACCESS_TOKEN=(your token)
TWITTER_ACCESS_TOKEN_SECRET=(your secret)
TWITTER_CALLBACK_URL=https://followlytics-zeta.vercel.app/api/auth/twitter/callback
```

---

## Steps to Add Environment Variable:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Name:** `X_BEARER_TOKEN`
   - **Value:** `AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA`
   - **Environment:** Production, Preview, Development (check all)
3. Click "Save"
4. Redeploy your app (Vercel will prompt you)

---

## Testing

After adding the variable and redeploying, test:

```bash
curl -X POST https://followlytics-zeta.vercel.app/api/intelligence/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{"username":"elonmusk"}'
```

Should return analysis data, not auth errors.

---

## Common Issues

### "Missing X Auth" Error
- X_BEARER_TOKEN not set in Vercel
- Solution: Add the environment variable and redeploy

### "Invalid Credentials" Error  
- Bearer token is wrong or expired
- Solution: Get a fresh token from Twitter Developer Portal

### "Rate Limit" Error (429)
- Normal - X API has limits
- Solution: Wait 15 minutes or upgrade X API tier

---

## X API Rate Limits

**Basic Tier ($200/month):**
- 10,000 tweets per month
- 300 requests per 15 minutes

**Pro Tier ($5,000/month):**
- 1 million tweets per month
- Higher rate limits

Our Content Intelligence endpoint uses about 5 requests per analysis (fetching tweets in batches).
