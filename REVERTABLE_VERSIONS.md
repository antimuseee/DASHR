# Revertable Versions - Trench Runner

This document lists all saved revertable versions of the game. Each branch represents a working state you can revert to.

---

## 📋 Current Version

**Branch:** `main`  
**Commit:** `b9316ac` - "Optimize performance: cache device info and remove unused code"  
**Status:** ✅ Active

**Description:** Current production version with performance optimizations - cached device info to eliminate hundreds of function calls per second.

---

## 🔄 Available Revertable Versions

### 1. **performance-optimization-cached-device** ⭐ (Just Saved)
**Branch:** `performance-optimization-cached-device`  
**Commit:** `b9316ac`  
**Date:** December 25, 2025

**What it contains:**
- Cached device info in MainScene and Spawner (eliminates 600+ getDevice() calls/sec)
- Removed unused `isLowPerformance` code from updateTradingChart
- Clean chart update frequency (0.2s normal, 0.05s for spikes)
- All 4 neon signs with glow animations restored
- Performance optimizations without changing gameplay

**When to use:** If you want to revert to this performance-optimized version.

**How to revert:**
```bash
git checkout performance-optimization-cached-device
```

---

### 2. **mobile-one-time-verification**
**Branch:** `mobile-one-time-verification`  
**Commit:** `7fffd48`  
**Date:** December 25, 2025

**What it contains:**
- One-time Phantom wallet verification for mobile
- Tier caching (24 hours) - no need to reconnect
- "Tier Verified" banner with copy link to switch to regular browser
- Tier badge shows even without active wallet connection (from cache)
- Mobile users verify in Phantom, then play in Safari/Chrome for better performance

**When to use:** If you want to revert to this mobile wallet verification approach.

**How to revert:**
```bash
git checkout mobile-one-time-verification
```

---

### 3. **phantom-optimization-attempts**
**Branch:** `phantom-optimization-attempts`  
**Commit:** `7f3a1fd` - "Document all Phantom optimization attempts"  
**Date:** December 25, 2025

**What it contains:**
- All Phantom/WebView performance optimization attempts
- WebView detection system
- Visual-only optimizations (reduced particles, no animations)
- **REVERTED:** Gameplay-affecting changes (spawn rates, speed, etc.)
- Complete documentation in `PHANTOM_OPTIMIZATION_NOTES.md`

**When to use:** If you want to reference or experiment with the optimization attempts that were tried and reverted.

**How to revert:**
```bash
git checkout phantom-optimization-attempts
```

**Note:** This branch contains code that was reverted from main because it affected competitive fairness.

---

### 4. **Stable Base (Before Optimizations)**
**Tag:** `v-mobile-stat-boxes-fixed`  
**Commit:** `b2bcf9f` - "Fix mobile stat boxes to stay fixed size"  
**Date:** December 25, 2025

**What it contains:**
- Stable version before any Phantom optimization attempts
- Mobile stat box fixes
- Share to X button
- All core game features working
- No WebView detection or mobile wallet optimizations

**When to use:** If you want to go back to the clean slate before all mobile wallet work.

**How to revert:**
```bash
git checkout v-mobile-stat-boxes-fixed
# Or create a branch from it:
git checkout -b restore-stable v-mobile-stat-boxes-fixed
```

---

## 📊 Version Timeline

```
Current (main)
  ↓
b9316ac - Performance optimization: cached device info
  ↓
33e5162 - Restore WalletUI.tsx to stable version
  ↓
0ae5d62 - Trigger Vercel deployment
  ↓
b2bcf9f - Stable base (v-mobile-stat-boxes-fixed tag)
  ↓
[Earlier commits...]

mobile-one-time-verification branch (diverged)
  ↓
7fffd48 - One-time Phantom verification
  ↓
[Multiple mobile wallet attempts...]
  ↓
b2bcf9f - Stable base (shared)

phantom-optimization-attempts branch (diverged)
  ↓
7f3a1fd - Documentation
  ↓
4b2bedc - Fix chart bug and restore fairness
  ↓
3834ad0 - Remove FPS caps
  ↓
ee91c43 - WebView optimizations
  ↓
b2bcf9f - Stable base (shared)
```

---

## 🔧 How to Use These Versions

### View a version:
```bash
git checkout <branch-name>
```

### Create a new branch from a version:
```bash
git checkout -b new-experiment <branch-name>
```

### Compare versions:
```bash
# See what changed between main and a branch
git diff main..performance-optimization-cached-device

# See commits in a branch
git log main..performance-optimization-cached-device
```

### Merge a version back:
```bash
git checkout main
git merge <branch-name>
```

### Delete a branch (if no longer needed):
```bash
git branch -d <branch-name>  # Local
git push origin --delete <branch-name>  # Remote
```

---

## 📝 Notes

- All branches are pushed to GitHub, so they're safe even if local repo is lost
- The `main` branch is always the current production version
- Branches are meant for experimentation and safe rollback points
- Tags are permanent markers for important milestones

---

**Last Updated:** December 25, 2025
