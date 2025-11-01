# Quick Fix Plan

## Issues Identified:

### 1. ❌ Enrichment Too Slow
**Problem:** Enrichment runs separately and takes too long  
**Solution:** Modify main extraction to use actor that ALREADY includes verified status

### 2. ❌ "All Followers Showing as New"
**Problem:** Analytics incorrectly marks all followers as new  
**Cause:** Likely related to timing - analytics using too recent cutoff date  
**Solution:** Fix analytics logic to properly exclude initial batch

## Implementation:

### Fix 1: Switch to Fast Actor with Verified Status

Current actor: `premium-x-follower-scraper-following-data`
- ❌ Fast but NO verified status
- ❌ Requires separate enrichment step

New actor: `premium-twitter-user-scraper-pay-per-result`  
- ✅ Same speed (40 profiles/second)
- ✅ Includes verified status natively
- ✅ Same pricing ($0.15/1K)
- ✅ One-step extraction with all data

### Fix 2: Analytics First Extraction Detection

Update `/api/analytics/followers` to:
- Better detect first extraction
- Exclude all followers from "new" count on first run
- Use longer lookback period (30 days not 7)

## Benefits:

✅ **10x faster** - No separate enrichment needed  
✅ **Simpler** - One extraction gets everything  
✅ **Same cost** - $0.15 per 1,000 followers  
✅ **Accurate analytics** - Fixed "all new followers" bug
