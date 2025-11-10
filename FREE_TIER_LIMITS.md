# Free Tier Limits - Followlytics

## Current Free Tier Configuration

**Monthly Follower Extraction Limit: 2,000 followers**

This limit is designed to:
- ✅ Allow free users to extract their followers a few times per month
- ✅ Prevent spam and abuse
- ✅ Keep server costs manageable
- ✅ Encourage upgrade to paid tiers for power users

## How It Works

### For Free (Beta) Users:
- **2,000 followers/month** can be extracted
- If you have 800 followers, you can extract ~2-3 times per month
- Credits reset monthly on the first of each month
- **10 AI analysis credits** per month
- **5 tweet generation credits** per month

### Example Usage:
```
Account: @JoeProAI (800 followers)

Scan 1 (Jan 1): 800 followers extracted → 1,200 remaining
Scan 2 (Jan 15): 800 followers extracted → 400 remaining  
Scan 3 (Jan 25): 800 followers extracted → Out of credits ❌

Solution: Wait until Feb 1 for reset OR upgrade to Starter ($39/mo for 50,000/mo)
```

## Main Account Tracking

### How Your Main Account Is Set:
1. When you sign up and complete Twitter OAuth, your Twitter username is stored
2. Your main account is tracked automatically when you:
   - Click "Extract Followers" button
   - Run a follower scan
   - The system uses your authenticated Twitter account

### For @JoeProAI:
Your main account **should** be automatically set to `JoeProAI` based on your Twitter OAuth.

If it's not showing correctly:
1. Check Settings → Account → Main Account
2. Re-authenticate Twitter if needed
3. Your target_username should be `joepro.ai` or `JoeProAI`

## Upgrade Tiers

| Tier | Price | Followers/Month | AI Analysis | Best For |
|------|-------|-----------------|-------------|----------|
| **Beta (Free)** | $0 | 2,000 | 10 | Testing, small accounts |
| **Starter** | $39 | 50,000 | 100 | Growing creators |
| **Pro** | $79 | 200,000 | 500 | Established influencers |
| **Scale** | $149 | 1,000,000 | 2,000 | Power users |
| **Enterprise** | $499 | 10,000,000 | Unlimited | Agencies |

## Why 2,000 Followers/Month for Free?

### Prevents Spam:
- Users can't constantly re-scan every hour
- Forces thoughtful usage
- Reduces server load

### Fair for Small Accounts:
- If you have <800 followers, you can scan 2-3x/month
- Enough to track growth trends
- Catch unfollowers monthly

### Encourages Upgrades:
- Power users who need more will upgrade
- Sustainable business model
- Better support for paying customers

## Technical Implementation

The limit is enforced in: `src/config/tiers.ts`

```typescript
beta: {
  name: 'beta',
  displayName: 'Beta (Free)',
  price: 0,
  
  credits: {
    followers: 2_000,  // 2,000/month
    ai_analysis: 10,
    tweet_generation: 5,
  },
  
  overageRates: {
    followers: 2.00,  // $2 per 1,000 over limit (encourages upgrade)
    ai_analysis: 0.20,
    tweet_generation: 1.00,
  },
}
```

## Monitoring Your Usage

Check your current usage in the dashboard:
- **Followers Extracted This Month:** Shows how many you've used
- **Remaining:** Shows how many you have left
- **Resets:** Shows when your credits refresh

## Recommended Usage for Free Users

### Best Practice:
- **Scan once per week** (saves credits)
- **Use "New Followers" view** to see who's new
- **Track unfollowers** without re-scanning
- **Upgrade when you hit limits** consistently

### Pro Tip:
If you're consistently hitting the 2,000 limit, upgrade to Starter for 50,000/month.
That's 25x more for just $39/month → **$0.00078 per follower** vs Enterprise API's **$52.50 per follower** 🚀

---

## Questions?

- Free tier limits too restrictive? Consider Starter ($39/mo)
- Need more for agency use? Check Enterprise ($499/mo)
- Usage questions? Check dashboard → Usage tab
