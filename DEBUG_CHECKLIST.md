# Debug Checklist - Feature Issues

## Quick Checks

### 1. Check Vercel Deployment Status
Go to: https://vercel.com/joeproais-projects/followlytics/deployments

- [ ] Latest deployment successful?
- [ ] Deployment matches latest commit `a4c3a6f`?
- [ ] Any build errors?

### 2. Check Environment Variables
Go to: Vercel → Followlytics → Settings → Environment Variables

**Required:**
- [ ] `XAI_API_KEY` is set (starts with `xai-`)
- [ ] `X_BEARER_TOKEN` is set
- [ ] `FIREBASE_PROJECT_ID` is set
- [ ] `FIREBASE_CLIENT_EMAIL` is set
- [ ] `FIREBASE_PRIVATE_KEY` is set

**After adding/updating env vars:**
- [ ] Redeploy required! (Vercel doesn't auto-redeploy on env changes)

### 3. Check Browser Console
Open DevTools (F12) → Console tab

Look for:
- [ ] Any red errors?
- [ ] Failed API calls (Network tab)?
- [ ] 401 Unauthorized errors?
- [ ] 500 Server errors?

### 4. Check Vercel Function Logs
Go to: Vercel → Followlytics → Functions → Logs

Filter by:
- `/api/x-analytics` 
- `/api/x-analytics/hashtag`
- `/api/x-analytics/tweet-analysis`

Look for:
- [ ] "XAI_API_KEY not set" warnings?
- [ ] "User not found" errors?
- [ ] "Rate limit exceeded" errors?
- [ ] Any other errors?

---

## Feature-Specific Debug

### Feature 1: Hashtag Analysis

**Test:**
1. Go to dashboard → Hashtags tab
2. Enter: `AI` or `crypto`
3. Click Analyze

**Expected:**
- Shows results (if tweets exist in last 7 days)
- Top tweet displayed
- Engagement metrics shown

**If not working, check:**
- [ ] Vercel logs show `[Hashtag Analysis] Searching for: "AI"`?
- [ ] Vercel logs show `[Hashtag Analysis] Found X tweets`?
- [ ] Error message about "last 7 days" means hashtag has no recent tweets (expected)
- [ ] Check if you have Starter tier or higher

**Common Issues:**
- ⚠️ Hashtag has no tweets in last 7 days (Twitter API limitation)
- ⚠️ Twitter API rate limit exceeded
- ⚠️ X_BEARER_TOKEN not valid

---

### Feature 2: Tweet Analysis

**Test:**
1. Go to dashboard → Tweet Analysis tab
2. Find any tweet ID (from twitter.com URL: `status/1234567890`)
3. Enter the ID
4. Click Analyze

**Expected:**
- Shows engagement metrics (likes, RTs, replies, quotes)
- Shows total engagement
- Maybe shows engagement rate

**If not working, check:**
- [ ] Vercel logs show `getTweetById` being called?
- [ ] Error about "Tweet not found"? (tweet deleted or private)
- [ ] Error about "OAuth 2.0 required"? (shouldn't happen anymore)

**Common Issues:**
- ⚠️ Tweet ID is wrong format
- ⚠️ Tweet is deleted or private
- ⚠️ X_BEARER_TOKEN not valid

---

### Feature 3: Account Strategy Summary (Overview)

**Test:**
1. Go to dashboard → Overview tab
2. Enter username: `elonmusk` or `naval`
3. Click Analyze

**Expected:**
- Blue gradient box appears with "📊 Account Strategy"
- Shows "What's Working" and "What to Improve"
- Shows 3-step Action Plan
- Shows Next Post Idea
- All powered by Grok AI

**If not working, check:**
- [ ] Do you see the blue box at all?
- [ ] Is it empty (no text)?
- [ ] Vercel logs show `analyzeAccountStrategy` being called?
- [ ] Vercel logs show Grok API errors?
- [ ] XAI_API_KEY environment variable set?

**Common Issues:**
- ⚠️ XAI_API_KEY not set → No AI analysis
- ⚠️ Grok API quota exceeded
- ⚠️ XAI_API_KEY invalid

---

### Feature 4: Dual Posts (Recent + Top)

**Test:**
1. Go to dashboard → Overview tab
2. Analyze an account with multiple posts
3. Look for TWO post boxes

**Expected:**
- "📍 Most Recent Post" box (purple border)
- "🏆 Top Performing Post" box (yellow border, if different from recent)
- Both show Grok AI analysis

**If not working, check:**
- [ ] Do you see both boxes?
- [ ] Are they the same post? (might be expected if recent post IS top performer)
- [ ] Vercel logs show "Are they the same? false"?
- [ ] Both posts have AI analysis?

**Common Issues:**
- ⚠️ Most recent post IS the top performer (both boxes show same post - expected)
- ⚠️ XAI_API_KEY not set → No AI analysis badges

---

### Feature 5: Grok AI Analysis

**Test:**
Look for green "Grok AI" badges on:
- Account Strategy section
- Recent Post analysis
- Top Post analysis

**Expected:**
- Green badges show "Grok AI"
- Performance scores shown (0-100)
- "Why It Worked" and "How to Improve" sections populated

**If not working, check:**
- [ ] XAI_API_KEY set in Vercel?
- [ ] Vercel logs show "Grok strategy analysis failed"?
- [ ] Vercel logs show "Error analyzing top post with Grok"?
- [ ] Check Grok API quota/billing

**Common Issues:**
- ⚠️ XAI_API_KEY not set
- ⚠️ XAI_API_KEY invalid
- ⚠️ Grok API quota exceeded

---

## Common Root Causes

### 1. Environment Variables Not Set ❌
**Symptom:** Features work in development, not in production

**Fix:**
1. Go to Vercel → Settings → Environment Variables
2. Add missing variables
3. **IMPORTANT:** Redeploy after adding env vars!

### 2. Deployment Not Updated ❌
**Symptom:** Code changes not reflected

**Fix:**
1. Check latest deployment matches git commit
2. If not, trigger manual redeploy:
   - Vercel → Deployments → Redeploy

### 3. Twitter API Rate Limit ❌
**Symptom:** "Rate limit exceeded" errors

**Fix:**
- Wait 15 minutes
- Check Twitter API dashboard for usage

### 4. Invalid API Keys ❌
**Symptom:** 401 errors, authentication failures

**Fix:**
- Verify XAI_API_KEY is valid (test on https://x.ai)
- Verify X_BEARER_TOKEN is valid (test on Twitter API dashboard)

---

## Step-by-Step Debug Process

### Step 1: Verify Deployment
```bash
# Check latest commit deployed
git log --oneline -1
# Should be: a4c3a6f

# Check Vercel deployment
# Go to: https://vercel.com/joeproais-projects/followlytics/deployments
# Latest deployment should match commit a4c3a6f
```

### Step 2: Check Environment Variables
```
Vercel → Followlytics → Settings → Environment Variables

Must have:
✅ XAI_API_KEY
✅ X_BEARER_TOKEN
✅ FIREBASE_PROJECT_ID
✅ FIREBASE_CLIENT_EMAIL
✅ FIREBASE_PRIVATE_KEY
```

### Step 3: Test Each Feature
1. **Hashtag:** Search "AI" → Should show results
2. **Tweet Analysis:** Use real tweet ID → Should show metrics
3. **Overview:** Analyze "elonmusk" → Should show Strategy box
4. **Dual Posts:** Check for 2 post boxes (or 1 if same)
5. **Grok AI:** Check for green badges

### Step 4: Check Logs
```
Vercel → Functions → Logs

Filter by endpoint, look for:
- "XAI_API_KEY not set" ← ENV VAR ISSUE
- "User not found" ← INVALID USERNAME
- "Rate limit exceeded" ← TWITTER API LIMIT
- "Grok analysis failed" ← GROK API ISSUE
```

---

## Quick Fixes

### If Nothing Works:
1. **Redeploy:** Vercel → Deployments → Redeploy latest
2. **Wait 2-3 min** for deployment to complete
3. **Hard refresh browser:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
4. **Clear cache:** DevTools → Application → Clear storage

### If Only AI Features Don't Work:
1. **Check XAI_API_KEY:** Vercel → Environment Variables
2. **Test Grok API key:** Try making test request to https://api.x.ai/v1/chat/completions
3. **Add XAI_API_KEY** if missing
4. **Redeploy** after adding

### If Hashtag/Tweet Analysis Don't Work:
1. **Check X_BEARER_TOKEN:** Vercel → Environment Variables
2. **Test Twitter API:** Try request to https://api.twitter.com/2/users/by/username/elonmusk
3. **Check rate limits:** Twitter Developer Portal
4. **Regenerate token** if invalid

---

## Test Commands (Copy-Paste)

### Test Grok API Key
```bash
curl -X POST https://api.x.ai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_XAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-2-latest",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

### Test Twitter API Key
```bash
curl -X GET "https://api.twitter.com/2/users/by/username/elonmusk" \
  -H "Authorization: Bearer YOUR_X_BEARER_TOKEN"
```

---

## Still Not Working?

**If features still don't work after all checks:**

1. **Share these details:**
   - Which specific feature?
   - Error message (exact text)?
   - Browser console errors?
   - Vercel function logs?

2. **Screenshots of:**
   - The issue you're seeing
   - Vercel environment variables (values hidden)
   - Browser console errors
   - Vercel function logs

3. **Confirm:**
   - Latest deployment matches commit a4c3a6f?
   - Environment variables set?
   - Redeployed after setting env vars?

---

**Last Updated:** 2025-10-04 6:10 PM EST
