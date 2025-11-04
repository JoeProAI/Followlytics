# 🎨 Gamma Integration Setup

## Overview
Followlytics integrates with Gamma AI to generate beautiful, shareable visual reports for follower analysis.

## What Gamma Does
- Creates stunning visual presentations from analysis data
- Automatically selects matching themes based on follower category
- Generates shareable links for reports
- Professional charts and visualizations

## Theme Selection (Automatic)

Gamma automatically picks themes based on follower characteristics:

| Follower Type | Priority | Theme |
|--------------|----------|-------|
| Tech/Engineer | HIGH | `aurora` (bold, modern) |
| Tech/Engineer | MEDIUM/LOW | `midnight` (dark, professional) |
| Business/Entrepreneur | Any | `corporate` (professional) |
| Creator/Influencer | Any | `vibrant` (colorful, creative) |
| Media/Journalist | Any | `modern` (clean, editorial) |
| Other | HIGH | `aurora` |
| Other | MEDIUM | `modern` |
| Other | LOW | `minimal` |

## Setup Instructions

### 1. Get Gamma API Key

1. Go to [https://gamma.app](https://gamma.app)
2. Sign up or log in
3. Navigate to Settings → API
4. Generate a new API key
5. Copy the key (starts with `gamma_`)

### 2. Add to Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add new variable:
   - **Name:** `GAMMA_API_KEY`
   - **Value:** Your Gamma API key
   - **Environments:** Production, Preview, Development

4. Click **Save**

### 3. Redeploy

1. Go to **Deployments** tab
2. Click **Redeploy** on latest deployment
3. Or push a new commit to trigger deployment

### 4. Test Gamma Generation

1. Go to your dashboard → **🎨 AI Analysis & Gamma Reports**
2. Select an analysis
3. Click **🎨 Generate Gamma** on any follower card
4. Wait 5-10 seconds
5. Click **🎨 View Gamma Report →** when ready
6. Share the beautiful link!

## Without API Key (Simulation Mode)

If you haven't added `GAMMA_API_KEY` yet:
- Gamma generation will still work
- It will create a simulated/demo link
- The link won't have actual Gamma content
- Add API key to enable real generation

## Gamma Report Features

### Individual Follower Reports Include:
- ✅ Follower name and username
- ✅ Influence score (0-10)
- ✅ Category classification
- ✅ Priority level
- ✅ Engagement metrics
- ✅ Strategic value explanation
- ✅ Recommended actions
- ✅ Matching theme selection
- ✅ Shareable public link

### Aggregate Reports Include:
- ✅ Overall analysis summary
- ✅ Audience composition
- ✅ Influence patterns
- ✅ Engagement insights
- ✅ Key recommendations
- ✅ Professional presentation format

## API Endpoint

Gamma API URL: `https://api.gamma.app/api/v1/generate`

Request format:
```json
{
  "text": "# Report Title\n## Content...",
  "theme": "aurora",
  "title": "Report Name"
}
```

Response includes:
- `url` or `share_url`: Shareable Gamma link
- `id`: Gamma document ID

## Troubleshooting

### "Gamma API not configured" error
- Add `GAMMA_API_KEY` to Vercel environment variables
- Redeploy after adding the key

### Generation takes too long
- Normal: 5-30 seconds for generation
- Check Gamma.app dashboard for status
- Polls every 10 seconds, max 30 attempts

### Theme doesn't match
- Themes are auto-selected based on category
- Tech → aurora/midnight
- Business → corporate
- Creator → vibrant
- Media → modern

## Support

For Gamma API issues:
- Gamma Support: https://gamma.app/support
- API Docs: https://gamma.app/docs/api

For Followlytics integration:
- Check environment variables in Vercel
- Verify API key is active
- Check browser console for errors
