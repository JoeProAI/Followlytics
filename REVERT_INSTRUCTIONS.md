# 🚨 EMERGENCY REVERT INSTRUCTIONS

**If Codex, Claude, or other AI breaks something, use this guide to restore the working state.**

---

## 🎯 QUICK REVERT (Recommended)

### Option 1: Revert to Tagged Stable Version
```bash
# Navigate to project
cd "c:\Projects\The Machine\Followlytics"

# Revert to stable checkpoint
git checkout stable-oct27-2025

# Create new branch from stable state
git checkout -b recovery-branch

# Test everything works
npm install
npm run dev

# If all good, merge back to main
git checkout main
git reset --hard stable-oct27-2025
git push origin main --force
```

---

## 🔄 DETAILED REVERT OPTIONS

### Option 2: Revert to Specific Commit
```bash
# Find the stable commit
git log --oneline | head -20
# Look for: 366899d - CHECKPOINT: Stable state before AI collaboration

# Revert to that commit
git reset --hard 366899d

# Force push (ONLY if you're sure)
git push origin main --force
```

### Option 3: Cherry-Pick Good Changes
```bash
# If some changes are good, keep them
git log --oneline

# Cherry-pick specific good commits
git cherry-pick <good-commit-hash>
git cherry-pick <another-good-commit-hash>

# Push
git push origin main
```

### Option 4: Restore Specific Files Only
```bash
# If only some files are broken, restore from stable checkpoint
git checkout stable-oct27-2025 -- src/components/dashboard/ApifyFollowerExtractor.tsx
git checkout stable-oct27-2025 -- src/app/api/apify/extract-followers/route.ts
git checkout stable-oct27-2025 -- src/app/api/followers/stored/route.ts

# Commit the restored files
git commit -m "Restore broken files from stable checkpoint"
git push origin main
```

---

## 🧪 TEST AFTER REVERT

### Critical Tests
```bash
# 1. Install dependencies
npm install

# 2. Run dev server
npm run dev

# 3. Open browser
# http://localhost:3000

# 4. Test these features:
✓ Login works
✓ Extract 100 followers
✓ Followers display in UI
✓ Logout and login - followers still there
✓ CSV export works
✓ AI post generator works
```

---

## 📋 STABLE STATE REFERENCE

### Commit Information
- **Commit Hash:** `366899d`
- **Tag:** `stable-oct27-2025`
- **Date:** October 27, 2025
- **Status:** ✅ All core features working

### What Was Working
- ✅ Follower extraction (Apify)
- ✅ Data persistence (Firestore)
- ✅ Historical tracking (new/unfollowed)
- ✅ Individual follower selection
- ✅ CSV export
- ✅ Analytics dashboard (backend)
- ✅ AI post generator (Daytona)

### Critical Files (As of Stable Checkpoint)
```
src/components/dashboard/ApifyFollowerExtractor.tsx
src/app/api/apify/extract-followers/route.ts
src/app/api/followers/stored/route.ts
src/app/api/analytics/followers/route.ts
src/app/dashboard/page.tsx
src/lib/firebase-admin.ts
```

---

## 🔍 DIAGNOSE BEFORE REVERT

### Check What Changed
```bash
# See what files were modified
git status

# See recent commits
git log --oneline -10

# Compare to stable state
git diff stable-oct27-2025

# See specific file changes
git diff stable-oct27-2025 -- src/components/dashboard/ApifyFollowerExtractor.tsx
```

### Common Issues & Quick Fixes

**Issue: "Cannot find module"**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Issue: "Firebase Admin SDK error"**
```bash
# Check Vercel environment variables
# Go to: https://vercel.com/dashboard
# Project → Settings → Environment Variables
# Verify all Firebase vars exist
```

**Issue: "API route returns 500"**
```bash
# Check Vercel logs
# Go to: https://vercel.com/dashboard
# Project → Deployments → Latest → Functions
# Look for error messages
```

---

## 🚨 NUCLEAR OPTION (Last Resort)

### Complete Reset to Stable State
```bash
# WARNING: This deletes ALL changes after stable checkpoint

# 1. Backup current state (just in case)
git branch backup-$(date +%Y%m%d-%H%M%S)

# 2. Hard reset to stable
git reset --hard stable-oct27-2025

# 3. Force push to GitHub
git push origin main --force

# 4. Clean everything
rm -rf node_modules .next
npm install

# 5. Redeploy in Vercel
# Go to Vercel Dashboard → Redeploy

# 6. Test everything
npm run dev
```

---

## ✅ VERIFICATION CHECKLIST

After reverting, verify these work:

- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts server
- [ ] Login page loads
- [ ] User can sign up/login
- [ ] Dashboard loads
- [ ] Extract followers works (test with 100)
- [ ] Followers display in UI
- [ ] Logout and login - data persists
- [ ] CSV export downloads file
- [ ] AI post generator creates variations
- [ ] No console errors
- [ ] No 500 API errors

---

## 📞 IF REVERT FAILS

1. **Check GitHub:** https://github.com/JoeProAI/Followlytics
   - Verify tag `stable-oct27-2025` exists
   - Verify commit `366899d` exists

2. **Check Vercel:** https://vercel.com/dashboard
   - Find deployment from Oct 27, 2025
   - Click "Redeploy" on that deployment

3. **Environment Variables:**
   - Verify all env vars in Vercel
   - See CHECKPOINT_OCT_27_2025.md for complete list

4. **Firebase:**
   - Check Firebase Console
   - Verify project still exists
   - Verify Firestore rules haven't changed

---

## 💡 PREVENTION FOR NEXT TIME

Before making major changes:

```bash
# Create a feature branch
git checkout -b feature/new-thing

# Make changes in branch
# Test thoroughly
# Only merge to main when confirmed working

# If it breaks, just delete the branch
git checkout main
git branch -D feature/new-thing
```

---

## 🎯 QUICK REFERENCE

**Stable Commit:** `366899d`  
**Stable Tag:** `stable-oct27-2025`  
**Revert Command:** `git reset --hard stable-oct27-2025`  
**Checkpoint Doc:** See `CHECKPOINT_OCT_27_2025.md`

**YOU ARE SAFE. YOU CAN ALWAYS REVERT.** ✅
