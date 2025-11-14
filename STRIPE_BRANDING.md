# 🎨 Stripe Checkout Branding Customization

## Issue
By default, Stripe Checkout shows your business name (from your Stripe account) at the top of the checkout page. This can be customized or hidden.

## Solution Options

### Option 1: Change Stripe Account Business Name (Recommended)

The name shown at the top comes from your **Stripe account settings**, not the code.

**Steps to change it:**

1. Go to https://dashboard.stripe.com/settings/public
2. Under **Business settings** → **Public details**
3. Change **Business name** to whatever you want shown:
   - "Followlytics" (clean product name)
   - Your company name
   - Or leave blank to minimize branding

4. Upload a **logo** (optional but recommended):
   - 512x512 pixels minimum
   - PNG or JPG format
   - Square aspect ratio
   - This replaces the business name with your logo

**Result:**
- Checkout shows your chosen name/logo
- Change reflects across ALL Stripe checkouts
- Professional appearance

### Option 2: Use Custom Branding Settings (Already Implemented)

The code now includes `custom_text` to customize the checkout experience:

```typescript
custom_text: {
  submit: {
    message: 'Secure checkout powered by Stripe'
  }
}
```

This adds custom messaging but doesn't remove the business name at top.

### Option 3: Hide Business Name Completely

Unfortunately, Stripe **requires** either a business name or logo at the top for trust/security. You cannot completely remove it.

**Best approach:**
1. Set a clean business name in Stripe dashboard
2. Upload a professional logo
3. Logo will replace the text name

## Current Implementation

### Subscription Checkout (`/api/stripe/create-checkout`)
```typescript
✅ custom_text added - Shows "Secure checkout powered by Stripe"
✅ ui_mode: 'hosted' - Standard Stripe hosted page
✅ Business name from Stripe dashboard will show at top
```

### Export Checkout (`/api/export/create-checkout`)
```typescript
✅ custom_text already configured
✅ Shows "Get instant access to your follower data after payment"
✅ Business name from Stripe dashboard will show at top
```

## Recommended Setup

### 1. Update Stripe Business Profile

Go to: https://dashboard.stripe.com/settings/public

```
Business name: Followlytics
Business website: https://followlytics-zeta.vercel.app
Support email: your-support-email@domain.com
```

### 2. Upload Brand Logo (Optional)

- **Logo dimensions:** 512x512px minimum
- **Format:** PNG with transparent background
- **Design:** Clean, professional logo
- **Upload at:** https://dashboard.stripe.com/settings/branding

**Result:** Logo replaces text business name at checkout top

### 3. Customize Brand Colors

In Stripe Dashboard → Settings → Branding:

```
Primary color: #8B5CF6 (purple - matches your site)
Background color: #000000 (black - matches dark theme)
Font: Match your site font if possible
```

### 4. Enable Payment Method Icons

Shows credit card logos for trust:
- ✅ Enable in Stripe dashboard → Branding settings
- Shows Visa, Mastercard, Amex logos
- Increases conversion

## Testing Changes

After updating Stripe settings:

1. Go to `/pricing` page
2. Click "Subscribe" on any plan
3. Check checkout page appearance
4. Verify business name/logo shows as expected

**Note:** Changes to Stripe branding are immediate, no deployment needed!

## Advanced: Custom Checkout Page (Future)

If you want FULL control over checkout appearance, you can use:

**Stripe Embedded Checkout:**
- Build checkout directly into your site
- Complete UI control
- More complex implementation

**Steps:**
1. Use `ui_mode: 'embedded'` instead of `'hosted'`
2. Build checkout UI in your app
3. Handle Stripe Elements manually
4. More customization, more complexity

**Not recommended unless you need extreme customization.**

## FAQ

### Q: Can I remove my name entirely from checkout?
**A:** No, Stripe requires business identification for security/trust. Use a logo instead of text name.

### Q: Why does my personal name show instead of business name?
**A:** You're using a personal Stripe account. Switch to business account or change the "Business name" field in settings.

### Q: Can I use different names for different products?
**A:** No, the business name is account-wide. Use product descriptions to differentiate.

### Q: How do I add my brand colors?
**A:** Stripe Dashboard → Settings → Branding → Theme colors

### Q: Can I embed checkout in my site?
**A:** Yes, use `ui_mode: 'embedded'` but requires significant additional code. Current hosted checkout is recommended.

## Current Status

✅ **Code Updated:**
- Added `custom_text` to both checkout endpoints
- Shows custom messaging at checkout
- Business name still shows at top (by Stripe design)

⚠️ **Action Required:**
- Update Stripe Dashboard business name to "Followlytics" or preferred name
- Upload logo to replace text name (optional but recommended)
- Set brand colors to match site theme

## Screenshots Guide

**Where to customize:**
1. Stripe Dashboard: https://dashboard.stripe.com/settings/public
2. Look for "Public business information"
3. Update "Business name" field
4. Upload "Icon" (shows at checkout top)
5. Save changes

**Takes effect immediately** - no code deployment needed!

## Summary

✅ **Code changes deployed** - custom text added
⏳ **Stripe Dashboard changes needed** - update business name/logo
🎨 **Recommended:** Upload a clean logo to replace text name
💰 **Impact:** More professional checkout → Higher conversions
