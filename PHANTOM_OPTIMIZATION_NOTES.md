# Phantom/WebView Optimization Attempts - Documentation

**Branch:** `phantom-optimization-attempts`  
**Date:** December 25, 2025  
**Status:** Reverted - kept only visual optimizations for competitive fairness

---

## Problem Statement

Phantom wallet's in-app browser (WebView) has significantly lower performance than native browsers. Users reported the game running slower after initial optimization attempts. The challenge was to improve performance without creating competitive disadvantages for mobile users competing on leaderboards.

---

## Optimization Attempts Made

### ✅ **KEPT - Visual-Only Optimizations** (No gameplay impact)

These optimizations were kept because they reduce visual load without affecting scoring potential:

#### 1. **Device Detection** (`src/utils/device.ts`)
- **Added:** WebView detection for Phantom, MetaMask, Trust Wallet, Coinbase Wallet, and other in-app browsers
- **Detection methods:**
  - User agent pattern matching (`wv`, `webview`, `phantom`, `metamask`, etc.)
  - iOS WebView detection (missing Safari version string)
  - Wallet provider injection detection (`window.solana`, `window.phantom`)
- **Result:** `isLowPerformance` flag correctly identifies WebView environments
- **Status:** ✅ Active - used for visual optimizations only

#### 2. **Reduced Particle Effects** (`src/utils/particles.ts`)
- **Changed:** Particle count from 6 to 2 per spark in WebViews
- **Changed:** Shorter lifespan (250ms vs 400ms) and slower speed (60-100 vs 80-160)
- **Impact:** ~67% reduction in particle calculations
- **Status:** ✅ Active - purely visual, no gameplay impact

#### 3. **Phaser Configuration** (`src/components/GameCanvas.tsx`)
- **Changed:** Force CANVAS renderer instead of AUTO (WebGL) for WebViews
- **Changed:** Disable anti-aliasing in WebViews
- **Impact:** More consistent performance, avoids WebGL compatibility issues
- **Status:** ✅ Active - technical optimization, no gameplay impact

#### 4. **Background Animations** (`src/game/Main.ts`)
- **Changed:** Reduced neon signs from 4 to 2 in WebViews
- **Changed:** Disabled glow animation tweens on neon signs in WebViews
- **Impact:** Fewer animated objects and tween calculations
- **Status:** ✅ Active - visual only

#### 5. **Trading Chart Updates** (`src/game/Main.ts`)
- **Changed:** Update frequency from 0.2s to 0.5s in WebViews (5x/sec → 2x/sec)
- **Impact:** Fewer expensive graphics redraws
- **Status:** ✅ Active - UI element, no scoring impact

---

### ❌ **REVERTED - Gameplay-Affecting Optimizations**

These were reverted because they created competitive disadvantages:

#### 1. **Artificial FPS Limiting** ❌ REVERTED
- **Attempted:** Set Phaser FPS target to 30 with `forceSetTimeOut: true`
- **Problem:** Artificially capped performance even when device could run faster
- **Result:** Game felt slower than before optimizations
- **Reverted in:** Commit `3834ad0`

#### 2. **Delta Time Capping** ❌ REVERTED
- **Attempted:** Cap delta time to 50ms (20 FPS minimum) in WebViews
- **Problem:** When frames took longer, game ran in slow-motion instead of catching up
- **Result:** Sluggish, inconsistent gameplay
- **Reverted in:** Commit `3834ad0`

#### 3. **Resolution Reduction** ❌ REVERTED
- **Attempted:** Set render resolution to 0.75x (75%) in WebViews
- **Problem:** Made everything blurry without significant performance gain
- **Result:** Worse visual quality, minimal performance benefit
- **Reverted in:** Commit `3834ad0`

#### 4. **Physics FPS Reduction** ❌ REVERTED
- **Attempted:** Set physics FPS to 30 instead of 60 in WebViews
- **Problem:** Less precise physics calculations
- **Result:** Felt less responsive
- **Reverted in:** Commit `3834ad0`

#### 5. **Pit Skip Chance** ❌ REVERTED
- **Attempted:** Skip 25-60% of pit spawns in WebViews (distance-based)
- **Problem:** Fewer obstacles = fewer coins spawn (coins tied to chunks)
- **Impact:** ~30-40% fewer scoring opportunities
- **Result:** Competitive disadvantage - mobile users couldn't match desktop scores
- **Reverted in:** Commit `4b2bedc`

#### 6. **Wider Spawn Gaps** ❌ REVERTED
- **Attempted:** Increase gaps between spawns from 200-300m to 300-550m in WebViews
- **Problem:** ~40% fewer spawns = ~40% fewer coins and boosts
- **Impact:** Significant reduction in scoring potential
- **Result:** Competitive disadvantage
- **Reverted in:** Commit `4b2bedc`

#### 7. **Slower Speed Ramp-Up** ❌ REVERTED
- **Attempted:** Reduce speed increase from 3.0 to 1.0 per second in WebViews
- **Problem:** 3x slower acceleration = less distance covered = lower scores
- **Impact:** Distance-based scoring multiplier affected
- **Result:** Competitive disadvantage
- **Reverted in:** Commit `4b2bedc`

#### 8. **Different Initial Spawn Distance** ❌ REVERTED
- **Attempted:** Start obstacles at 250m on mobile vs 100m on desktop
- **Problem:** Different early-game experience
- **Result:** Inconsistent gameplay between platforms
- **Reverted in:** Commit `4b2bedc`

---

## Final Approach

**Philosophy:** Let the game run at whatever FPS the device can manage naturally, but reduce the visual workload so it has less to do.

### What Works:
1. **Reduce visual effects** (particles, animations) - no gameplay impact
2. **Use CANVAS renderer** - more consistent than WebGL in WebViews
3. **Disable expensive visual features** (anti-aliasing, glow animations)
4. **Throttle UI updates** (chart) - doesn't affect scoring

### What Doesn't Work:
1. **Artificial FPS caps** - makes it feel slower
2. **Delta time capping** - causes slow-motion effect
3. **Reducing spawns/gameplay elements** - creates competitive disadvantage
4. **Different speed/acceleration** - unfair scoring

---

## Key Learnings

1. **Performance vs Fairness Trade-off:**
   - Reducing gameplay elements improves performance but creates unfair leaderboards
   - Visual-only optimizations are the sweet spot

2. **FPS Capping Backfires:**
   - If a device can run at 40-45 FPS naturally, capping at 30 makes it feel worse
   - Better to let it run as fast as possible with reduced visual load

3. **WebView Detection Works:**
   - The detection system correctly identifies Phantom and other wallet browsers
   - Can be used for visual optimizations without breaking fairness

4. **Competitive Games Need Consistency:**
   - All players must have identical scoring potential regardless of platform
   - Performance optimizations must be visual-only

---

## How to Revert to This Version

If you want to experiment with these optimizations again:

```bash
# Switch to the optimization attempts branch
git checkout phantom-optimization-attempts

# Or create a new branch from it
git checkout -b new-optimization-experiment phantom-optimization-attempts
```

To see what was changed:
```bash
git diff main..phantom-optimization-attempts
```

---

## Files Modified in This Branch

1. `src/utils/device.ts` - WebView detection (KEPT)
2. `src/utils/particles.ts` - Reduced particles (KEPT)
3. `src/components/GameCanvas.tsx` - CANVAS renderer, no anti-aliasing (KEPT)
4. `src/game/Main.ts` - Visual optimizations (KEPT), gameplay changes (REVERTED)

---

## Current State (Main Branch)

- ✅ WebView detection active
- ✅ Visual optimizations active (particles, animations, chart)
- ✅ CANVAS renderer for WebViews
- ✅ Same gameplay on all platforms (fair competition)
- ✅ Chart rendering fixed

**Result:** Game runs at natural FPS with reduced visual load, maintaining competitive fairness.

