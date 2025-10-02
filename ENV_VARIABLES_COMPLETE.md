# 🔐 Complete Environment Variables for Followlytics

## Copy ALL of these to Vercel Environment Variables
**Location:** https://vercel.com/joepro-ais-projects/followlytics/settings/environment-variables

**Set each to:** Production, Preview, Development

---

## 🔥 Firebase (Required)
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
```

**Where to get:**
1. Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Copy values from downloaded JSON file

---

## 🐦 X/Twitter API (Required for Analytics)

### **OAuth 1.0a** (Main authentication - REQUIRED)
```env
X_API_KEY=your-api-key-here
X_API_SECRET=your-api-secret-here
X_ACCESS_TOKEN=1767231492793434113-HmH8Cd8u4707mpwsHSNRTuJYrUJdhw
X_ACCESS_TOKEN_SECRET=jDtJecqhS6P2nTKuuIoLIYONtliirK8cmM1PaGKsiSOl1
X_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAM7f4AEAAAAAUgCCL1mqxpt6QJ6KavJUQWew8P8%3DU29VkcKOjSF0s7UgGYajQQG3V1P9EJzRY8x6ZWI1u5LCC5H5nu
```

### **OAuth 2.0** (Optional - for future features)
```env
X_CLIENT_ID=your-client-id
X_CLIENT_SECRET=your-client-secret
```

**Where to get:**
- Twitter Developer Portal: https://developer.twitter.com/en/portal/dashboard
- Your App → Keys and tokens

---

## 💳 Stripe (Required for Payments)

### **Live Keys** (Production)
```env
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### **Test Keys** (Development - Optional)
```env
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**Where to get:**
- Stripe Dashboard: https://dashboard.stripe.com/apikeys
- Webhook secret: Developers → Webhooks → Add endpoint

---

## 🤖 AI Services (Required for AI Features)

### **OpenAI** (GPT-4 for content analysis)
```env
OPENAI_API_KEY=sk-proj-xxxxx
```

**Where to get:**
- OpenAI Platform: https://platform.openai.com/api-keys

### **XAI** (Grok for competitive intelligence - Enterprise tier only)
```env
XAI_API_KEY=xai-xxxxx
```

**Where to get:**
- X.AI Console: https://console.x.ai/

---

## 🔒 Security & Cron

### **Cron Secret** (Protect cron endpoints)
```env
CRON_SECRET=your-random-secret-key-min-32-chars
```

**Generate with:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### **Stripe Setup Secret** (One-time setup protection)
```env
STRIPE_SETUP_SECRET=xscope_setup_2025_secure_key_do_not_share
```

---

## 🌐 App Configuration

### **Public App URL**
```env
NEXT_PUBLIC_APP_URL=https://followlytics-zeta.vercel.app
```

### **NextAuth Configuration** (if using NextAuth)
```env
NEXTAUTH_URL=https://followlytics-zeta.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-here
```

**Generate NextAuth secret:**
```bash
openssl rand -base64 32
```

---

## 🚀 Daytona (Optional - for browser automation)
```env
DAYTONA_API_KEY=your-daytona-api-key
DAYTONA_API_URL=https://api.daytona.io
```

**Where to get:**
- Daytona Console: https://www.daytona.io/

---

## 📋 Quick Copy Format (for .env.local)

```env
# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# X/Twitter API
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=
X_BEARER_TOKEN=
X_CLIENT_ID=
X_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# AI Services
OPENAI_API_KEY=
XAI_API_KEY=

# Security
CRON_SECRET=
STRIPE_SETUP_SECRET=

# App Config
NEXT_PUBLIC_APP_URL=https://followlytics-zeta.vercel.app
NEXTAUTH_URL=https://followlytics-zeta.vercel.app
NEXTAUTH_SECRET=

# Daytona (Optional)
DAYTONA_API_KEY=
DAYTONA_API_URL=
```

---

## ✅ Priority Order (What to set first)

### **CRITICAL (App won't work without these):**
1. ✅ FIREBASE_PROJECT_ID
2. ✅ FIREBASE_CLIENT_EMAIL
3. ✅ FIREBASE_PRIVATE_KEY
4. ✅ X_BEARER_TOKEN
5. ✅ X_ACCESS_TOKEN
6. ✅ X_ACCESS_TOKEN_SECRET
7. ✅ NEXT_PUBLIC_APP_URL

### **HIGH (Monetization & AI):**
8. ✅ STRIPE_SECRET_KEY
9. ✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
10. ✅ OPENAI_API_KEY
11. ✅ CRON_SECRET

### **MEDIUM (Enhanced features):**
12. XAI_API_KEY (only for Enterprise tier)
13. STRIPE_WEBHOOK_SECRET (for webhook handling)
14. X_API_KEY (for OAuth 1.0a)
15. X_API_SECRET (for OAuth 1.0a)

### **LOW (Optional features):**
16. X_CLIENT_ID (OAuth 2.0 - not currently used)
17. X_CLIENT_SECRET (OAuth 2.0 - not currently used)
18. DAYTONA_API_KEY (browser automation - optional)
19. NEXTAUTH_SECRET (if using NextAuth)

---

## 🔍 How to Verify in Vercel

1. Go to: https://vercel.com/joepro-ais-projects/followlytics/settings/environment-variables
2. Check that ALL critical variables are present
3. Each should be set for: ✅ Production ✅ Preview ✅ Development
4. After adding/updating, click **Redeploy** in Deployments tab

---

## 🚨 Common Issues

### **"X_BEARER_TOKEN is required"**
- Missing or invalid X_BEARER_TOKEN
- Get from Twitter Developer Portal → Your App → Keys and tokens

### **"Failed to initialize Firebase Admin"**
- FIREBASE_PRIVATE_KEY not properly formatted
- Must include `\n` characters for line breaks
- Wrap entire key in double quotes in Vercel

### **"Stripe not configured"**
- Missing STRIPE_SECRET_KEY or NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- Get from Stripe Dashboard → Developers → API keys

### **"AI generation failed"**
- Missing OPENAI_API_KEY
- Invalid or expired API key
- Check OpenAI account has credits

---

## 📊 What Each Service Costs

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| **Firebase** | Spark (Free) | $0 |
| **X API** | Pro | $200 |
| **Stripe** | Standard | 2.9% + $0.30 per transaction |
| **OpenAI** | Pay-as-you-go | ~$1-10 (depends on usage) |
| **XAI (Grok)** | API Access | ~$5-20 (depends on usage) |
| **Vercel** | Pro | $20 |
| **Daytona** | Optional | Varies |
| **TOTAL** | | **~$220-250/month** |

---

## ✨ After Setting All Variables

1. ✅ Go to Vercel Deployments
2. ✅ Click "Redeploy" on latest deployment
3. ✅ Wait 2-3 minutes
4. ✅ Test dashboard features
5. ✅ Verify X OAuth connection works
6. ✅ Test Overview tab with any username
7. ✅ Try AI tweet generator

---

**All variables set? Redeploy and you're live!** 🚀
