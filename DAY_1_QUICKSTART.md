# DAY 1 QUICK START - DO THIS TODAY

**Goal:** Turn on money switches and prepare for launch

**Time needed:** 4-6 hours

---

## STEP 1: STRIPE SETUP (30 min)

### A. Enable Tax Collection
1. Go to Stripe Dashboard: https://dashboard.stripe.com/settings/tax
2. Click **"Enable Tax Collection"**
3. Select automatic tax calculation
4. Add your business address
5. Save settings

### B. Create Annual Price IDs
You need 3 new annual prices (2 months free = 10 months pricing):

**Standard Annual:**
- Amount: $190 (instead of $228)
- Interval: Yearly
- Copy Price ID → Add to Vercel as `NEXT_PUBLIC_STRIPE_PRICE_STANDARD_ANNUAL`

**Pro Annual:**
- Amount: $390 (instead of $468)
- Interval: Yearly
- Copy Price ID → Add to Vercel as `NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL`

**Agency Annual:**
- Amount: $990 (instead of $1,188)
- Interval: Yearly
- Copy Price ID → Add to Vercel as `NEXT_PUBLIC_STRIPE_PRICE_AGENCY_ANNUAL`

### C. Test Payment Flow
1. Use Stripe test cards: https://stripe.com/docs/testing
2. Test card: `4242 4242 4242 4242`
3. Complete a test purchase
4. Verify webhook fires correctly

---

## STEP 2: COMPLIANCE CHECK (45 min)

### Twitter/X Terms Compliance

**Action items:**
1. [ ] Review your data collection code
2. [ ] Verify you're using OAuth 2.0 (not scraping)
3. [ ] Check that all data comes from official API
4. [ ] Add disclaimer to footer

**Add this disclaimer to your footer:**

```tsx
// src/components/Footer.tsx or similar
<div className="text-xs text-gray-500 text-center py-4">
  Followlytics is not affiliated with, endorsed by, or sponsored by X Corp or Twitter, Inc.
  All trademarks are the property of their respective owners.
</div>
```

**Verify API usage:**
- ✅ OAuth 2.0 for authentication
- ✅ Twitter API v2 for data fetching
- ❌ NO unauthorized scraping or crawling
- ✅ User-authorized data access only

**Reference:** https://developer.twitter.com/en/developer-terms/policy

---

## STEP 3: ANALYTICS SETUP (30 min)

### Option A: PostHog (Recommended)

1. Sign up: https://posthog.com
2. Get project API key
3. Install:
```bash
npm install posthog-js
```

4. Create `src/lib/posthog.ts`:
```typescript
import posthog from 'posthog-js'

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: 'https://app.posthog.com'
  })
}

export { posthog }
```

5. Add to Vercel env: `NEXT_PUBLIC_POSTHOG_KEY=your_key_here`

6. Track activation event:
```typescript
// When user connects X account + views 3 insights
posthog.capture('user_activated', {
  connected_account: true,
  insights_viewed: 3
})
```

### Option B: Google Analytics 4

1. Create GA4 property: https://analytics.google.com
2. Get Measurement ID (G-XXXXXXXXXX)
3. Install:
```bash
npm install @next/third-parties
```

4. Add to `src/app/layout.tsx`:
```typescript
import { GoogleAnalytics } from '@next/third-parties/google'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
      <GoogleAnalytics gaId="G-XXXXXXXXXX" />
    </html>
  )
}
```

5. Track events:
```typescript
window.gtag('event', 'user_activated', {
  connected_account: true,
  insights_viewed: 3
})
```

---

## STEP 4: LANDING PAGE UPDATES (90 min)

### A. Add Disclaimer Footer

Create or update footer component with X disclaimer.

### B. Add Money-Back Guarantee Badge

Update pricing page:
```tsx
<div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 text-sm">
  <span className="text-blue-400">💰</span>
  7-day money-back guarantee
</div>
```

### C. Create Demo Assets

**You need:**
1. **30-second demo GIF** showing:
   - Connect X account (5 sec)
   - View dashboard (10 sec)
   - Track competitor (10 sec)
   - Show AI insights (5 sec)

**How to create:**
- Use Loom or ScreenToGif
- Upload to Imgur or host on Vercel
- Add to landing page hero

2. **3 Proof Elements:**
   - Demo GIF (done above)
   - "Track 15 competitors in real-time" (already in features)
   - "90-day historical data" (already in features)

3. **Testimonial or Founder Guarantee:**

If no testimonials yet, use founder guarantee:
```
"If Followlytics doesn't give you at least 3 actionable insights in 
the first week, I'll refund you personally and send you $20 for your time."
— Joe, Founder
```

---

## STEP 5: SUPPORT SETUP (45 min)

### Option A: Intercom (Paid but powerful)
1. Sign up: https://www.intercom.com
2. Install widget code
3. Set up automated welcome message
4. Create 3 canned responses

### Option B: Crisp (Free tier available)
1. Sign up: https://crisp.chat
2. Install widget:
```tsx
// Add to layout.tsx
<Script id="crisp-widget">
  {`
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = "YOUR_WEBSITE_ID";
    (function() {
      var d = document;
      var s = d.createElement("script");
      s.src = "https://client.crisp.chat/l.js";
      s.async = 1;
      d.getElementsByTagName("head")[0].appendChild(s);
    })();
  `}
</Script>
```

3. Set up FAQs in Crisp dashboard

### Create Basic FAQ Page

Create `src/app/faq/page.tsx`:
```tsx
export default function FAQPage() {
  const faqs = [
    {
      q: "How do I connect my X account?",
      a: "Click 'Connect X Account' in the dashboard. You'll authorize via OAuth. We never see your password."
    },
    {
      q: "What data do you collect?",
      a: "Only data you authorize: public profile, follower stats, tweet metrics. We never access DMs or private info."
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes! Cancel from your dashboard. No questions asked. 7-day money-back guarantee."
    },
    {
      q: "How does competitor tracking work?",
      a: "Add any public X account. We track their posting frequency, engagement rates, and content patterns."
    },
    {
      q: "What if I hit my search limit?",
      a: "Upgrade your plan or wait for the daily reset. Limits prevent abuse and keep the service fast."
    }
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">FAQ</h1>
      {faqs.map((faq, idx) => (
        <div key={idx} className="mb-8">
          <h3 className="text-xl font-semibold mb-2">{faq.q}</h3>
          <p className="text-gray-400">{faq.a}</p>
        </div>
      ))}
    </div>
  )
}
```

---

## STEP 6: LEGAL PAGES (60 min)

### Quick Solution: Use Termly

1. Go to https://termly.io
2. Generate these 3 policies (free tier available):
   - Privacy Policy
   - Terms of Service
   - Refund Policy

3. Create pages:
   - `src/app/privacy/page.tsx`
   - `src/app/terms/page.tsx`
   - `src/app/refunds/page.tsx`

4. Add links to footer:
```tsx
<footer className="border-t border-gray-800 mt-16">
  <div className="max-w-7xl mx-auto px-4 py-8">
    <div className="flex justify-center gap-6 text-sm text-gray-400">
      <Link href="/privacy">Privacy Policy</Link>
      <Link href="/terms">Terms of Service</Link>
      <Link href="/refunds">Refund Policy</Link>
      <Link href="/faq">FAQ</Link>
    </div>
    <div className="text-xs text-gray-500 text-center mt-4">
      Followlytics is not affiliated with, endorsed by, or sponsored by X Corp or Twitter, Inc.
    </div>
  </div>
</footer>
```

### Refund Policy Key Points
- 7-day money-back guarantee
- Email support@followlytics.com for refunds
- Processed within 24-48 hours
- Applies to first purchase only

---

## STEP 7: FOUNDER COUNTDOWN SETUP (30 min)

Already added countdown timer to pricing page! ✅

**To customize the deadline:**

Edit `src/app/pricing/page.tsx`:
```typescript
// Set your actual launch date + 72 hours
const founderEndDate = new Date('2025-01-15T23:59:59') // Adjust date
```

**Or use dynamic (72 hours from deployment):**
```typescript
const founderEndDate = new Date()
founderEndDate.setHours(founderEndDate.getHours() + 72)
```

---

## STEP 8: TEST EVERYTHING (45 min)

### Payment Flow Test
- [ ] Visit /pricing
- [ ] Click "Start Free Trial" on Pro plan
- [ ] Complete Stripe checkout (use test card)
- [ ] Verify redirect back to dashboard
- [ ] Check Stripe webhook fired
- [ ] Verify user tier updated in Firestore

### Founder Lifetime Test
- [ ] Click "Claim Your Spot" on Founder plan
- [ ] Complete one-time payment
- [ ] Verify lifetime access granted
- [ ] Check no subscription created (just payment)

### Analytics Test
- [ ] Complete a signup
- [ ] Connect X account
- [ ] View 3+ insights
- [ ] Check PostHog/GA4 for "user_activated" event

### Support Test
- [ ] Open chat widget
- [ ] Send test message
- [ ] Verify you receive it
- [ ] Reply from dashboard

---

## END OF DAY 1 CHECKLIST

- [ ] Stripe tax collection enabled
- [ ] Annual price IDs created and added to Vercel
- [ ] Test payment successful
- [ ] X disclaimer added to site
- [ ] Analytics installed (PostHog or GA4)
- [ ] Activation event tracking working
- [ ] Demo GIF created and added
- [ ] Money-back guarantee badge visible
- [ ] Support chat installed (Intercom or Crisp)
- [ ] FAQ page created
- [ ] Legal pages added (Privacy, Terms, Refunds)
- [ ] Footer with links and disclaimer
- [ ] Founder countdown live
- [ ] Full payment flow tested
- [ ] No console errors on production

---

## DEPLOYMENT

Once all above is done:

```bash
git add -A
git commit -m "feat: Day 1 launch prep - payments, compliance, analytics"
git push origin main
```

Vercel will auto-deploy.

**Verify deployment:**
1. Visit https://followlytics.vercel.app
2. Test signup flow
3. Test payment flow
4. Check analytics firing
5. Open chat widget

---

## TOMORROW (DAY 2)

Start creating social assets:
- 2 demo clips (15 seconds each)
- 4 before/after visuals
- 4 quote images
- Email sequences
- Comparison sheet
- Affiliate program setup

For now: **Ship Day 1 changes and get some sleep.** 

You're building in public. Progress > Perfection.

---

## QUICK WINS TO CELEBRATE

After today you'll have:
✅ Real payments working
✅ Tax compliant
✅ Legally covered
✅ Analytics tracking
✅ Support ready
✅ Money-back guarantee live
✅ Founder offer countdown active

**That's a launchable product.**

Tomorrow you'll make it sellable. Today you made it real.
