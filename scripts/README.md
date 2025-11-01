# 🧪 Test Scripts

## 1. Test Current Apify Actor (RECOMMENDED - Run This First!)

Tests your existing `premium-x-follower-scraper-following-data` actor to check if it's returning verified status.

**Run this test:**
```powershell
$env:APIFY_API_TOKEN="your_token_here"
npm run test:current-actor
```

This will show you:
- ✅ What verification fields the actor returns
- ✅ How many verified followers it finds
- ✅ All available data fields
- ✅ Whether the actor supports verified status

## 2. Apify Enrichment Test

Tests the Apify Premium X User Scraper integration to verify it can retrieve verified status and detailed follower metrics.

### Prerequisites

1. **Get Apify API Token:**
   - Go to [https://console.apify.com/](https://console.apify.com/)
   - Sign up (includes free $5 credit)
   - Navigate to Settings → Integrations
   - Copy your API token

### Running the Test

**PowerShell:**
```powershell
$env:APIFY_API_TOKEN="your_token_here"
npm run test:apify
```

**Bash/Linux/Mac:**
```bash
export APIFY_API_TOKEN="your_token_here"
npm run test:apify
```

**Or with inline token:**
```powershell
# PowerShell
$env:APIFY_API_TOKEN="your_token_here"; npm run test:apify

# Bash
APIFY_API_TOKEN="your_token_here" npm run test:apify
```

### What the Test Does

1. ✅ Verifies Apify API token is valid
2. ✅ Calls Premium X User Scraper for 3 test accounts
3. ✅ Retrieves verified status (Blue/Gold/Gray checkmarks)
4. ✅ Fetches detailed metrics (followers, tweets, etc.)
5. ✅ Validates data structure
6. ✅ Reports cost and performance

### Test Accounts

The test enriches these accounts:
- `@elonmusk` - Known verified account
- `@JoeProAI` - Your account
- `@OpenAI` - Organization account

### Expected Output

```
🧪 Starting Apify Enrichment Test...

✅ API Token found

🔧 Initializing Apify client...
✅ Client initialized

🚀 Running Premium X User Scraper for 3 users...
   Users: elonmusk, JoeProAI, OpenAI

✅ Actor run completed in 2.34s
   Run ID: xyz123...
   Status: SUCCEEDED

📥 Fetching results from dataset...
✅ Retrieved 3 profiles

📊 ENRICHMENT RESULTS:
================================================================================

1. @elonmusk
────────────────────────────────────────────────────────────────────────────────
   Name: Elon Musk
   Verified: ✓ YES
   Blue Verified: ✓ YES
   Verification Type: blue
   Followers: 180,000,000
   Following: 500
   Tweets: 42,000
   Location: ...
   Protected: No
   Created: ...
   Bio: ...

[... more profiles ...]

📈 SUMMARY STATISTICS:
────────────────────────────────────────────────────────────────────────────────
   Total Profiles: 3
   Legacy Verified: 2
   Twitter Blue: 1
   Total Followers: 180,500,000
   Average Followers: 60,166,666
   Cost: $0.0005
   Duration: 2.34s
────────────────────────────────────────────────────────────────────────────────

🔍 DATA STRUCTURE VALIDATION:
────────────────────────────────────────────────────────────────────────────────
   ✅ All required fields present
   Verification types found: blue, gold
────────────────────────────────────────────────────────────────────────────────

✅ TEST COMPLETED SUCCESSFULLY!

🎉 The Apify Premium X User Scraper integration is working correctly.
📝 You can now safely add the FollowerEnrichment component to the dashboard.
```

### Troubleshooting

**Error: "APIFY_API_TOKEN environment variable not set"**
- Make sure you set the environment variable before running the test
- Use the correct syntax for your shell (PowerShell vs Bash)

**Error: "Authentication Error (401)"**
- Your API token is invalid or expired
- Get a fresh token from [https://console.apify.com/](https://console.apify.com/)

**Error: "Payment Required (402)"**
- Your Apify account has insufficient credits
- Add credits at [https://console.apify.com/billing](https://console.apify.com/billing)
- Free tier includes $5 credit (enough for 33,000+ profiles!)

### Cost Breakdown

The test enriches 3 profiles:
- Cost: **$0.0005** (less than a penny!)
- Free tier includes $5 credit = **33,333 profiles**

### Next Steps

After successful test:
1. ✅ Add `APIFY_API_TOKEN` to Vercel environment variables
2. ✅ Add `FollowerEnrichment` component to dashboard
3. ✅ Deploy and test in production
4. ✅ Enrich your real followers!
