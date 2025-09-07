# Followlytics Browser Extension

## Super Easy Installation Guide

### Step 1: Download Extension Files
1. Download all files from the `browser-extension` folder
2. Create a new folder on your desktop called `followlytics-extension`
3. Copy all files into this folder

### Step 2: Install in Chrome
1. Open Chrome browser
2. Go to `chrome://extensions/`
3. Turn ON "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select your `followlytics-extension` folder
6. Extension will appear in your extensions list

### Step 3: Get Your API Key
1. Go to [Followlytics Dashboard](https://followlytics.vercel.app/dashboard)
2. Click on "Settings" or "API Keys"
3. Generate a new API key (format: `flw_xxxxxxxxxxxxxxxxxxxx`)
4. Copy the API key

### Step 4: Connect Extension
1. Click the Followlytics extension icon in Chrome toolbar
2. Paste your API key in the setup screen
3. Click "Connect to Followlytics"
4. Extension is now ready to use!

### Step 5: Scan Followers
1. Go to any Twitter profile (twitter.com or x.com)
2. Click "Followers" to open their followers page
3. Click the Followlytics extension icon
4. Click "Start Follower Scan"
5. Extension will automatically scroll and collect all followers
6. Data is sent directly to your Followlytics dashboard

## Features
- ✅ One-click follower scanning
- ✅ Uses your own Twitter session (no login required)
- ✅ Automatic scrolling and data collection
- ✅ Real-time progress tracking
- ✅ Direct upload to Followlytics dashboard
- ✅ Works on both twitter.com and x.com

## Troubleshooting
- **"Invalid API key"**: Make sure your API key starts with `flw_`
- **"No followers found"**: Make sure you're on a followers page (URL contains `/followers`)
- **Scan stops early**: This is normal - Twitter limits how many followers load at once
- **Extension not working**: Try refreshing the page and scanning again

## Privacy & Security
- Extension only accesses Twitter pages
- No passwords or credentials stored
- Uses secure API connection to Followlytics
- All data encrypted in transit
