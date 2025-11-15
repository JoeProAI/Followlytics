# Legal Pages Implementation Guide

## Files Created

You now have 6 comprehensive legal documents:

1. ✅ **Terms of Service** - `LEGAL_TERMS_OF_SERVICE.md`
2. ✅ **Privacy Policy** - `LEGAL_PRIVACY_POLICY.md`
3. ✅ **Cookie Policy** - `LEGAL_COOKIE_POLICY.md`
4. ✅ **Legal Disclaimer** - `LEGAL_DISCLAIMER.md`
5. ✅ **Refund Policy** - `LEGAL_REFUND_POLICY.md`
6. ✅ **Acceptable Use Policy** - `LEGAL_ACCEPTABLE_USE_POLICY.md`

---

## Step 1: Customize Placeholders

Replace these placeholders in ALL files:

- `[your-email@followlytics.com]` → Your actual support email
- `[Your Name]` → Your actual name
- `[Your Business Address]` → Your mailing address
- `[Your State/Country]` → Your jurisdiction
- `[DPO email]` → Data protection officer email (if applicable)

**Quick Find & Replace:**
```bash
# Use your editor's find & replace
Find: [your-email@followlytics.com]
Replace: support@followlytics.com
```

---

## Step 2: Create Legal Pages in Next.js

### Create folder structure:
```
src/app/
├── legal/
│   ├── terms/page.tsx
│   ├── privacy/page.tsx
│   ├── cookies/page.tsx
│   ├── disclaimer/page.tsx
│   ├── refunds/page.tsx
│   └── acceptable-use/page.tsx
```

### Example page component:

```tsx
// src/app/legal/terms/page.tsx
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-light mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert prose-lg">
          {/* Paste content from LEGAL_TERMS_OF_SERVICE.md here */}
          {/* Or use MDX to import the markdown directly */}
        </div>
      </div>
    </div>
  )
}
```

---

## Step 3: Add Footer Links

### Update your footer component:

```tsx
// src/components/Footer.tsx
export default function Footer() {
  return (
    <footer className="border-t border-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          
          {/* Legal */}
          <div>
            <h3 className="font-medium mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/legal/terms" className="hover:text-white">Terms of Service</a></li>
              <li><a href="/legal/privacy" className="hover:text-white">Privacy Policy</a></li>
              <li><a href="/legal/cookies" className="hover:text-white">Cookie Policy</a></li>
              <li><a href="/legal/disclaimer" className="hover:text-white">Disclaimer</a></li>
              <li><a href="/legal/refunds" className="hover:text-white">Refund Policy</a></li>
              <li><a href="/legal/acceptable-use" className="hover:text-white">Acceptable Use</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-medium mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/faq" className="hover:text-white">FAQ</a></li>
              <li><a href="mailto:support@followlytics.com" className="hover:text-white">Contact</a></li>
              <li><a href="/docs" className="hover:text-white">Documentation</a></li>
            </ul>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-medium mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/pricing" className="hover:text-white">Pricing</a></li>
              <li><a href="/features" className="hover:text-white">Features</a></li>
              <li><a href="/api" className="hover:text-white">API (Coming Soon)</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-medium mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/about" className="hover:text-white">About</a></li>
              <li><a href="/blog" className="hover:text-white">Blog</a></li>
              <li><a href="https://twitter.com/followlytics" className="hover:text-white">Twitter</a></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-gray-900 mt-12 pt-8 text-sm text-gray-500 text-center">
          <p>© 2024 Followlytics. All rights reserved.</p>
          <p className="mt-2">
            Not affiliated with X Corp (Twitter) or any social media platform.
          </p>
        </div>
      </div>
    </footer>
  )
}
```

---

## Step 4: Add Cookie Banner

### Create cookie consent component:

```tsx
// src/components/CookieBanner.tsx
'use client'

import { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) {
      setShow(true)
    }
  }, [])

  const acceptAll = () => {
    localStorage.setItem('cookie_consent', 'all')
    setShow(false)
  }

  const acceptEssential = () => {
    localStorage.setItem('cookie_consent', 'essential')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 p-4 z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-400">
          We use cookies to improve your experience. 
          <a href="/legal/cookies" className="text-white hover:underline ml-1">
            Learn more
          </a>
        </div>
        <div className="flex gap-3">
          <button
            onClick={acceptEssential}
            className="px-4 py-2 text-sm border border-gray-700 rounded hover:bg-gray-900"
          >
            Essential Only
          </button>
          <button
            onClick={acceptAll}
            className="px-4 py-2 text-sm bg-white text-black rounded hover:bg-gray-200"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Add to root layout:

```tsx
// src/app/layout.tsx
import CookieBanner from '@/components/CookieBanner'
import Footer from '@/components/Footer'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Footer />
        <CookieBanner />
      </body>
    </html>
  )
}
```

---

## Step 5: Add During Checkout

### Before payment:

```tsx
// src/app/export/page.tsx (in your checkout component)
<div className="text-xs text-gray-500 mt-4">
  By proceeding, you agree to our{' '}
  <a href="/legal/terms" target="_blank" className="underline">
    Terms of Service
  </a>
  {', '}
  <a href="/legal/privacy" target="_blank" className="underline">
    Privacy Policy
  </a>
  {', and '}
  <a href="/legal/acceptable-use" target="_blank" className="underline">
    Acceptable Use Policy
  </a>
  .
</div>
```

---

## Step 6: Add to Email Footer

### In your email templates:

```html
<!-- src/lib/email-templates.ts -->
<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999;">
  <p>© 2024 Followlytics. All rights reserved.</p>
  <p>
    <a href="https://followlytics.com/legal/terms">Terms</a> · 
    <a href="https://followlytics.com/legal/privacy">Privacy</a> · 
    <a href="https://followlytics.com/legal/refunds">Refunds</a>
  </p>
  <p>Not affiliated with X Corp (Twitter).</p>
</div>
```

---

## Step 7: Sitemap and Robots.txt

### Add legal pages to sitemap:

```xml
<!-- public/sitemap.xml -->
<url>
  <loc>https://followlytics.com/legal/terms</loc>
  <priority>0.3</priority>
</url>
<url>
  <loc>https://followlytics.com/legal/privacy</loc>
  <priority>0.3</priority>
</url>
<!-- Add others... -->
```

### Allow indexing:

```txt
# public/robots.txt
User-agent: *
Allow: /
Allow: /legal/

Sitemap: https://followlytics.com/sitemap.xml
```

---

## Step 8: GDPR Compliance Checklist

If you have EU users, ensure:

- [ ] Privacy Policy clearly explains data collection
- [ ] Cookie banner with opt-in for non-essential cookies
- [ ] Easy way to request data deletion (contact form)
- [ ] Data processing agreement with Stripe/Firebase/Apify
- [ ] "Data Subject Rights" email (privacy@followlytics.com)
- [ ] Record of processing activities (internal document)
- [ ] Privacy-by-design in your code

---

## Step 9: Add Legal Notice to Homepage

### Hero section disclaimer:

```tsx
// src/app/page.tsx
<div className="text-xs text-gray-600 mt-4">
  We access only publicly available data. Not affiliated with X (Twitter).{' '}
  <a href="/legal/disclaimer" className="underline">
    Read disclaimer
  </a>
</div>
```

---

## Step 10: Create Support Email Aliases

Set up these email addresses:

- `support@followlytics.com` - General support
- `privacy@followlytics.com` - GDPR/CCPA requests
- `legal@followlytics.com` - Legal inquiries
- `abuse@followlytics.com` - AUP violations
- `refunds@followlytics.com` - Refund requests

**Or just forward all to one email initially.**

---

## Quick Launch Checklist

Before going live:

### Must Have:
- [ ] Replace ALL placeholders with real info
- [ ] Add Terms & Privacy links to footer
- [ ] Add checkbox "I agree to Terms" on checkout
- [ ] Cookie banner on first visit
- [ ] Legal disclaimer on homepage
- [ ] Support email set up and monitored

### Nice to Have:
- [ ] All 6 legal pages published
- [ ] Sitemap updated
- [ ] Email templates include legal links
- [ ] FAQ addresses common legal questions

---

## Sample FAQ (Legal Questions)

Add to your FAQ page:

```markdown
### Is this legal?
Yes. We only access publicly available data. Courts have ruled that collecting public data is legal (hiQ v. LinkedIn, 2022).

### Will my account get banned?
No. We don't access your account or require your password. We simply export public data.

### How do you comply with GDPR?
We only process public data. If you use exported data, YOU are the data controller and responsible for GDPR compliance.

### Can I get a refund?
Yes, if the export fails or we can't deliver. See our [Refund Policy](/legal/refunds).

### What can't I use this for?
You cannot use exported data for spam, harassment, or illegal activities. See our [Acceptable Use Policy](/legal/acceptable-use).
```

---

## Testing Before Launch

1. Click every legal page link - make sure they work
2. Read through each page - fix any typos or placeholders
3. Test cookie banner - make sure it saves preferences
4. Test checkout - make sure Terms link is visible
5. Send test email - make sure footer links work

---

## After Launch Monitoring

- **Monitor support email** for legal questions
- **Respond to data requests** within 30 days (GDPR requirement)
- **Update policies** if you add new features
- **Keep records** of when users agreed to terms (Stripe receipts do this)

---

## You're Protected Now ✅

With these legal documents in place, you're covered for:

✅ Terms of Service violations  
✅ Privacy compliance (GDPR, CCPA)  
✅ Cookie usage (GDPR requirement)  
✅ Liability limitations  
✅ Refund disputes  
✅ Abuse and misuse  

**Now you can launch with confidence!** 🚀

---

## Questions?

If you need legal advice specific to your situation, consult a lawyer. These are templates, not legal advice.

**Good luck with your launch!**
