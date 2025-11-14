# 🔍 Follower Discrepancy Tracking

## Overview

The system now clearly shows the difference between **stored/cached followers** and **newly extracted followers**, making account changes (unfollows, new follows) immediately apparent.

## How It Works

### **Step 1: Initial Load (Cached Data)**

When you open the dashboard, the system loads your **stored followers** from the database:

```
📦 Showing 1,234 Cached Followers from @elonmusk
```

**This count represents:**
- The last extraction you ran
- Followers stored in your Firestore database
- **NOT live data** - it's a snapshot from your previous extraction

### **Step 2: New Extraction (Fresh Data)**

When you click "Extract Followers" again:

```
✨ Fresh Extraction Complete: 1,250 followers
```

**This count represents:**
- **LIVE data** directly from X/Twitter right now
- The actual current follower count
- Includes any changes since last extraction

### **Step 3: Discrepancy Detection**

The system automatically compares:
- **Stored Count**: 1,234 (cached from previous extraction)
- **New Count**: 1,250 (fresh from live extraction)
- **Difference**: +16 followers

## ⚠️ Discrepancy Alert Card

When discrepancies are detected, you see a prominent yellow alert:

```
⚠️ Follower Changes Detected

Comparing 1,234 stored followers vs 1,250 newly extracted

┌─────────────────────────┬─────────────────────────┐
│ 📉 Unfollowed/Deleted   │ 📈 New Followers        │
│ 8 accounts no longer    │ 24 new accounts         │
│ following               │ following               │
│                         │                         │
│ → @user1                │ → @newuser1             │
│ → @user2                │ → @newuser2             │
│ → @user3                │ → @newuser3             │
│ ...and 5 more           │ ...and 21 more          │
└─────────────────────────┴─────────────────────────┘

Net Change: +16 followers
```

## 📊 What Each Section Means

### **Unfollowed/Deleted** (Red Section)
- Accounts that were in your stored data
- But NOT found in the new extraction
- Likely unfollowed you or deleted their account

### **New Followers** (Green Section)
- Accounts that were NOT in your stored data
- But ARE found in the new extraction
- New people who followed you since last check

### **Net Change**
- **Green (+)**: You gained followers overall
- **Red (-)**: You lost followers overall
- **Gray (0)**: No net change (same gains/losses)

## 🎯 Use Cases

### **Track Follower Growth**
Run extraction daily/weekly to see:
- Who unfollowed you
- Who newly followed you
- Net follower change over time

### **Identify Account Issues**
High unfollows might indicate:
- Deleted/suspended accounts
- Content not resonating
- Bot purges by X

### **Monitor Campaigns**
After posting content:
- Extract before posting
- Extract after 24 hours
- See exactly who followed from that post

## 💡 Pro Tips

### **Baseline Extraction**
Run your first extraction to establish a baseline:
```
1. Extract followers (e.g., 1,000 followers)
2. This is now your "stored" baseline
3. Wait some time (day/week)
4. Extract again
5. See exact changes
```

### **Regular Monitoring**
For active tracking:
```
Monday: Extract → 1,234 followers (baseline)
Friday: Extract → 1,250 followers
→ See: +24 new, -8 unfollowed, Net: +16
```

### **Campaign Attribution**
Before/after specific posts:
```
Before tweet: Extract → 1,000 followers
Post viral tweet
After 24h: Extract → 1,050 followers
→ See exactly which 50 accounts followed
```

## 🔧 Technical Details

### **Comparison Logic**

```typescript
// Stored followers from last extraction
const storedFollowers = ['user1', 'user2', 'user3', ...]

// New followers from current extraction
const newFollowers = ['user2', 'user3', 'newuser1', ...]

// Detect unfollowed
const unfollowed = storedFollowers.filter(u => !newFollowers.includes(u))
// Result: ['user1'] - was stored but not in new

// Detect new
const newlyFollowed = newFollowers.filter(u => !storedFollowers.includes(u))
// Result: ['newuser1'] - in new but not in stored
```

### **Data Storage**

**Stored Followers:**
- Location: `users/{userId}/followers` collection
- Filter: `status == 'active'`
- Updated: After each successful extraction
- Used as: Baseline for next comparison

**Discrepancy Data:**
- Calculated: On-the-fly during extraction
- Stored: In component state (temporary)
- Displayed: In yellow alert card
- Reset: On next extraction

## 📝 Display Format

### **Cached Data Badge**
```
📦 Cached Data
```
- Shows when viewing stored followers
- Indicates data is from previous extraction
- Not live/current data

### **Fresh Extraction Badge**
```
✨ Fresh Extraction
```
- Shows after new extraction completes
- Indicates data is live from X right now
- Just pulled from X API

### **Usernames Display**
- Shows first 10 unfollowed accounts
- Shows first 10 new follower accounts
- "...and X more" for overflow
- Allows quick scan of changes

## 🚨 Important Notes

### **Accuracy**
- Discrepancy detection is **exact** - compares username lists
- No fuzzy matching - accounts must match perfectly
- Case-insensitive comparison (user1 = USER1)

### **Limitations**
- Only compares up to extraction limit (e.g., 200 followers)
- If you extract 200 but have 10K followers, only sees changes in that sample
- Full accuracy requires extracting ALL followers

### **Cost**
- Discrepancy detection is **free** - just compares stored vs new data
- Only pay for the new extraction itself
- No extra AI or processing costs

## 🎉 Benefits

✅ **Clear visibility** into follower changes
✅ **Immediate awareness** of unfollows
✅ **Attribution** for new followers
✅ **No manual tracking** required
✅ **Visual comparison** with color coding
✅ **Detailed breakdown** with usernames
✅ **Net change** calculation automatic

## 📈 Future Enhancements

Coming soon:
- Export discrepancy data to CSV
- Historical tracking over time
- Charts showing follower trends
- Notifications for large changes
- Separate sheet for unfollowed accounts
