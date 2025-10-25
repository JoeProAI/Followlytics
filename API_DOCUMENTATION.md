# Followlytics Public API Documentation

## 🔌 Follower Extraction API

### Endpoint
```
POST /api/public/extract-followers
```

### Authentication
Include your API key in the request header:
```
X-API-Key: your_api_key_here
```

### Request Body
```json
{
  "username": "elonmusk",
  "maxFollowers": 1000
}
```

**Parameters:**
- `username` (required): Twitter/X username (without @)
- `maxFollowers` (optional): Maximum followers to extract (default: 1000, min: 200)

### Response - Success (200)
```json
{
  "success": true,
  "data": [
    {
      "username": "joepro",
      "name": "Joe Pro",
      "bio": "Building cool stuff",
      "followers_count": 5420,
      "following_count": 892,
      "verified": false,
      "location": "San Francisco, CA"
    }
    // ... more followers
  ],
  "metadata": {
    "username": "elonmusk",
    "count": 785,
    "cost": "0.1570",
    "runId": "abc123xyz"
  }
}
```

### Response - Error (401)
```json
{
  "error": "Invalid or inactive API key"
}
```

### Response - Error (429)
```json
{
  "error": "Daily API limit exceeded (100 requests/day)",
  "limit": 100,
  "used": 100
}
```

### Pricing
- **$0.20 per 1,000 followers extracted**
- Minimum 200 followers per request
- Examples:
  - 200 followers = $0.04
  - 1,000 followers = $0.20
  - 10,000 followers = $2.00
  - 100,000 followers = $20.00

### Rate Limits
- **100 requests per day** per API key
- No limit on total followers extracted
- Requests reset at midnight UTC

---

## 📊 Check API Key Status

### Endpoint
```
GET /api/public/extract-followers
```

### Authentication
```
X-API-Key: your_api_key_here
```

### Response (200)
```json
{
  "active": true,
  "created": "2025-10-25T12:00:00.000Z",
  "usage_today": {
    "requests": 15,
    "followers_extracted": 12500,
    "revenue": "2.5000"
  },
  "limits": {
    "daily_requests": 100,
    "remaining": 85
  }
}
```

---

## 🔑 Getting an API Key

### Enterprise Plan Required
API access is only available on the **Enterprise plan ($199/month)**.

### To get your API key:
1. Upgrade to Enterprise: https://followlytics-zeta.vercel.app/pricing
2. Go to Dashboard → Settings → API Keys
3. Click "Generate New API Key"
4. Copy and securely store your key

**Security:**
- Never share your API key publicly
- Never commit API keys to git repositories
- Rotate keys regularly
- Each key is unique and tied to your account

---

## 📝 Example Usage

### cURL
```bash
curl -X POST https://followlytics-zeta.vercel.app/api/public/extract-followers \
  -H "X-API-Key: flw_sk_live_abc123xyz789" \
  -H "Content-Type: application/json" \
  -d '{"username": "JoeProAI", "maxFollowers": 1000}'
```

### JavaScript/Node.js
```javascript
const response = await fetch('https://followlytics-zeta.vercel.app/api/public/extract-followers', {
  method: 'POST',
  headers: {
    'X-API-Key': 'flw_sk_live_abc123xyz789',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'JoeProAI',
    maxFollowers: 1000
  })
});

const data = await response.json();
console.log(`Extracted ${data.metadata.count} followers`);
console.log(`Cost: $${data.metadata.cost}`);
```

### Python
```python
import requests

url = 'https://followlytics-zeta.vercel.app/api/public/extract-followers'
headers = {
    'X-API-Key': 'flw_sk_live_abc123xyz789',
    'Content-Type': 'application/json'
}
data = {
    'username': 'JoeProAI',
    'maxFollowers': 1000
}

response = requests.post(url, headers=headers, json=data)
result = response.json()

print(f"Extracted {result['metadata']['count']} followers")
print(f"Cost: ${result['metadata']['cost']}")
```

---

## ⚡ Performance

### Extraction Speed
- **<1K followers:** 30-60 seconds
- **1K-10K followers:** 1-3 minutes
- **10K-100K followers:** 3-10 minutes
- **100K+ followers:** 10-30 minutes

### Timeout
- Maximum request duration: **5 minutes (300 seconds)**
- For large accounts (>50K followers), consider splitting into multiple requests

---

## 🛡️ Error Handling

### Common Error Codes
| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Invalid API key | Check your API key is correct and active |
| 400 | Bad request | Ensure username is provided and valid |
| 429 | Rate limit exceeded | Wait until tomorrow or upgrade plan |
| 500 | Server error | Contact support with the error details |
| 503 | Service unavailable | Temporary issue, try again in a few minutes |

### Best Practices
1. **Always check response status codes**
2. **Implement exponential backoff** for 429/503 errors
3. **Store extracted data** - don't re-extract unnecessarily
4. **Monitor your usage** with GET endpoint
5. **Handle timeouts gracefully** for large extractions

---

## 💼 Commercial Use Cases

### 1. B2B Lead Generation SaaS
Extract followers of industry leaders, enrich with contact data, sell leads.
**Revenue potential:** $99-499/month subscriptions

### 2. Social Media Analytics Platform
Add follower intelligence to existing Twitter analytics dashboard.
**Revenue potential:** $49-199/month add-on feature

### 3. Marketing Agency Service
Offer "competitor follower analysis" as consulting service.
**Revenue potential:** $500-5,000 per project

### 4. Data Broker/Enrichment
Sell follower datasets to researchers, marketers, sales teams.
**Revenue potential:** $0.50-2.00 per 1K records

### 5. White-Label Integration
Integrate follower extraction into existing B2B platform.
**Revenue potential:** Unlimited - depends on your customer base

---

## 📈 Usage Examples by Industry

### Marketing Agencies
```javascript
// Find influencers following a brand
const response = await extractFollowers('nike', 50000);
const influencers = response.data.filter(f => f.followers_count > 10000);
// Reach out to influencers for brand partnerships
```

### Sales Teams
```javascript
// Find decision-makers following competitors
const response = await extractFollowers('salesforce', 10000);
const decisionMakers = response.data.filter(f => 
  f.bio.includes('CEO') || f.bio.includes('VP') || f.bio.includes('Director')
);
// Export to CRM for outreach
```

### Researchers
```javascript
// Study audience demographics
const response = await extractFollowers('elonmusk', 100000);
const locations = {};
response.data.forEach(f => {
  locations[f.location] = (locations[f.location] || 0) + 1;
});
// Analyze geographic distribution
```

### Content Creators
```javascript
// Analyze your own followers
const response = await extractFollowers('myusername', 5000);
const verifiedCount = response.data.filter(f => f.verified).length;
const avgFollowers = response.data.reduce((sum, f) => sum + f.followers_count, 0) / response.data.length;
// Understand your audience quality
```

---

## 🚀 Webhooks (Coming Soon)

Subscribe to events:
- `extraction.completed` - When follower extraction finishes
- `extraction.failed` - When extraction fails
- `limit.reached` - When approaching daily limit

---

## 📞 Support

### Need help?
- **Email:** support@followlytics.com
- **Discord:** [Join our community](#)
- **Documentation:** https://docs.followlytics.com

### Enterprise Support
Enterprise customers get:
- Priority email support (< 4 hour response time)
- Dedicated Slack channel
- Custom feature development
- Higher rate limits (on request)

---

## 🔐 Security & Compliance

### Data Privacy
- We don't store extracted follower data permanently
- All data is deleted after 7 days
- We comply with GDPR, CCPA
- SOC 2 Type II certified (coming Q2 2025)

### API Key Security
- Keys are encrypted at rest
- Transmitted only over HTTPS
- Support for IP whitelisting (Enterprise)
- Automatic rotation available (Enterprise)

---

## 💰 Pricing Calculator

Estimate your monthly costs:

| Followers Extracted | Cost per Extraction | 30 Extractions/Month | Total Monthly Cost |
|---------------------|---------------------|----------------------|--------------------|
| 1,000 | $0.20 | 30 | $6.00 |
| 10,000 | $2.00 | 30 | $60.00 |
| 50,000 | $10.00 | 30 | $300.00 |
| 100,000 | $20.00 | 30 | $600.00 |

**Plus Enterprise plan:** $199/month

**Total example:** 30 × 10K extractions = $259/month (vs Twitter's $42,000/month API)

---

## 🎯 ROI Calculator

### Scenario: B2B Lead Gen SaaS

**Your costs:**
- Enterprise plan: $199/month
- Extract 100K followers: $20
- Total: $219/month

**Your revenue:**
- Charge customers $99/month
- 10 customers = $990/month
- **Profit: $771/month**

**ROI: 352%**

---

## 🆕 Changelog

### v1.0.0 (October 25, 2025)
- 🎉 Initial public API release
- ✅ Follower extraction endpoint
- ✅ API key authentication
- ✅ Usage tracking
- ✅ Rate limiting
- ✅ 100 requests/day limit

### Coming Soon
- 📊 Batch extraction endpoint
- 🔔 Webhook support
- 📈 Historical data access
- 🎯 Advanced filtering options
- 🌍 Multiple region support

---

**Ready to start?** Get your API key at [https://followlytics-zeta.vercel.app/pricing](https://followlytics-zeta.vercel.app/pricing)
