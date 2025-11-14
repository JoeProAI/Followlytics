# Email Setup Instructions

## ✅ STEP 1: Add DNS Records (REQUIRED)

You need to add these DNS records to your domain registrar (where you bought `joepro.ai`):

### Domain Verification (DKIM)
```
Type: TXT
Name: resend._domainkey.followlytics.joepro.ai
Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCswuABGav7LyrIkXWvXh3evLhOLn7hlLZexAmCHthKE+MMm7EuehDTGb1IveZZeKCEzL8+KErOH3nSGYchaUrNecTjcOaURWuSSDPs3DlpBIISO5EBc4VKOB4yXnNnxJLnp52JV1uv393RheRUBNt/Yf0YO4jeGBleHSnv5ROPvQIDAQAB
TTL: Auto
```

### Enable Sending (SPF & DMARC)
```
Type: MX
Name: send.followlytics.joepro.ai
Value: feedback-smtp.us-east-1.amazonses.com
TTL: Auto
Priority: 10
```

```
Type: TXT
Name: send.followlytics.joepro.ai
Value: v=spf1 include:amazonses.com ~all
TTL: Auto
```

```
Type: TXT
Name: _dmarc.followlytics.joepro.ai
Value: v=DMARC1; p=none;
TTL: Auto
```

### Enable Receiving (Optional - if you want to receive emails)
```
Type: MX
Name: followlytics.joepro.ai
Value: inbound-smtp.us-east-1.amazonaws.com
TTL: Auto
Priority: 10
```

---

## ⏰ STEP 2: Wait for Verification (15 min - 24 hours)

After adding DNS records:
1. DNS propagation can take 15 minutes to 24 hours
2. Check status in Resend dashboard: https://resend.com/domains
3. Look for green checkmarks next to each DNS record

---

## 🧪 STEP 3: Test Email

Once verified, test with this command:

```bash
curl -X POST https://followlytics-zeta.vercel.app/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{"to":"joe@joepro.ai"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Test email sent successfully!",
  "emailId": "xxx-xxx-xxx"
}
```

---

## 🎯 Current Configuration

**Email Sender:** `notifications@followlytics.joepro.ai`

**Used in:**
- Follower analysis complete notifications
- Gamma presentation ready notifications
- All automated emails

---

## 🔍 Troubleshooting

### If emails still don't work after DNS verification:

1. **Check Resend Dashboard Logs:**
   - Go to: https://resend.com/logs
   - Look for error messages

2. **Verify RESEND_API_KEY in Vercel:**
   - Go to Vercel → Followlytics → Settings → Environment Variables
   - Confirm `RESEND_API_KEY` is set

3. **Check DNS with dig:**
   ```bash
   dig TXT resend._domainkey.followlytics.joepro.ai
   ```

4. **Test with curl:**
   ```bash
   # Should return success
   curl -X POST https://followlytics-zeta.vercel.app/api/test/send-email \
     -H "Content-Type: application/json" \
     -d '{"to":"your-email@example.com"}'
   ```

---

## 📧 What Happens After Setup

Once DNS is verified and propagated:

1. ✅ Users receive email when follower analysis completes
2. ✅ Users receive email when Gamma presentation is ready
3. ✅ All emails come from `notifications@followlytics.joepro.ai`
4. ✅ Emails land in inbox (not spam) with proper SPF/DKIM
