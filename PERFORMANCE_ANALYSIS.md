# Performance Analysis - Trench Runner

**Date:** December 25, 2025  
**Analysis Scope:** Complete game codebase performance audit

---

## 🔴 Critical Performance Issues

### 1. **getBounds() Called Every Frame in Collision Detection**
**Location:** `Main.ts:1381, 1458, 1459`  
**Impact:** ⚠️ **HIGH** - Creates new Rectangle objects every frame

**Problem:**
```typescript
// Called EVERY frame for EVERY sprite in collision check
const pBounds = this.player.getBounds();  // Line 1381
const pitBounds = sprite.getBounds();     // Line 1458
const playerBounds = this.player.getBounds(); // Line 1459 (duplicate!)
```

**Frequency:** 
- Called 2-3 times per frame in `checkCollisions()`
- If 50 sprites on screen, that's 100-150 `getBounds()` calls per frame
- At 60 FPS = **6,000-9,000 object creations per second**

**Fix:** Cache bounds or use simpler collision checks (x/y/distance based)

---

### 2. **getData() Called Repeatedly in Hot Paths**
**Location:** Multiple locations in `Main.ts` and `Obstacles.ts`  
**Impact:** ⚠️ **MEDIUM-HIGH** - Function call overhead

**Problem:**
```typescript
// Called multiple times per sprite per frame
const z = (sprite.getData('z') as number) ?? 99999;  // Line 510, 1391, etc.
const lane = (sprite.getData('lane') as number) ?? 1; // Line 511, 1388, etc.
const key = sprite.texture.key; // Line 506, 1397
```

**Frequency:**
- `updateMagnetEffect()`: 2-3 `getData()` calls per sprite
- `checkCollisions()`: 3-5 `getData()` calls per sprite
- `updatePerspective()`: 4-5 `getData()` calls per sprite
- With 50 sprites at 60 FPS = **15,000-25,000 getData() calls per second**

**Fix:** Cache sprite properties once per frame or store in class properties

---

### 3. **useGameStore.getState() Called Multiple Times Per Frame**
**Location:** `Main.ts` - Multiple locations  
**Impact:** ⚠️ **MEDIUM** - Zustand state access overhead

**Problem:**
```typescript
// Called multiple times in same function
const state = useGameStore.getState(); // Line 495, 682, 742, 856, 875, 943, 1505, 1703
```

**Frequency:**
- `updateMagnetEffect()`: 1 call
- `updateBoostTimers()`: 1 call  
- `updateScore()`: 1 call
- `collectItem()`: 1 call
- `collectBoost()`: 1 call
- `triggerGameOver()`: 1 call
- Total: **6-8 getState() calls per frame** = 360-480 calls/second

**Fix:** Cache state once at start of update loop, pass as parameter

---

### 4. **String Operations in Hot Loops**
**Location:** `Main.ts:506, 508, 1397, 1399, 1428, 1442`  
**Impact:** ⚠️ **MEDIUM** - String operations are relatively expensive

**Problem:**
```typescript
// Called for every sprite every frame
const key = sprite.texture.key;
if (!key.startsWith('item-')) return;  // Line 508
if (key.startsWith('item-')) {          // Line 1399
if (key.startsWith('boost-')) {         // Line 1428
if (key === 'obstacle-block') {        // Line 1442
```

**Frequency:**
- `updateMagnetEffect()`: 1 `startsWith()` per sprite
- `checkCollisions()`: 1-2 string comparisons per sprite
- With 50 sprites at 60 FPS = **3,000-6,000 string operations per second**

**Fix:** Cache sprite type as number/enum instead of string comparisons

---

### 5. **forEach Loops Without Early Returns**
**Location:** Multiple locations  
**Impact:** ⚠️ **LOW-MEDIUM** - Iterates through all sprites even when not needed

**Problem:**
```typescript
// Iterates ALL sprites even if we find what we need early
this.spawner.group.getChildren().forEach((child) => {
  // ... checks ...
  if (foundPit) return; // Doesn't break the loop!
});
```

**Frequency:**
- `hasPitInLane()`: Iterates all sprites even after finding a pit
- `clearTrackForWhaleTrail()`: Iterates all sprites
- `endWhaleTrail()`: Iterates all sprites

**Fix:** Use `for...of` with `break` or `Array.find()` for early exit

---

## 🟡 Medium Priority Issues

### 6. **Console.log Statements in Production**
**Location:** 31 instances across game files  
**Impact:** ⚠️ **LOW-MEDIUM** - Console overhead, especially on mobile

**Problem:**
```typescript
console.log('[Main Scene] create() called'); // Line 104
console.log('[PIT COLLISION] Triggering game over check...'); // Line 1475
console.log('[SHIELD CHECK] hasShield:', ...); // store.ts:367
```

**Frequency:** 31 console.log statements, many in hot paths

**Fix:** Remove or wrap in `if (process.env.NODE_ENV === 'development')`

---

### 7. **Array Creation in Player Animation**
**Location:** `Player.ts:53`  
**Impact:** ⚠️ **LOW** - Only called on skin change, not every frame

**Problem:**
```typescript
const frames = Array.from({ length: 5 }).map((_, i) => ({ key: `player-run-${i}${suffix}` }));
```

**Frequency:** Only when skin changes (rare)

**Fix:** Pre-generate animation frames or cache them

---

### 8. **Math Operations in Loops**
**Location:** Multiple locations  
**Impact:** ⚠️ **LOW** - Math operations are fast, but add up

**Problem:**
```typescript
// Called for every sprite every frame
const clampedLane = Math.max(0, Math.min(2, newLane)); // Line 522
const snappedLane = Math.abs(clampedLane - playerLane) < 0.1 ? playerLane : clampedLane; // Line 523
```

**Frequency:** Multiple Math operations per sprite per frame

**Fix:** Already optimized, but could cache some calculations

---

### 9. **Repeated Texture Key Access**
**Location:** `Main.ts` - Multiple locations  
**Impact:** ⚠️ **LOW** - Property access is fast, but repeated

**Problem:**
```typescript
const key = sprite.texture.key; // Accessed multiple times per sprite
```

**Frequency:** Accessed 2-3 times per sprite in collision checks

**Fix:** Cache `key` once per sprite check

---

## 📊 Performance Impact Summary

| Issue | Calls/Second (60 FPS, 50 sprites) | Impact | Priority |
|-------|-----------------------------------|--------|----------|
| `getBounds()` | 6,000-9,000 | 🔴 HIGH | **Fix First** |
| `getData()` | 15,000-25,000 | 🔴 HIGH | **Fix First** |
| `getState()` | 360-480 | 🟡 MEDIUM | Fix Second |
| String operations | 3,000-6,000 | 🟡 MEDIUM | Fix Second |
| forEach loops | N/A | 🟡 MEDIUM | Fix Second |
| console.log | 31 instances | 🟢 LOW | Fix Third |
| Array creation | Rare | 🟢 LOW | Optional |

---

## 🎯 Recommended Fixes (Priority Order)

### Priority 1: Critical Hot Path Optimizations

1. **Cache getBounds() results**
   - Store player bounds once per frame
   - Only recalculate when player moves
   - Use distance-based collision checks instead of bounds overlap

2. **Cache getData() results**
   - Store sprite properties in local variables at start of loop
   - Avoid repeated calls to same sprite in same frame

3. **Cache useGameStore.getState()**
   - Get state once at start of `update()` method
   - Pass state as parameter to helper functions

### Priority 2: Loop Optimizations

4. **Replace forEach with for...of + break**
   - Use early exit when possible
   - Reduces unnecessary iterations

5. **Cache string comparisons**
   - Store sprite type as enum/number
   - Avoid repeated `startsWith()` calls

### Priority 3: Cleanup

6. **Remove console.log statements**
   - Or wrap in development-only checks

7. **Optimize array operations**
   - Pre-generate animation frames
   - Cache frequently accessed arrays

---

## 🔧 Implementation Strategy

### Phase 1: Hot Path Optimization (Biggest Impact)
- Cache `getBounds()` in collision detection
- Cache `getData()` in update loops
- Cache `getState()` at frame start

**Expected Impact:** 20-30% FPS improvement on mobile

### Phase 2: Loop Optimization
- Replace forEach with early-exit loops
- Cache string operations
- Optimize sprite type checks

**Expected Impact:** 5-10% FPS improvement

### Phase 3: Cleanup
- Remove console.log
- Optimize array operations
- Code cleanup

**Expected Impact:** 2-5% FPS improvement

---

## 📝 Notes

- All measurements assume 60 FPS with ~50 active sprites on screen
- Mobile devices (especially WebViews) will see larger performance gains
- These optimizations maintain gameplay fairness (no gameplay changes)
- Test thoroughly after each phase to ensure no regressions

---

**Next Steps:**
1. Implement Phase 1 optimizations
2. Test performance improvements
3. Continue with Phase 2 if needed
4. Document results

