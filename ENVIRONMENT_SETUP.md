# Environment Variables Setup

## 🔑 Required Environment Variables

### **Production (Vercel)**

Add these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Firebase (Already Set ✅)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
FIREBASE_ADMIN_SDK_KEY=your_admin_sdk_key
FIREBASE_CLIENT_EMAIL=your_client_email

# X (Twitter) API - REQUIRED FOR ANALYTICS ⚠️
X_BEARER_TOKEN=your_bearer_token_here

# Twitter OAuth (Already Set ✅)
TWITTER_CONSUMER_KEY=rR0QYeVEdOabCthwyQ2vxy7ra
TWITTER_CONSUMER_SECRET=yhgT1ayY84BrQ9jg4isLJxPt7GCXWd9lTnxjCleD7HcMyWciRi

# Daytona (For Follower Scanning - Already Set ✅)
DAYTONA_API_KEY=dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567
DAYTONA_API_URL=https://app.daytona.io/api

# Cron Job Security (NEEDS TO BE ADDED)
CRON_SECRET=generate_random_secret_here
```

---

## ⚠️ CRITICAL: Missing Environment Variables

### **X_BEARER_TOKEN** (Required for Analytics)
**Where to get it:**
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Select your app
3. Go to "Keys and tokens" tab
4. Generate "Bearer Token"
5. Copy and add to Vercel

**Affects these tabs:**
- ✅ Overview
- ✅ Content Intel
- ✅ Search
- ✅ Compare Users
- ✅ Trending
- ✅ Competitors
- ✅ Hashtags
- ✅ Mentions
- ✅ Tweet Analysis

**Without this token, ALL analytics tabs will fail with 401/403 errors.**

---

### **CRON_SECRET** (Required for Historical Tracking)
**How to generate:**
```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**What it does:**
- Secures the daily snapshot cron job
- Prevents unauthorized cron execution
- Required for `/api/cron/daily-snapshots`

---

## ✅ Already Configured

These are already set in Vercel:

### **Firebase**
- All Firebase env vars configured ✅
- Authentication working ✅
- Firestore working ✅

### **Twitter OAuth**
- Consumer Key configured ✅
- Consumer Secret configured ✅
- OAuth flow working ✅

### **Daytona**
- API Key configured ✅
- API URL configured ✅
- Sandbox creation working ✅

---

## 🧪 How to Test After Adding X_BEARER_TOKEN

1. **Add X_BEARER_TOKEN to Vercel**
2. **Redeploy** (or wait for auto-deploy)
3. **Test each tab:**

```bash
# Content Intel
Username: JoeProAI
Expected: Analysis with recommendations

# Search
Query: AI OR "artificial intelligence"
Expected: Top tweets with engagement

# Compare
Users: elonmusk, BillGates
Expected: Side-by-side comparison

# Trending
Topic: AI
Expected: Trending tweets

# Hashtags
Hashtag: AI (without #)
Expected: Performance stats

# Mentions
Username: YourBrand
Expected: Recent mentions

# Tweet Analysis
Tweet ID: 1234567890 (from URL)
Expected: Engagement breakdown
```

---

## 🚨 Troubleshooting

### **If tabs don't work after adding X_BEARER_TOKEN:**

1. **Verify token is correct:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
   "https://api.twitter.com/2/users/by/username/elonmusk"
   ```
   Should return user data, not 401/403

2. **Check Vercel logs:**
   - Go to Vercel Dashboard → Deployments
   - Click latest deployment
   - Check Runtime Logs
   - Look for "X_BEARER_TOKEN is required" errors

3. **Redeploy:**
   - Sometimes Vercel doesn't pick up new env vars
   - Go to Deployments → Click "..." → Redeploy

4. **Check Twitter API limits:**
   - 300 requests per 15 minutes
   - If rate limited, wait 15 minutes

---

## 📋 Environment Variable Checklist

- [x] Firebase vars (already set)
- [x] Twitter OAuth vars (already set)
- [x] Daytona vars (already set)
- [ ] **X_BEARER_TOKEN** ⚠️ NEEDS TO BE ADDED
- [ ] **CRON_SECRET** ⚠️ NEEDS TO BE ADDED

---

## 🎯 Next Steps

1. **Get X Bearer Token** from Twitter Developer Portal
2. **Add to Vercel** environment variables
3. **Generate CRON_SECRET** using crypto
4. **Add CRON_SECRET to Vercel**
5. **Redeploy** or wait for auto-deploy
6. **Test all tabs** in dashboard

Once these 2 variables are added, **all 9 tabs will work perfectly!** 🎉
