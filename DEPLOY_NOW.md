# 🚀 Deploy to Production NOW

## ✅ Step 1: Add Environment Variables to Vercel

Go to: https://vercel.com/your-project/settings/environment-variables

Add these **EXACTLY** (copy-paste):

```bash
# Stripe (LIVE KEYS)
STRIPE_SECRET_KEY=sk_live_YOUR_KEY_FROM_STRIPE_DASHBOARD
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_FROM_STRIPE_DASHBOARD
STRIPE_SETUP_SECRET=xscope_setup_2025_secure_key_do_not_share

# Cron Security
CRON_SECRET=7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0

# App URL
NEXT_PUBLIC_APP_URL=https://followlytics-zeta.vercel.app

# AI Services (Add your keys here)
XAI_API_KEY=xai-YOUR_KEY_HERE
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
```

**Important:** Set all to "Production, Preview, Development"

---

## ✅ Step 2: Deploy to Vercel

```bash
git add .
git commit -m "Added Stripe configuration"
git push origin main
```

Wait for deployment to complete (2-3 minutes)

---

## ✅ Step 3: Create Stripe Products

Once deployed, run this command:

```bash
curl -X POST https://followlytics-zeta.vercel.app/api/stripe/create-products \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"xscope_setup_2025_secure_key_do_not_share\"}"
```

**You'll get back 3 price IDs. SAVE THEM!**

Example response:
```json
{
  "products": {
    "starter": {
      "price_id": "price_1ABC..."
    },
    "pro": {
      "price_id": "price_2DEF..."
    },
    "enterprise": {
      "price_id": "price_3GHI..."
    }
  }
}
```

---

## ✅ Step 4: Add Price IDs to Vercel

Go back to Vercel environment variables and add:

```bash
NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_1ABC...  # Use YOUR actual IDs
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_2DEF...
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE=price_3GHI...
```

**Then redeploy:**
```bash
# Just trigger redeploy in Vercel dashboard
# Or push a small change
```

---

## ✅ Step 5: Setup Stripe Webhook

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://followlytics-zeta.vercel.app/api/stripe/webhook`
4. Description: "XScope Subscriptions"
5. Select these events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
6. Click "Add endpoint"
7. **Copy the webhook secret** (starts with `whsec_...`)

---

## ✅ Step 6: Add Webhook Secret to Vercel

Add one more environment variable:

```bash
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET_HERE
```

**Final redeploy:**
```bash
# Trigger redeploy in Vercel dashboard
```

---

## ✅ Step 7: TEST IT!

1. Go to: https://followlytics-zeta.vercel.app/pricing
2. Click "Start Free Trial" on PRO plan
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete checkout
5. Check Firestore → `subscriptions` collection
6. Should see your subscription!

---

## 🎉 YOU'RE LIVE!

### What happens now:

1. **Free users** can sign up and use basic features
2. **Paid users** get AI analysis + competitor tracking
3. **Cron job** runs every 6 hours → Monitors competitors
4. **Cache** serves data instantly → Saves API calls
5. **Revenue** flows to your Stripe account automatically

### Profitability:
- 4 PRO users ($79 each) = $316/mo = **Break even + profit**
- 10 PRO users = $790/mo = **$590 profit** 💰

### Set & Forget:
- Competitor monitoring: **Automatic**
- Data caching: **Automatic**
- Subscription management: **Automatic**
- Revenue collection: **Automatic**

---

## 🔒 Security Checklist

- [x] Stripe keys added to Vercel ✅
- [x] CRON_SECRET set ✅
- [x] Webhook secret configured ✅
- [x] .env.local NOT committed to Git ✅
- [ ] Test a subscription
- [ ] Verify webhook works
- [ ] Check Firestore collections

---

## 📊 Monitor Your Success

**Stripe Dashboard:**
https://dashboard.stripe.com/

**Firestore Console:**
https://console.firebase.google.com/

**Vercel Logs:**
https://vercel.com/your-project/logs

**Cron Jobs:**
Check logs every 6 hours for competitor monitoring

---

## 🚨 Troubleshooting

**If products don't create:**
- Check Stripe dashboard for errors
- Verify STRIPE_SECRET_KEY is correct
- Check Vercel logs

**If webhook doesn't work:**
- Verify webhook secret is correct
- Check endpoint URL is exact
- Look at Stripe webhook logs

**If subscriptions don't save:**
- Check Firestore rules
- Verify webhook events are enabled
- Check Vercel function logs

---

## ✅ You're Done!

System is live and ready to make money. 

**Next:** Drive traffic and watch subscriptions roll in! 🎉
