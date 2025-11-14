# 🧹 Clean Start Guide

## Starting Fresh with Clean, Sanitized Data

Your database currently has old data with unsanitized usernames like `__Firefly__` that cause Firestore errors. Let's clean everything and start fresh!

## 🚀 Quick Clean Start

### **Step 1: Run the Cleanup Script**

```bash
# Install dependencies (if needed)
npm install

# Run the database cleaner
npx tsx scripts/clean-database.ts
```

**What it does:**
- ✅ Deletes all followers from `users/{userId}/followers`
- ✅ Deletes all exports from `users/{userId}/follower_exports`  
- ✅ Cleans tracked accounts
- ✅ Clears legacy `follower_database`
- ✅ Clears `follower_cache`
- ✅ Fresh slate for clean data!

### **Step 2: Wait for Vercel Deployment**

Check: https://vercel.com/joeproais-projects/followlytics/deployments

Latest commit should be: **`73ce00e` - Clean data at source**

Status should be: **✅ Ready**

### **Step 3: Fresh Extraction**

1. Go to your dashboard
2. Enter username: `joeproai`
3. Click "Extract Followers"
4. Wait ~20 seconds

**This extraction will have:**
- ✅ Sanitized usernames (`Firefly` not `__Firefly__`)
- ✅ Clean data everywhere
- ✅ No Firestore errors
- ✅ Original usernames preserved in `_originalUsername` field

### **Step 4: Test Export**

1. Go to `/export` page
2. Enter `joeproai`
3. Should see: "Account eligible! 801 followers found"
4. Pay → Should be **instant** (2-4 seconds to write subcollection)
5. Download → Should work perfectly!

## 🎯 What's Different Now

### **Before (Old System):**
```
Extraction → Unsanitized usernames → Firebase errors
__Firefly__ → Firestore rejects → Export fails ❌
```

### **After (New System):**
```
Extraction → Sanitized usernames → Clean storage
__Firefly__ → Firefly → Everything works ✅
```

## 📊 Expected Behavior

### **Dashboard Extraction:**
```
[Extraction] Extracting followers for @joeproai
[Extraction] Actor run started: abc123
[Extraction] Extracted 801 followers
[Extraction] Processed 801 followers, 45 are VERIFIED (5%)
[Extraction] Saved 801 followers to Firestore
```

**No more `[Apify]` logs!** All say `[Extraction]` now.

### **Export After Payment:**
```
[Export] Checking for existing followers for @joeproai
[Export] Found 801 stored followers, using existing data
[Export] Export ready instantly with 801 followers in subcollection
```

**Takes ~2-4 seconds** to write 801 docs to subcollection (normal Firestore behavior).

### **Download:**
```
[Download] Retrieved 801 followers from user export
```

**Instant!** Data is already in subcollection.

## 🗄️ Database Structure After Clean Start

```
users/
  {userId}/
    followers/                    # Clean usernames as doc IDs
      elonmusk                   # ✅ Clean
      Firefly                    # ✅ Sanitized from __Firefly__
      tech_dev                   # ✅ Sanitized from tech.dev
      ...
    follower_exports/
      {exportId}/
        (metadata)
        followers/                # Subcollection (scales infinitely)
          elonmusk               # ✅ Same clean usernames
          Firefly                # ✅ Consistent everywhere
          ...
```

## ⚙️ Cleanup Script Details

**Location:** `scripts/clean-database.ts`

**What it cleans:**
1. `users/{userId}/followers` - All follower documents
2. `users/{userId}/follower_exports` - All export records + subcollections
3. `users/{userId}/tracked_accounts` - Tracking metadata
4. `follower_database` - Legacy storage (if any)
5. `follower_cache` - Temporary cache

**What it preserves:**
- ✅ User accounts
- ✅ Subscriptions
- ✅ Payment history
- ✅ All non-follower data

## 🔍 Verify Clean State

After running cleanup script:

**Firebase Console:**
https://console.firebase.google.com/project/followlytics-cd4e1/firestore

Navigate to: `users/{your-uid}/followers`

**Should be:** Empty or not exist

## 🎉 Expected Results

After clean start:
- ✅ No `__Firefly__` errors
- ✅ All usernames sanitized
- ✅ Firestore saves work
- ✅ Exports complete in 2-4 seconds
- ✅ Downloads work instantly
- ✅ Database is queryable and scalable

## 🆘 If Something Goes Wrong

### **Error: "Resource id is invalid"**
- Old data still in Firebase
- Run cleanup script again
- Check Vercel deployment is live

### **Error: "No followers data available"**
- Database is clean but no fresh extraction yet
- Extract followers on dashboard first

### **Export still takes long**
- Check Vercel logs for `[Export] Found X stored followers`
- If says "No stored data found" - re-extract on dashboard

## 📝 Summary

**DO THIS:**
1. ✅ Run `npx tsx scripts/clean-database.ts`
2. ✅ Wait for Vercel deployment
3. ✅ Extract fresh data on dashboard
4. ✅ Test export flow

**DON'T DO THIS:**
- ❌ Don't try to export before fresh extraction
- ❌ Don't use old cached data
- ❌ Don't manually edit Firebase (script does it)

---

**Ready to start fresh?** Run that cleanup script! 🚀
