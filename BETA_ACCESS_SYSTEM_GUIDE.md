# Beta Access System - Implementation Guide

**Purpose:** Give select users 100% free access to all paid features

**Tech Stack:** Firebase/Firestore + Stripe + Next.js

---

## Table of Contents

1. [Database Structure](#database-structure)
2. [Granting Beta Access](#granting-beta-access)
3. [Backend Integration](#backend-integration)
4. [Stripe Integration](#stripe-integration)
5. [Frontend Display](#frontend-display)
6. [Security Rules](#security-rules)

---

## Database Structure

### Firestore Collection: `users/{userId}`

```javascript
{
  "email": "user@example.com",
  "displayName": "John Doe",
  "tier": "free",  // free, starter, pro, enterprise
  "subscriptionStatus": "active",
  
  // BETA ACCESS - Main flag
  "betaAccess": true,  // Boolean - set to true for beta users
  
  // Optional tracking fields
  "betaGrantedAt": "2025-01-10T08:00:00Z",
  "betaGrantedBy": "admin@yourcompany.com",
  "betaReason": "seed_investor",  // Why they have access
  "betaNotes": "Granted lifetime access"
}
```

---

## Granting Beta Access

### Method 1: Firebase Console (Manual)

1. Go to **Firebase Console → Firestore Database**
2. Navigate to `users` collection
3. Find user by email/ID
4. Click "Edit"
5. Add field: `betaAccess` (boolean) = `true`
6. Save

### Method 2: Admin API

Create `/api/admin/grant-beta/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || []

export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin
    const authHeader = request.headers.get('authorization')
    const token = authHeader!.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    if (!ADMIN_EMAILS.includes(decodedToken.email || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Get target user email
    const { userEmail, reason } = await request.json()

    // 3. Find user
    const usersSnapshot = await adminDb
      .collection('users')
      .where('email', '==', userEmail)
      .limit(1)
      .get()

    if (usersSnapshot.empty) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = usersSnapshot.docs[0].id

    // 4. Grant beta access
    await adminDb.collection('users').doc(userId).update({
      betaAccess: true,
      betaGrantedAt: new Date().toISOString(),
      betaGrantedBy: decodedToken.email,
      betaReason: reason || 'manual_grant'
    })

    return NextResponse.json({
      success: true,
      message: `Beta access granted to ${userEmail}`
    })

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to grant beta',
      details: error.message 
    }, { status: 500 })
  }
}
```

**Usage:**
```bash
curl -X POST https://yourapp.com/api/admin/grant-beta \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userEmail": "user@example.com", "reason": "investor"}'
```

---

## Backend Integration

### Helper Function: `src/lib/checkAccess.ts`

```typescript
import { adminDb } from '@/lib/firebase-admin'

export async function checkUserAccess(
  userId: string,
  requiredTier: 'free' | 'starter' | 'pro' | 'enterprise' = 'free'
) {
  const userDoc = await adminDb.collection('users').doc(userId).get()
  const userData = userDoc.data()!
  
  const isBetaUser = userData.betaAccess === true
  const userTier = userData.tier || 'free'
  const isActive = userData.subscriptionStatus === 'active'
  
  const tierLevels = { free: 0, starter: 1, pro: 2, enterprise: 3 }
  const hasRequiredTier = tierLevels[userTier] >= tierLevels[requiredTier]
  
  return {
    hasAccess: isBetaUser || (isActive && hasRequiredTier),
    isBetaUser,
    tier: userTier
  }
}
```

### Use in API Routes

```typescript
// /api/premium-feature/route.ts
import { checkUserAccess } from '@/lib/checkAccess'

export async function POST(request: NextRequest) {
  // Verify token
  const token = request.headers.get('authorization')!.split('Bearer ')[1]
  const decodedToken = await adminAuth.verifyIdToken(token)
  
  // Check access (beta OR pro+ subscriber)
  const access = await checkUserAccess(decodedToken.uid, 'pro')
  
  if (!access.hasAccess) {
    return NextResponse.json({ 
      error: 'Pro subscription or beta access required'
    }, { status: 403 })
  }

  // Access granted - continue
  // ...
}
```

---

## Stripe Integration

### 1. Create 100% Coupon in Stripe

Go to **Stripe Dashboard → Coupons → + New**:
- Name: `Beta Access 100% Off`
- ID: `YOUR_BETA_COUPON_ID` (e.g., BETA100, BETAACCESS, etc.)
- Type: Percentage
- Percentage off: `100`
- Duration: `Forever`

Add to environment variables:
```
STRIPE_BETA_COUPON_ID=YOUR_BETA_COUPON_ID
```

### 2. Apply Coupon at Checkout

```typescript
// /api/stripe/create-checkout/route.ts
export async function POST(request: NextRequest) {
  // ... authentication ...

  // Check beta access
  const userDoc = await adminDb.collection('users').doc(userId).get()
  const hasBetaAccess = userDoc.data()?.betaAccess === true

  // Create checkout config
  const checkoutConfig: any = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { userId, betaUser: hasBetaAccess ? 'true' : 'false' }
  }

  // Apply 100% discount for beta users
  if (hasBetaAccess) {
    checkoutConfig.discounts = [{
      coupon: process.env.STRIPE_BETA_COUPON_ID
    }]
  }

  const session = await stripe.checkout.sessions.create(checkoutConfig)
  return NextResponse.json({ url: session.url })
}
```

---

## Frontend Display

### Show Beta Badge

```typescript
// Dashboard header
'use client'
import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function Dashboard() {
  const { user } = useAuth()
  const [isBeta, setIsBeta] = useState(false)

  useEffect(() => {
    async function checkBeta() {
      if (!user) return
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      setIsBeta(userDoc.data()?.betaAccess === true)
    }
    checkBeta()
  }, [user])

  return (
    <header>
      <h1>Dashboard</h1>
      {isBeta && (
        <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs">
          ✨ BETA ACCESS
        </div>
      )}
    </header>
  )
}
```

### Custom Pricing Page for Beta Users

```typescript
// /pricing/page.tsx
export default function Pricing() {
  const [isBeta, setIsBeta] = useState(false)

  // Check beta status...

  if (isBeta) {
    return (
      <div className="text-center">
        <div className="bg-purple-500 text-white px-4 py-2 rounded-full mb-4">
          ✨ BETA ACCESS ACTIVE
        </div>
        <h1>You Have Full Access</h1>
        <p>As a beta user, all features are free!</p>
        <button onClick={() => router.push('/dashboard')}>
          Go to Dashboard
        </button>
      </div>
    )
  }

  return (
    // Normal pricing cards...
  )
}
```

---

## Security Rules

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can read their own doc
      allow read: if request.auth.uid == userId;
      
      // Users can create on signup
      allow create: if request.auth.uid == userId;
      
      // Users CANNOT modify betaAccess field
      allow update: if request.auth.uid == userId
        && !request.resource.data.diff(resource.data).affectedKeys().hasAny([
          'betaAccess',
          'betaGrantedAt',
          'betaGrantedBy'
        ]);
    }
  }
}
```

**Key Protection:** Users can't grant themselves beta access. Only Admin SDK (server-side) can modify beta fields.

---

## Environment Variables

```bash
# Admin emails (comma-separated)
ADMIN_EMAILS=your-admin-email@example.com,another-admin@example.com

# Stripe beta coupon (use the ID you created in Stripe)
STRIPE_BETA_COUPON_ID=YOUR_COUPON_ID_HERE

# Firebase Admin (for server-side)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

---

## Testing Checklist

- [ ] Grant beta via Firebase Console → `betaAccess: true`
- [ ] Grant beta via API endpoint (admin only)
- [ ] Beta badge shows in dashboard
- [ ] Checkout applies 100% discount
- [ ] Beta user can access premium features
- [ ] Non-admin can't grant beta (security)
- [ ] Revoking beta removes access

---

## Summary

**Key Files:**
1. `users/{userId}` - Firestore user document with `betaAccess` flag
2. `/api/admin/grant-beta` - Admin endpoint to grant access
3. `src/lib/checkAccess.ts` - Helper to check beta/paid status
4. `/api/stripe/create-checkout` - Apply 100% coupon

**How It Works:**
1. Admin sets `betaAccess: true` in Firestore
2. API routes check: `betaAccess === true` OR `paid subscriber`
3. Checkout applies `BETA100` coupon (100% off)
4. Frontend shows beta badge

**No credentials needed!** This is a reusable pattern for any app.

---

**Last Updated:** 2025-10-05  
**License:** MIT (use freely in any project)
