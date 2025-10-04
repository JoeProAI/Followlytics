# Stripe Setup - Quick Start Guide (30 Minutes)

## Current Problem
❌ Users can't upgrade to paid plans - subscriptions fail silently  
❌ Stripe price IDs not configured  
❌ No revenue possible until fixed  

## Solution (Follow These Steps)

---

## Step 1: Create Stripe Products (15 min)

### Go to Stripe Dashboard
👉 https://dashboard.stripe.com/products

### Create Product 1: Starter ($29/month)
1. Click **"+ Add Product"**
2. Fill in:
   ```
   Name: Followlytics Starter
   Description: Perfect for solo creators - 20 searches/day, tweet generation
   Pricing Model: Recurring
   Price: $29.00 USD
   Billing Period: Monthly
   ```
3. Click **"Save product"**
4. **COPY THE PRICE ID** (looks like `price_1Abc123...`)
   - Write it down: `STARTER_PRICE_ID = price_________________`

### Create Product 2: Pro ($79/month)
1. Click **"+ Add Product"**
2. Fill in:
   ```
   Name: Followlytics Pro
   Description: AI-powered insights - 100 searches/day, viral analysis, hashtag tracking
   Pricing Model: Recurring
   Price: $79.00 USD
   Billing Period: Monthly
   ```
3. Click **"Save product"**
4. **COPY THE PRICE ID**
   - Write it down: `PRO_PRICE_ID = price_________________`

### Create Product 3: Enterprise ($199/month)
1. Click **"+ Add Product"**
2. Fill in:
   ```
   Name: Followlytics Enterprise
   Description: Full intelligence suite - Unlimited searches, API access, team collaboration
   Pricing Model: Recurring
   Price: $199.00 USD
   Billing Period: Monthly
   ```
3. Click **"Save product"**
4. **COPY THE PRICE ID**
   - Write it down: `ENTERPRISE_PRICE_ID = price_________________`

---

## Step 2: Configure Stripe Webhook (5 min)

### Go to Webhooks
👉 https://dashboard.stripe.com/webhooks

### Create Endpoint
1. Click **"+ Add endpoint"**
2. **Endpoint URL**: 
   ```
   https://followlytics-zeta.vercel.app/api/stripe/webhook
   ```
3. **Description**: `Followlytics subscription events`
4. **Events to send**: Click "Select events" and choose:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
5. Click **"Add endpoint"**
6. **COPY THE SIGNING SECRET** (shows after creation, looks like `whsec_...`)
   - Write it down: `WEBHOOK_SECRET = whsec_________________`

---

## Step 3: Add Environment Variables to Vercel (10 min)

### Go to Vercel Dashboard
👉 https://vercel.com/dashboard

### Navigate to Project Settings
1. Click on **"Followlytics"** project
2. Go to **"Settings"** tab
3. Click **"Environment Variables"** in left sidebar

### Add These 4 Variables
For each variable:
- Click **"Add New"**
- Enter **Name** and **Value**
- Select **"Production"**, **"Preview"**, AND **"Development"** (all 3)
- Click **"Save"**

#### Variable 1: Starter Price ID
```
Name:  NEXT_PUBLIC_STRIPE_PRICE_STARTER
Value: [paste your Starter price_... ID from Step 1]
```

#### Variable 2: Pro Price ID
```
Name:  NEXT_PUBLIC_STRIPE_PRICE_PRO
Value: [paste your Pro price_... ID from Step 1]
```

#### Variable 3: Enterprise Price ID
```
Name:  NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE
Value: [paste your Enterprise price_... ID from Step 1]
```

#### Variable 4: Webhook Secret
```
Name:  STRIPE_WEBHOOK_SECRET
Value: [paste your whsec_... from Step 2]
```

---

## Step 4: Redeploy Application (2 min)

### Option A: Git Push (Recommended)
```bash
git commit --allow-empty -m "trigger redeploy for Stripe env vars"
git push origin main
```
Vercel will auto-deploy in ~2 minutes.

### Option B: Manual Redeploy
1. In Vercel Dashboard → Deployments
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**
4. Check **"Use existing Build Cache"** (faster)
5. Click **"Redeploy"**

---

## Step 5: Test Subscription Flow (5 min)

### Test with Stripe Test Card
1. Go to your site: https://followlytics-zeta.vercel.app/pricing
2. Make sure you're logged in
3. Click **"Start Free Trial"** on **Starter** plan
4. Should redirect to Stripe Checkout
5. Use test card details:
   ```
   Card Number: 4242 4242 4242 4242
   Expiry: Any future date (e.g., 12/25)
   CVC: Any 3 digits (e.g., 123)
   ZIP: Any 5 digits (e.g., 12345)
   ```
6. Click **"Subscribe"**
7. Should redirect back to dashboard
8. Check dashboard - should show **"STARTER"** badge

### Verify in Stripe Dashboard
1. Go to https://dashboard.stripe.com/subscriptions
2. Should see new subscription for test customer
3. Check webhook logs: https://dashboard.stripe.com/webhooks
4. Should see `checkout.session.completed` event (✓ succeeded)

### Verify in Firebase
1. Go to Firebase Console: https://console.firebase.google.com
2. Navigate to Firestore Database
3. Look in `subscriptions` collection
4. Find your user ID → Should show `tier: "starter"`

---

## Troubleshooting

### Issue: "This plan is not yet configured"
**Cause**: Environment variables not set or deployment not updated  
**Fix**: 
- Verify all 4 env vars are in Vercel
- Redeploy the application
- Wait 2 minutes for deployment to complete

### Issue: Checkout page doesn't load
**Cause**: Price ID is wrong or Stripe key is invalid  
**Fix**: 
- Double-check price IDs in Stripe Dashboard
- Verify they match exactly in Vercel env vars
- Check Stripe API keys are correct (STRIPE_SECRET_KEY)

### Issue: Subscription created but tier not updated
**Cause**: Webhook not firing or failing  
**Fix**: 
- Check webhook logs in Stripe Dashboard
- Verify webhook URL is correct: `/api/stripe/webhook`
- Check STRIPE_WEBHOOK_SECRET is set in Vercel
- Look for errors in Vercel function logs

### Issue: "Unauthorized" error
**Cause**: User not logged in or Firebase token expired  
**Fix**: 
- Log out and log back in
- Try again
- Check browser console for errors

---

## Quick Reference

### Stripe URLs
- **Dashboard**: https://dashboard.stripe.com
- **Products**: https://dashboard.stripe.com/products
- **Webhooks**: https://dashboard.stripe.com/webhooks
- **Test Cards**: https://stripe.com/docs/testing

### Vercel URLs
- **Dashboard**: https://vercel.com/dashboard
- **Environment Variables**: Settings → Environment Variables
- **Function Logs**: Deployments → [Latest] → Functions

### Your App URLs
- **Live Site**: https://followlytics-zeta.vercel.app
- **Pricing Page**: https://followlytics-zeta.vercel.app/pricing
- **Dashboard**: https://followlytics-zeta.vercel.app/dashboard

---

## What Happens After Setup

### Revenue Starts Immediately ✅
- Users can upgrade to paid plans
- Stripe handles billing automatically
- Webhook updates user tier in Firestore
- Features unlock based on tier

### Automatic Billing
- Monthly recurring charges
- Stripe sends invoices
- Failed payments retry automatically
- You get email notifications

### Customer Management
- View subscriptions in Stripe Dashboard
- Cancel/refund from Stripe
- Update pricing anytime
- Export customer data

---

## Expected Timeline

| Time | Task | Status |
|------|------|--------|
| 0-15 min | Create 3 Stripe products | ⏳ |
| 15-20 min | Configure webhook | ⏳ |
| 20-30 min | Add env vars to Vercel | ⏳ |
| 30-32 min | Redeploy app | ⏳ |
| 32-37 min | Test subscription flow | ⏳ |
| **TOTAL: ~40 minutes** | **Ready to accept payments** | 🎯 |

---

## Success Metrics

After setup, track these in Stripe Dashboard:

### Week 1
- Test subscriptions working ✅
- At least 1 real paid subscription
- Webhook success rate >95%

### Week 2-4
- 10+ paid subscribers
- $500+ MRR (Monthly Recurring Revenue)
- <1% failed payments

### Month 2+
- 50+ paid subscribers
- $2,000+ MRR
- Upgrade flow converts at 5-10%

---

## Pricing Psychology

### Why These Prices Work

**Starter ($29)**
- Entry point for individuals
- Unlocks tweet generation (high value)
- Low commitment, easy yes

**Pro ($79)**
- 2.7x price jump = premium positioning
- AI analysis justifies higher price
- Target: serious creators & agencies

**Enterprise ($199)**
- 2.5x price jump = enterprise tier
- Unlimited searches + API = B2B value
- Target: agencies, brands, power users

### Price Anchoring
- Free tier shows $0 value
- Starter looks cheap vs Pro
- Pro looks cheap vs Enterprise
- Enterprise looks like "best value"

---

## What to Do After First Subscription

### Celebrate 🎉
You just enabled revenue generation!

### Monitor
- Check Stripe Dashboard daily
- Watch for failed payments
- Respond to customer emails

### Optimize
- Track which tier converts best
- A/B test pricing page copy
- Add social proof (X customers trust us)
- Add testimonials from early users

### Scale
- Increase marketing spend
- Add annual pricing (20% discount)
- Create affiliate program
- Build API for Enterprise tier

---

## Need Help?

### Stripe Support
- **Docs**: https://stripe.com/docs
- **Support**: https://support.stripe.com
- **Phone**: 1-888-926-2289 (US)

### Common Questions

**Q: Should I use test mode or live mode?**  
A: Use test mode until you're ready to accept real money. Switch to live mode when launching.

**Q: Do I need a business entity?**  
A: No, you can use Stripe as an individual. Just need SSN for US or equivalent.

**Q: What fees does Stripe charge?**  
A: 2.9% + $0.30 per transaction. So $29 subscription = $0.87 + $0.30 = $1.17 fee, you keep $27.83.

**Q: How do I get paid out?**  
A: Stripe automatically transfers to your bank account every 2 days (after initial waiting period).

**Q: Can I refund a subscription?**  
A: Yes, anytime in Stripe Dashboard. Full or partial refunds supported.

---

## Summary

**Problem**: Subscriptions broken, no revenue possible  
**Solution**: 4 environment variables + 40 minutes of setup  
**Result**: Payments working, revenue flowing, business scaling  

**Next Step**: Follow Step 1 above - create your first Stripe product! 🚀
