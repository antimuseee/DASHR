import { create } from 'zustand';
import { getDevice, getSettings, DeviceInfo, PlatformSettings } from './device';

type GamePhase = 'title' | 'running' | 'paused' | 'gameover';
type BoostType = 'double' | 'shield' | null;

interface BoostInventory {
  double: number;
  shield: number;
  magnet: number;
}

// Highscore entry
export interface HighScoreEntry {
  name: string;
  score: number;
  distance: number;
  date: string;
}

const HIGHSCORE_KEY = 'trench-highscores';
const MAX_HIGHSCORES = 10;

// Load highscores from localStorage
function loadHighscores(): HighScoreEntry[] {
  try {
    const data = localStorage.getItem(HIGHSCORE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load highscores:', e);
  }
  return [];
}

// Save highscores to localStorage
function saveHighscores(scores: HighScoreEntry[]) {
  try {
    localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(scores));
  } catch (e) {
    console.error('Failed to save highscores:', e);
  }
}

// Check if score qualifies for highscore board
export function checkHighscoreQualifies(score: number): boolean {
  const highscores = loadHighscores();
  if (highscores.length < MAX_HIGHSCORES) return true;
  return score > highscores[highscores.length - 1].score;
}

// Add a new highscore entry
export function addHighscore(name: string, score: number, distance: number): HighScoreEntry[] {
  const highscores = loadHighscores();
  const newEntry: HighScoreEntry = {
    name: name.toUpperCase().slice(0, 10), // Max 10 chars, uppercase
    score: Math.floor(score),
    distance: Math.floor(distance),
    date: new Date().toLocaleDateString(),
  };
  
  highscores.push(newEntry);
  highscores.sort((a, b) => b.score - a.score);
  const trimmed = highscores.slice(0, MAX_HIGHSCORES);
  saveHighscores(trimmed);
  return trimmed;
}

// Get current highscores
export function getHighscores(): HighScoreEntry[] {
  return loadHighscores();
}

interface GameState {
  score: number;
  distance: number;
  multiplier: number;
  tokens: number;
  best: number;
  phase: GamePhase;
  runId: number;
  // Boost system
  activeBoost: BoostType;
  boostTimer: number;
  hasShield: boolean;
  shieldTimer: number;
  hasMagnet: boolean;
  magnetTimer: number;
  magnetCharges: number; // 0-2 progress toward next magnet (3 pickups = 1 usable)
  doubleCharges: number; // 0-2 progress toward next double boost
  shieldCharges: number; // 0-2 progress toward next shield
  boostInventory: BoostInventory;
  // Scoring breakdown
  distanceScore: number;
  collectibleScore: number;
  comboCount: number;
  comboProgress: number; // 0-2 progress toward next combo level (need 3 to level up)
  comboTimer: number;
  maxCombo: number;
  boostsUsed: number;
  whaleTokens: number; // Count of rare whale tokens collected
  // Platform detection
  device: DeviceInfo;
  platformSettings: PlatformSettings;
}

export const COMBO_CHARGES_NEEDED = 3; // Collectibles needed to increase combo by 1

export const CHARGES_NEEDED = 3; // Pickups needed for 1 usable boost/shield/magnet

const initialState: GameState = {
  score: 0,
  distance: 0,
  multiplier: 1,
  tokens: 0,
  best: Number(localStorage.getItem('trench-best') || 0),
  phase: 'title',
  runId: 0,
  // Boost system
  activeBoost: null,
  boostTimer: 0,
  hasShield: false,
  shieldTimer: 0,
  hasMagnet: false,
  magnetTimer: 0,
  magnetCharges: 0,
  doubleCharges: 0,
  shieldCharges: 0,
  boostInventory: { double: 0, shield: 0, magnet: 0 },
  // Scoring breakdown
  distanceScore: 0,
  collectibleScore: 0,
  comboCount: 0,
  comboProgress: 0,
  comboTimer: 0,
  maxCombo: 0,
  boostsUsed: 0,
  whaleTokens: 0,
  // Platform detection
  device: getDevice(),
  platformSettings: getSettings(),
};

export const useGameStore = create<GameState>(() => initialState);

// Collectible point values by tier
export const COLLECTIBLE_VALUES: Record<string, { points: number; tier: string }> = {
  coin: { points: 10, tier: 'common' },
  wif: { points: 25, tier: 'uncommon' },
  bonk: { points: 25, tier: 'uncommon' },
  rome: { points: 50, tier: 'rare' },
  gem: { points: 100, tier: 'legendary' },
  bubble: { points: 15, tier: 'common' }, // Whale trail bubble
  whale: { points: 500, tier: 'legendary' }, // Rare whale token
};

// Boost durations in seconds
export const BOOST_DURATION = 5;
export const SHIELD_DURATION = 8; // Shield lasts 8 seconds
export const MAGNET_DURATION = 8; // Magnet lasts 8 seconds

export const gameActions = {
  startRun: () =>
    useGameStore.setState((s) => ({
      phase: 'running',
      score: 0,
      distance: 0,
      multiplier: 1,
      tokens: 0,
      runId: s.runId + 1,
      activeBoost: null,
      boostTimer: 0,
      hasShield: false,
      shieldTimer: 0,
      hasMagnet: false,
      magnetTimer: 0,
      magnetCharges: 0,
      doubleCharges: 0,
      shieldCharges: 0,
      boostInventory: { double: 0, shield: 0, magnet: 0 },
      distanceScore: 0,
      collectibleScore: 0,
      comboCount: 0,
      comboProgress: 0,
      comboTimer: 0,
      maxCombo: 0,
      boostsUsed: 0,
      whaleTokens: 0,
    })),
  pause: () => useGameStore.setState({ phase: 'paused' }),
  resume: () => useGameStore.setState({ phase: 'running' }),
  updateHUD: (data: Partial<Pick<GameState, 'score' | 'distance' | 'multiplier' | 'tokens'>>) =>
    useGameStore.setState(data),
  
  // Add boost to inventory (when collected) - all boosts require multiple pickups
  addBoostToInventory: (type: 'double' | 'shield' | 'magnet') => {
    const state = useGameStore.getState();
    const newInventory = { ...state.boostInventory };
    
    // All boosts require multiple pickups to charge
    const chargeKey = type === 'double' ? 'doubleCharges' : type === 'shield' ? 'shieldCharges' : 'magnetCharges';
    const currentCharges = state[chargeKey];
    const newCharges = currentCharges + 1;
    
    if (newCharges >= CHARGES_NEEDED) {
      // Fully charged! Add a usable boost
      newInventory[type] = Math.min(newInventory[type] + 1, 3);
      useGameStore.setState({ boostInventory: newInventory, [chargeKey]: 0 });
    } else {
      // Still charging
      useGameStore.setState({ [chargeKey]: newCharges });
    }
  },
  
  // Activate a boost from inventory (returns true if successful)
  activateBoostFromInventory: (type: 'double' | 'shield' | 'magnet'): boolean => {
    const state = useGameStore.getState();
    if (state.boostInventory[type] <= 0) return false;
    
    // Can't stack double boosts
    if (type === 'double' && state.activeBoost === 'double') return false;
    // Can't stack shields
    if (type === 'shield' && state.hasShield) return false;
    // Can't stack magnets
    if (type === 'magnet' && state.hasMagnet) return false;
    
    const newInventory = { ...state.boostInventory };
    newInventory[type] -= 1;
    
    if (type === 'shield') {
      useGameStore.setState({ 
        boostInventory: newInventory, 
        hasShield: true,
        shieldTimer: SHIELD_DURATION,
        boostsUsed: state.boostsUsed + 1,
      });
    } else if (type === 'double') {
      useGameStore.setState({ 
        boostInventory: newInventory, 
        activeBoost: 'double', 
        boostTimer: BOOST_DURATION,
        boostsUsed: state.boostsUsed + 1,
      });
    } else if (type === 'magnet') {
      // Magnet attracts nearby collectibles for duration
      console.log('[MAGNET] Activated! Duration:', MAGNET_DURATION);
      useGameStore.setState({ 
        boostInventory: newInventory,
        hasMagnet: true,
        magnetTimer: MAGNET_DURATION,
        boostsUsed: state.boostsUsed + 1,
      });
    }
    return true;
  },
  
  // Legacy activate boost (direct activation, used internally)
  activateBoost: (type: BoostType) => {
    if (type === 'shield') {
      useGameStore.setState({ hasShield: true, shieldTimer: SHIELD_DURATION });
    } else {
      useGameStore.setState({ activeBoost: type, boostTimer: BOOST_DURATION });
    }
  },
  
  // Use shield (returns true if shield was active)
  useShield: (): boolean => {
    const state = useGameStore.getState();
    console.log('[SHIELD CHECK] hasShield:', state.hasShield, 'shieldTimer:', state.shieldTimer);
    if (state.hasShield && state.shieldTimer > 0) {
      console.log('[SHIELD] Protected! Consuming shield.');
      useGameStore.setState({ hasShield: false, shieldTimer: 0 });
      return true;
    }
    console.log('[SHIELD] Not protected - no active shield');
    return false;
  },
  
  // Update boost timer (call each frame)
  updateBoostTimer: (delta: number) => {
    const state = useGameStore.getState();
    
    // 2X boost timer
    if (state.activeBoost && state.boostTimer > 0) {
      const newTimer = state.boostTimer - delta;
      if (newTimer <= 0) {
        useGameStore.setState({ activeBoost: null, boostTimer: 0 });
      } else {
        useGameStore.setState({ boostTimer: newTimer });
      }
    }
    
    // Shield timer - drains over time
    if (state.hasShield && state.shieldTimer > 0) {
      const newShieldTimer = state.shieldTimer - delta;
      if (newShieldTimer <= 0) {
        console.log('[SHIELD] Timer expired!');
        useGameStore.setState({ hasShield: false, shieldTimer: 0 });
      } else {
        useGameStore.setState({ shieldTimer: newShieldTimer });
      }
    }
    
    // Magnet timer - drains over time
    if (state.hasMagnet && state.magnetTimer > 0) {
      const newMagnetTimer = state.magnetTimer - delta;
      if (newMagnetTimer <= 0) {
        console.log('[MAGNET] Timer expired!');
        useGameStore.setState({ hasMagnet: false, magnetTimer: 0 });
      } else {
        useGameStore.setState({ magnetTimer: newMagnetTimer });
      }
    }
    
    // Combo timer decay
    if (state.comboTimer > 0) {
      const newComboTimer = state.comboTimer - delta;
      if (newComboTimer <= 0) {
        useGameStore.setState({ comboCount: 0, comboProgress: 0, comboTimer: 0 });
      } else {
        useGameStore.setState({ comboTimer: newComboTimer });
      }
    }
  },
  
  // Add collectible score with combo system
  addCollectibleScore: (type: string) => {
    const state = useGameStore.getState();
    const value = COLLECTIBLE_VALUES[type] || { points: 10, tier: 'common' };
    
    // Double boost doubles both points AND effective combo
    const isDoubleActive = state.activeBoost === 'double';
    const boostMultiplier = isDoubleActive ? 2 : 1;
    
    // Combo bonus: each consecutive collect within window adds +10%
    // When double boost active, combo value is doubled (7 becomes 14)
    const effectiveCombo = isDoubleActive ? state.comboCount * 2 : state.comboCount;
    const comboMultiplier = 1 + (effectiveCombo * 0.1);
    
    // Combo charging: need multiple collectibles to increase combo level
    const progressGain = isDoubleActive ? 2 : 1; // Double boost = 2x progress
    let newComboProgress = state.comboProgress + progressGain;
    let newComboCount = state.comboCount;
    
    // Check if we've earned a new combo level
    while (newComboProgress >= COMBO_CHARGES_NEEDED && newComboCount < 10) {
      newComboProgress -= COMBO_CHARGES_NEEDED;
      newComboCount += 1;
    }
    newComboCount = Math.min(newComboCount, 10); // Cap at 10x combo
    const newMaxCombo = Math.max(state.maxCombo, newComboCount);
    
    const points = Math.round(value.points * comboMultiplier * boostMultiplier * state.multiplier);
    
    useGameStore.setState({
      collectibleScore: state.collectibleScore + points,
      score: state.score + points,
      tokens: state.tokens + 1,
      comboCount: newComboCount,
      comboProgress: newComboProgress,
      comboTimer: 1.2, // 1.2 second combo window (tighter timing)
      maxCombo: newMaxCombo,
    });
    
    return { points, combo: newComboCount, tier: value.tier };
  },
  
  // Add distance-based score
  addDistanceScore: (distanceDelta: number) => {
    const state = useGameStore.getState();
    const boostMultiplier = state.activeBoost === 'double' ? 2 : 1;
    const points = distanceDelta * state.multiplier * boostMultiplier * 0.5; // 0.5 points per meter base
    
    useGameStore.setState({
      distanceScore: state.distanceScore + points,
      score: state.score + points,
    });
  },
  
  gameOver: (finalScore: number, distance: number, tokens: number) => {
    useGameStore.setState((s) => {
      const best = Math.max(s.best, finalScore);
      localStorage.setItem('trench-best', String(best));
      return { phase: 'gameover', score: finalScore, distance, tokens, best };
    });
  },
  backToTitle: () => useGameStore.setState(initialState),
};
