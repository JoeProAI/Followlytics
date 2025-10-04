# Beta Access System - User Guide

## Overview

The beta access system allows you to give users **100% discount** on subscriptions, making Followlytics completely free for beta testers while keeping the Stripe payment system fully functional.

---

## How It Works

1. **Beta users** have a `betaAccess: true` flag in their Firestore user document
2. When they subscribe, a **100% discount coupon** is automatically applied
3. They get a **$0.00 subscription** in Stripe (free!)
4. All premium features unlock normally
5. Webhooks fire and everything works as if they paid

---

## Setup (One-Time)

### Step 1: Create 100% Coupon in Stripe

1. Go to: **https://dashboard.stripe.com/coupons**
2. Click **"+ New"**
3. Fill in:
   ```
   Name: Beta Access 100% Off
   ID: BETA100 (exactly this!)
   Type: Percentage
   Percentage off: 100
   Duration: Forever
   ```
4. Click **"Create coupon"**

### Step 2: Add Admin Email to Vercel

Go to: **Vercel → Followlytics → Settings → Environment Variables**

Add:
```
Name: ADMIN_EMAILS
Value: your-email@example.com
Environments: Production, Preview, Development
```

(You can add multiple emails separated by commas: `admin1@gmail.com,admin2@gmail.com`)

### Step 3: Add Beta Coupon ID to Vercel

```
Name: STRIPE_BETA_COUPON_ID
Value: BETA100
Environments: Production, Preview, Development
```

### Step 4: Redeploy

```bash
git add -A
git commit -m "feat: add beta access system with 100% discount"
git push origin main
```

---

## Grant Beta Access to Users

### Method 1: Direct Firestore Update (Easiest)

1. Go to: **Firebase Console → Firestore**
2. Navigate to: `users` collection → `{userId}` document
3. Add field:
   ```
   Field: betaAccess
   Type: boolean
   Value: true
   ```
4. Click **"Update"**

Done! User now has beta access.

### Method 2: API Endpoint (Programmatic)

```bash
curl -X POST https://followlytics-zeta.vercel.app/api/admin/beta-access \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"userId": "TARGET_USER_ID", "betaAccess": true}'
```

**To get your admin token:**
1. Login to Followlytics as admin
2. Open browser console
3. Run: `firebase.auth().currentUser.getIdToken().then(t => console.log(t))`
4. Copy the token

### Method 3: Helper Script

```bash
# Grant beta access
ts-node scripts/grant-beta-access.ts YOUR_TOKEN USER_ID true

# Revoke beta access
ts-node scripts/grant-beta-access.ts YOUR_TOKEN USER_ID false
```

---

## User Experience

### For Beta Users:

1. User goes to `/pricing`
2. Clicks "Start Free Trial" on any plan
3. Redirects to Stripe checkout
4. **Sees $0.00 total** (100% discount applied automatically!)
5. Enters credit card (Stripe requires it, but won't charge)
6. Completes checkout
7. Gets full premium access

### For Regular Users:

1. Goes to `/pricing`
2. Clicks "Start Free Trial"
3. Redirects to Stripe checkout
4. **Sees normal price** ($29, $79, or $199)
5. Enters credit card
6. Gets charged normally
7. Gets premium access

---

## Check Beta Access Status

### Via API:

```bash
# Check your own beta access
curl https://followlytics-zeta.vercel.app/api/admin/beta-access \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check another user's beta access
curl "https://followlytics-zeta.vercel.app/api/admin/beta-access?userId=USER_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Via Firestore:

1. Firebase Console → Firestore
2. Navigate to `users/{userId}`
3. Look for `betaAccess: true` field

---

## Revoke Beta Access

### Method 1: Firestore

1. Firebase Console → Firestore → `users/{userId}`
2. Delete the `betaAccess` field (or set to `false`)

### Method 2: API

```bash
curl -X POST https://followlytics-zeta.vercel.app/api/admin/beta-access \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"userId": "TARGET_USER_ID", "betaAccess": false}'
```

---

## Give Yourself Beta Access

### Quick Method (Firestore):

1. Login to Followlytics
2. Get your user ID from browser console:
   ```javascript
   firebase.auth().currentUser.uid
   ```
3. Go to Firebase Console → Firestore → `users/{your-user-id}`
4. Add field: `betaAccess: true`
5. Go to `/pricing` and subscribe to any plan
6. You'll see $0.00 total! ✅

---

## FAQ

### Q: Will beta users be charged?
**A:** No! The 100% coupon makes it completely free ($0.00).

### Q: Do beta users need to enter a credit card?
**A:** Yes, Stripe requires it for subscriptions, but they won't be charged.

### Q: Can I revoke beta access later?
**A:** Yes! Just set `betaAccess: false` in Firestore or use the API.

### Q: What happens if I revoke beta access?
**A:** Their existing subscription continues at $0.00. New subscriptions will charge normally.

### Q: Can I see who has beta access?
**A:** Yes, check Firestore `users` collection for `betaAccess: true` field.

### Q: Does this work in test mode and live mode?
**A:** Yes! Just create the `BETA100` coupon in both modes.

---

## Security Notes

- ✅ Only admins (in `ADMIN_EMAILS`) can grant/revoke beta access
- ✅ Beta status is stored in Firestore (server-side, can't be faked)
- ✅ Checkout verifies beta status on the server
- ✅ Users can't grant themselves beta access via client code

---

## Monitoring

### Stripe Dashboard

Beta subscriptions will show:
- **Amount**: $0.00
- **Discount**: 100% off (BETA100)
- **Status**: Active
- **Metadata**: `betaUser: true`

### Firestore

All users with `betaAccess: true` in `users` collection.

---

## Quick Reference

**Grant beta access:**
```
Firebase → Firestore → users/{userId} → Add betaAccess: true
```

**Create coupon:**
```
Stripe → Coupons → ID: BETA100, 100% off, Forever
```

**Check subscription:**
```
Stripe → Subscriptions → Look for $0.00 amount
```

---

## Troubleshooting

### Error: "No such coupon: BETA100"
- Create the coupon in Stripe Dashboard (see Step 1)
- Make sure ID is exactly `BETA100`

### Error: "Unauthorized - Admin access required"
- Add your email to `ADMIN_EMAILS` in Vercel
- Redeploy the app

### User not getting discount
- Verify `betaAccess: true` exists in Firestore
- Check Firebase Console → Firestore → `users/{userId}`

### Stripe showing full price
- Beta flag might not be set
- Coupon might not exist in Stripe
- Check Vercel logs for errors

---

## Example Flow

```
1. You: Add betaAccess: true to user nLhtKGD9fQhpFFwWmCl5wAY0yZe2
2. User: Goes to /pricing
3. User: Clicks "Start Free Trial" on Pro ($79/mo)
4. System: Detects betaAccess: true
5. System: Applies BETA100 coupon (100% off)
6. Stripe: Shows checkout for $0.00
7. User: Enters card (required by Stripe)
8. User: Completes checkout
9. Webhook: Fires, grants Pro access
10. User: Gets full Pro features for free! 🎉
```

---

You're all set! Grant beta access to testers and they'll get free subscriptions while you test the full payment flow. 🚀
