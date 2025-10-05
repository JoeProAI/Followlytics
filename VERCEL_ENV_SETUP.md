# Vercel Environment Variables Setup

## Quick Setup - Copy & Paste to Vercel

Go to: **https://vercel.com/joeproais-projects/followlytics/settings/environment-variables**

---

## Stripe Price IDs (Add These Now!)

### 1. Standard Plan ($19/mo)
```
Name: NEXT_PUBLIC_STRIPE_PRICE_STANDARD
Value: price_1SEfMcG21OXgrh3f2X4lEPPQ
Environments: ✅ Production, ✅ Preview, ✅ Development
```

### 2. Pro Plan ($39/mo)
```
Name: NEXT_PUBLIC_STRIPE_PRICE_PRO
Value: price_1SEfNMG21OXgrh3fTY8UWnFQ
Environments: ✅ Production, ✅ Preview, ✅ Development
```

### 3. Agency Plan ($99/mo)
```
Name: NEXT_PUBLIC_STRIPE_PRICE_AGENCY
Value: price_1SEfNyG21OXgrh3fAAdK33dp
Environments: ✅ Production, ✅ Preview, ✅ Development
```

### 4. Founder Lifetime ($119 one-time)
```
Name: NEXT_PUBLIC_STRIPE_PRICE_FOUNDER
Value: price_1SEfOgG21OXgrh3fo1SMLLTQ
Environments: ✅ Production, ✅ Preview, ✅ Development
```

---

## How to Add to Vercel

For **each** variable above:

1. Go to: https://vercel.com/joeproais-projects/followlytics/settings/environment-variables
2. Click **"Add New"**
3. **Name:** (copy from above)
4. **Value:** (copy from above)
5. **Environments:** Check all 3 boxes (Production, Preview, Development)
6. Click **"Save"**
7. Repeat for all 4 variables

---

## After Adding All Variables

⚠️ **CRITICAL:** Vercel does NOT auto-deploy when you add environment variables!

**You MUST manually redeploy:**

1. Go to: https://vercel.com/joeproais-projects/followlytics/deployments
2. Click on the **latest deployment**
3. Click the **"⋮" (three dots)** menu
4. Click **"Redeploy"**
5. Wait ~2 minutes for deployment to complete

---

## Verify It Worked

After redeployment:

1. Go to: https://followlytics-zeta.vercel.app/pricing
2. Pricing page should show:
   - ✅ Standard: $19/month
   - ✅ Pro: $39/month
   - ✅ Agency: $99/month
   - ✅ Founder Lifetime: $119 one-time
3. Click "Start Free Trial" on any plan
4. Should redirect to Stripe checkout
5. Verify price matches

---

## Troubleshooting

### "This plan is not yet configured"
- ❌ Environment variable not added
- ✅ Double-check variable name matches exactly
- ✅ Ensure all 3 environments are checked
- ✅ Redeploy after adding

### Button works but shows wrong price in Stripe
- ❌ Wrong price ID
- ✅ Double-check price ID from Stripe Dashboard
- ✅ Products → Click product → Copy price ID

### Changes not showing
- ❌ Forgot to redeploy
- ✅ Redeploy from Vercel deployments page
- ✅ Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

## Complete Environment Variables Checklist

Make sure these are ALL set in Vercel:

### Firebase (Required)
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `FIREBASE_PRIVATE_KEY`

### Twitter/X API (Required)
- [ ] `X_BEARER_TOKEN`
- [ ] `XAI_API_KEY` (for Grok AI)

### Stripe (Required)
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_STANDARD` ⭐ NEW
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_PRO` ⭐ NEW
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_AGENCY` ⭐ NEW
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_FOUNDER` ⭐ NEW

### Optional (Beta Access)
- [ ] `STRIPE_BETA_COUPON_ID` (value: `BETA100`)
- [ ] `ADMIN_EMAILS` (your admin email)

### App URL (Required)
- [ ] `NEXT_PUBLIC_APP_URL` (value: `https://followlytics-zeta.vercel.app`)

---

## Quick Copy-Paste Commands

If you have Vercel CLI installed, you can add all at once:

```bash
vercel env add NEXT_PUBLIC_STRIPE_PRICE_STANDARD production preview development
# Paste: price_1SEfMcG21OXgrh3f2X4lEPPQ

vercel env add NEXT_PUBLIC_STRIPE_PRICE_PRO production preview development
# Paste: price_1SEfNMG21OXgrh3fTY8UWnFQ

vercel env add NEXT_PUBLIC_STRIPE_PRICE_AGENCY production preview development
# Paste: price_1SEfNyG21OXgrh3fAAdK33dp

vercel env add NEXT_PUBLIC_STRIPE_PRICE_FOUNDER production preview development
# Paste: price_1SEfOgG21OXgrh3fo1SMLLTQ
```

Then redeploy:
```bash
vercel --prod
```

---

## Status After Setup

```
✅ Code deployed (commit: 42fa60b)
✅ Stripe products created
✅ Price IDs added to Vercel
✅ Redeployed
✅ Pricing page live with new prices
✅ Checkout working for all tiers
```

---

**Last Updated:** 2025-10-04  
**Next Step:** Add these 4 variables to Vercel + Redeploy
