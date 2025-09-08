# Followlytics User Guide

## 🚀 Complete Setup Guide (5 minutes)

### Step 1: Access Your Dashboard
1. Go to **https://followlytics.vercel.app**
2. Click "Sign in with Twitter"
3. Authorize the app with your Twitter account
4. You'll be redirected to your dashboard

### Step 2: Generate API Key
1. In your dashboard, scroll to "API Keys for Browser Extension"
2. Enter a name like "Chrome Extension"
3. Click "Generate Key"
4. **Copy the API key** (format: `flw_xxxxxxxxxxxxxxxxxxxx`)
5. Keep this safe - you'll need it for the extension

### Step 3: Download & Install Extension
1. In your dashboard, click "Download Extension (Free)"
2. Save the `followlytics-extension.zip` file
3. Extract the zip file to a folder (e.g., Desktop)
4. Open Chrome and go to `chrome://extensions/`
5. Turn ON "Developer mode" (toggle in top right)
6. Click "Load unpacked"
7. Select the extracted extension folder
8. Extension appears in your Chrome toolbar

### Step 4: Connect Extension
1. Click the Followlytics extension icon in Chrome
2. Paste your API key from Step 2
3. Click "Connect to Followlytics"
4. Extension shows "Ready to Scan!"

### Step 5: Scan Followers
1. Go to any Twitter profile (twitter.com or x.com)
2. Click the "Followers" tab on their profile
3. Click the Followlytics extension icon
4. Click "Start Follower Scan"
5. Extension automatically scrolls and collects followers
6. Progress shows in real-time
7. Data appears in your dashboard when complete

## 📊 Using Your Dashboard

### Follower Analytics
- **Total Followers**: Current follower count
- **Unfollowers**: People who unfollowed you
- **Growth Rate**: Weekly growth percentage
- **Engagement**: Average engagement rate

### Export Data
- Click "Export CSV" to download follower data
- Includes usernames, display names, bios, profile links
- Perfect for analysis in Excel or Google Sheets

### Multiple Scans
- Scan different accounts by visiting their followers page
- Each scan is stored separately in your dashboard
- Compare follower lists between accounts

## 🔧 Troubleshooting

### Extension Issues
**"Invalid API key"**
- Make sure API key starts with `flw_`
- Generate a new key if needed
- Check for extra spaces when pasting

**"No followers found"**
- Make sure you're on a followers page (URL contains `/followers`)
- Try refreshing the page and scanning again
- Some accounts may have no followers

**Extension not working**
- Refresh the Twitter page
- Make sure you're logged into Twitter
- Try disabling other extensions temporarily

### Scanning Issues
**Scan stops early**
- This is normal - Twitter limits how many followers load
- Extension gets as many as possible (usually 200-2000)
- For complete lists, try multiple scans over time

**Slow scanning**
- Extension uses delays to avoid being blocked
- Typical speed: 100-200 followers per minute
- Large accounts may take 10-30 minutes

### Dashboard Issues
**Data not appearing**
- Wait a few seconds after scan completes
- Refresh your dashboard page
- Check that scan completed successfully in extension

**Can't generate API key**
- Make sure you're logged into your dashboard
- Try refreshing the page
- Contact support if issue persists

## 🛡️ Privacy & Security

### What We Access
- Extension only works on Twitter pages
- No passwords or credentials stored
- Uses your existing Twitter login session

### Data Storage
- Follower data stored securely in Firebase
- Encrypted in transit and at rest
- Only you can access your data

### API Keys
- Generated uniquely for each user
- Can be deleted/regenerated anytime
- Used only for authentication

## 💡 Pro Tips

### Best Practices
- Scan followers during off-peak hours
- Don't scan too frequently (once per day max)
- Keep extension updated for best performance

### Getting More Data
- Scan multiple times to get different followers
- Twitter rotates which followers show first
- Combine multiple scans for more complete data

### Analysis Ideas
- Export to Excel for advanced analysis
- Track follower growth over time
- Compare followers between similar accounts
- Identify mutual followers

## 📞 Support

### Common Questions
**Q: Is this legal?**
A: Yes, extension uses your own Twitter session and only accesses public data

**Q: Will Twitter ban my account?**
A: No, extension behaves like normal browsing with human-like delays

**Q: How much does it cost?**
A: Extension is free, dashboard has free and premium tiers

**Q: Can I scan private accounts?**
A: Only if you follow them and can see their followers page

### Getting Help
- Check this guide first
- Email: support@followlytics.com
- Include your API key (first 8 characters only)
- Describe the exact issue and steps to reproduce

## 🔄 Updates

### Extension Updates
- Download new version from dashboard when available
- Remove old extension and install new one
- API key remains the same

### New Features
- Check dashboard for announcements
- Follow @followlytics on Twitter for updates
- Suggest features via support email

---

**Ready to start tracking your Twitter followers? Follow the setup guide above and you'll be scanning in minutes!**
