# Stripe Pricing Setup Guide

## New Pricing Structure

| Tier | Old Price | New Price | Type | Notes |
|------|-----------|-----------|------|-------|
| **Free** | $0 | $0 | - | No change |
| **Standard** (was Starter) | $29/mo | **$19/mo** | Recurring | Renamed, price reduced |
| **Pro** | $79/mo | **$39/mo** | Recurring | Price reduced |
| **Agency** (was Enterprise) | $199/mo | **$99/mo** | Recurring | Renamed, price reduced |
| **Founder Lifetime** | - | **$119** | **One-time** | **NEW! Limited to 150 buyers** |

---

## Step 1: Create Products in Stripe Dashboard

Go to: **Stripe Dashboard → Products**

### 1. Standard Plan (Monthly)
```
Name: Followlytics Standard
Description: Perfect for solo creators - AI analysis, hashtag tracking, and real-time alerts
Statement Descriptor: FOLLOWLYTICS STD
Tax Code: Software as a Service (SaaS) - txcd_10103000

Pricing:
- Model: Standard pricing
- Price: $19.00 USD
- Billing period: Monthly
- Price ID: (copy this - you'll need it)
```

### 2. Pro Plan (Monthly)
```
Name: Followlytics Pro  
Description: AI-powered insights for growth - Advanced Grok AI and content strategy
Statement Descriptor: FOLLOWLYTICS PRO
Tax Code: Software as a Service (SaaS) - txcd_10103000

Pricing:
- Model: Standard pricing
- Price: $39.00 USD
- Billing period: Monthly
- Price ID: (copy this - you'll need it)
```

### 3. Agency Plan (Monthly)
```
Name: Followlytics Agency
Description: Full intelligence suite for teams - Unlimited access and API
Statement Descriptor: FOLLOWLYTICS AGCY
Tax Code: Software as a Service (SaaS) - txcd_10103000

Pricing:
- Model: Standard pricing
- Price: $99.00 USD
- Billing period: Monthly
- Price ID: (copy this - you'll need it)
```

### 4. Founder Lifetime (One-time)
```
Name: Followlytics Founder Lifetime
Description: One-time payment, lifetime access - Limited to 150 buyers
Statement Descriptor: FOLLOWLYTICS LIFE
Tax Code: Software as a Service (SaaS) - txcd_10103000

Pricing:
- Model: Standard pricing
- Price: $119.00 USD
- Billing period: One time ⭐
- Price ID: (copy this - you'll need it)

⚠️ IMPORTANT: Select "One time" NOT "Recurring"
```

---

## Step 2: Add Environment Variables to Vercel

Go to: **Vercel → Followlytics → Settings → Environment Variables**

Add these **NEW** environment variables:

```bash
# Standard Plan (monthly $19)
NEXT_PUBLIC_STRIPE_PRICE_STANDARD=price_xxxxxxxxxxxxx
# (Copy from Stripe Standard product price ID)

# Pro Plan (monthly $39)  
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_xxxxxxxxxxxxx
# (Copy from Stripe Pro product price ID)

# Agency Plan (monthly $99)
NEXT_PUBLIC_STRIPE_PRICE_AGENCY=price_xxxxxxxxxxxxx
# (Copy from Stripe Agency product price ID)

# Founder Lifetime (one-time $119)
NEXT_PUBLIC_STRIPE_PRICE_FOUNDER=price_xxxxxxxxxxxxx
# (Copy from Stripe Founder Lifetime product price ID)
```

**For each variable:**
1. Click "Add New"
2. Name: (copy from above)
3. Value: (paste price ID from Stripe)
4. Environments: ✅ Production, ✅ Preview, ✅ Development
5. Click "Save"

---

## Step 3: Update Webhook to Handle Lifetime Payments

The webhook at `/api/stripe/webhook` needs to handle both:
- `checkout.session.completed` for subscriptions (monthly plans)
- `checkout.session.completed` for one-time payments (founder lifetime)

**Key difference:**
- **Subscriptions:** Have `subscription` object
- **One-time payments:** No `subscription` object, check `mode === 'payment'`

The webhook should:
1. Check if `event.data.object.mode === 'payment'` → Lifetime purchase
2. If lifetime, grant `founder` tier permanently (no expiration)
3. Store `lifetimeAccess: true` in Firestore user doc

---

## Step 4: Cap Founder Lifetime to 150 Buyers

### Option A: Manual Tracking (Recommended for MVP)
1. Create Firestore collection: `founder_purchases`
2. On successful purchase, add document with `userId`, `timestamp`
3. Count documents before allowing purchase
4. If count >= 150, disable "Claim Your Spot" button

### Option B: Stripe Inventory (Advanced)
1. Use Stripe's inventory management
2. Set max quantity to 150
3. Stripe auto-disables when sold out

---

## Step 5: Redeploy After Adding Environment Variables

⚠️ **IMPORTANT:** Vercel does NOT auto-redeploy when you add environment variables!

After adding all price IDs:
1. Go to: **Vercel → Deployments**
2. Click: **Redeploy** on latest deployment
3. Wait ~2 minutes for deployment to complete

---

## Step 6: Test Each Plan

### Test Standard ($19/mo)
1. Go to: https://followlytics-zeta.vercel.app/pricing
2. Click "Start Free Trial" under **Standard**
3. Should redirect to Stripe checkout
4. Price shown: **$19.00/month**
5. Complete test purchase (use Stripe test card: `4242 4242 4242 4242`)

### Test Pro ($39/mo)
- Same process, verify price: **$39.00/month**

### Test Agency ($99/mo)
- Same process, verify price: **$99.00/month**

### Test Founder Lifetime ($119)
1. Click "Claim Your Spot" under **Founder Lifetime**
2. Should redirect to Stripe checkout
3. Price shown: **$119.00** (NO "/month")
4. Mode should be: **Payment** (one-time)
5. Complete test purchase

---

## Stripe Test Cards

Use these for testing:
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155

Expiry: Any future date (e.g., 12/34)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

---

## Expected Behavior

### Monthly Plans (Standard, Pro, Agency)
- ✅ Stripe checkout shows monthly recurring price
- ✅ Webhook creates subscription
- ✅ User tier updated in Firestore
- ✅ User redirected to dashboard
- ✅ Can cancel anytime from dashboard

### Founder Lifetime
- ✅ Stripe checkout shows ONE-TIME price ($119)
- ✅ No recurring billing
- ✅ Webhook grants `founder` tier with `lifetimeAccess: true`
- ✅ User gets all Agency features forever
- ✅ Cannot be canceled (already paid)
- ✅ Limited to 150 buyers total

---

## Troubleshooting

### "This plan is not yet configured"
- ❌ Environment variable not set
- ✅ Add NEXT_PUBLIC_STRIPE_PRICE_* to Vercel
- ✅ Redeploy after adding

### Stripe checkout shows wrong price
- ❌ Wrong price ID in environment variable
- ✅ Double-check price ID in Stripe Dashboard
- ✅ Update Vercel env var
- ✅ Redeploy

### Founder Lifetime shows "/month"
- ❌ Created as recurring in Stripe
- ✅ Recreate product with "One time" billing
- ✅ Update price ID in Vercel

### Webhook not updating tier
- ❌ Webhook not deployed
- ✅ Check webhook endpoint exists: `/api/stripe/webhook`
- ✅ Check Stripe webhook secret is set: `STRIPE_WEBHOOK_SECRET`
- ✅ Check Vercel function logs for errors

---

## Migration from Old Pricing

### Existing Customers
- Keep their current pricing (grandfather clause)
- Don't force upgrades
- Optionally: Offer to switch to new pricing if it's cheaper

### Communication
```
Subject: 🎉 New Lower Pricing!

We've reduced our prices:
- Standard: $29 → $19 (-34%)
- Pro: $79 → $39 (-51%)
- Agency: $199 → $99 (-50%)

Your current plan: [CURRENT PLAN] @ [CURRENT PRICE]
New equivalent: [NEW PLAN] @ [NEW PRICE]

Would you like to switch? [Yes] [No, keep current price]
```

---

## Founder Lifetime Strategy

### Scarcity Marketing
- "Only 150 spots available"
- "X spots remaining" (update in real-time)
- "Lock in lifetime access for $119"

### Benefits
- No monthly fees ever
- All future updates included
- Founder badge in dashboard
- Early access to new features
- Exclusive founder community

### After Selling Out
- Remove tier from pricing page
- Show "SOLD OUT - 150/150 claimed"
- Create urgency for monthly plans

---

## Revenue Projections

### Before (Old Pricing)
- Starter: $29/mo
- Pro: $79/mo
- Enterprise: $199/mo

**100 customers = $10,700/mo MRR**

### After (New Pricing)
- Standard: $19/mo × 50 users = $950/mo
- Pro: $39/mo × 30 users = $1,170/mo
- Agency: $99/mo × 10 users = $990/mo
- Founder Lifetime: $119 × 150 = **$17,850 one-time**

**Monthly: $3,110/mo MRR**
**One-time: $17,850** (from founders)
**Year 1 Total: $37,320 + $17,850 = $55,170**

### Conversion Strategy
- Lower prices = higher conversion rate
- Lifetime offer = cash injection upfront
- Use founder cash to fund growth marketing
- Upsell monthly users over time

---

## Next Steps

1. ✅ Create 4 products in Stripe Dashboard
2. ✅ Copy price IDs to Vercel environment variables
3. ✅ Redeploy Vercel
4. ✅ Test each plan with Stripe test cards
5. ✅ Update webhook to handle lifetime payments
6. ✅ Implement founder cap (150 buyers max)
7. ✅ Launch new pricing page
8. ✅ Email existing customers about new pricing
9. ✅ Market founder lifetime offer (create urgency)

---

**Last Updated:** 2025-10-04  
**Status:** Ready to implement  
**Deployment:** Pending Stripe setup + Vercel env vars
