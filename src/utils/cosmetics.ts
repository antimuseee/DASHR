// Cosmetics System - Skins and Effects tied to holder tiers
import { HolderTier } from './token';

export type SkinId = 'default' | 'bronze' | 'silver' | 'chrome' | 'neon' | 'gold' | 'diamond' | 'holographic';
export type TrailId = 'none' | 'neon' | 'fire' | 'rainbow' | 'diamond';

export interface Skin {
  id: SkinId;
  name: string;
  description: string;
  tint: number; // Phaser tint color
  requiredTier: HolderTier;
  unlockMessage: string;
}

export interface Trail {
  id: TrailId;
  name: string;
  description: string;
  colors: number[]; // Array of colors for particles
  requiredTier: HolderTier;
}

// All available skins
export const SKINS: Record<SkinId, Skin> = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'The classic runner',
    tint: 0xffffff,
    requiredTier: 'none',
    unlockMessage: 'Available to everyone',
  },
  bronze: {
    id: 'bronze',
    name: 'Bronze Runner',
    description: 'Shimmering bronze coating',
    tint: 0xcd7f32,
    requiredTier: 'bronze',
    unlockMessage: 'Hold 1,000+ $TSTR to unlock',
  },
  silver: {
    id: 'silver',
    name: 'Silver Surge',
    description: 'Sleek silver finish',
    tint: 0x888888, // Darker metallic gray - more distinct from chrome
    requiredTier: 'silver',
    unlockMessage: 'Hold 10,000+ $TSTR to unlock',
  },
  chrome: {
    id: 'chrome',
    name: 'Chrome Dash',
    description: 'Reflective chrome plating',
    tint: 0xb0d0ff, // Bright blue-tinted chrome - reflective and distinct
    requiredTier: 'silver',
    unlockMessage: 'Hold 10,000+ $TSTR to unlock',
  },
  neon: {
    id: 'neon',
    name: 'Neon Blitz',
    description: 'Glowing neon vibes',
    tint: 0x00ff00, // Pure bright green for maximum visibility
    requiredTier: 'silver',
    unlockMessage: 'Hold 10,000+ $TSTR to unlock',
  },
  gold: {
    id: 'gold',
    name: 'Golden Legend',
    description: 'Pure gold magnificence',
    tint: 0xffd700,
    requiredTier: 'gold',
    unlockMessage: 'Hold 100,000+ $TSTR to unlock',
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond Elite',
    description: 'Sparkling diamond perfection',
    tint: 0x00ffff,
    requiredTier: 'diamond',
    unlockMessage: 'Hold 1,000,000+ $TSTR to unlock',
  },
  holographic: {
    id: 'holographic',
    name: 'Holographic',
    description: 'Reality-bending hologram',
    tint: 0xff00ff,
    requiredTier: 'diamond',
    unlockMessage: 'Hold 1,000,000+ $TSTR to unlock',
  },
};

// All available trails
export const TRAILS: Record<TrailId, Trail> = {
  none: {
    id: 'none',
    name: 'No Trail',
    description: 'Clean and simple',
    colors: [],
    requiredTier: 'none',
  },
  neon: {
    id: 'neon',
    name: 'Neon Stream',
    description: 'Glowing neon particles',
    colors: [0x00ff88, 0x00ffcc, 0x88ffaa],
    requiredTier: 'silver',
  },
  fire: {
    id: 'fire',
    name: 'Fire Trail',
    description: 'Blazing hot particles',
    colors: [0xff6600, 0xff3300, 0xffcc00],
    requiredTier: 'gold',
  },
  rainbow: {
    id: 'rainbow',
    name: 'Rainbow Wave',
    description: 'Full spectrum beauty',
    colors: [0xff0000, 0xff7700, 0xffff00, 0x00ff00, 0x0077ff, 0x8800ff],
    requiredTier: 'gold',
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond Dust',
    description: 'Sparkling diamond particles',
    colors: [0x00ffff, 0xffffff, 0x00ccff, 0xaaffff],
    requiredTier: 'diamond',
  },
};

// Tier hierarchy for comparison
const TIER_LEVELS: Record<HolderTier, number> = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  diamond: 4,
};

// Check if a tier meets the requirement
export function meetsRequirement(userTier: HolderTier, requiredTier: HolderTier): boolean {
  return TIER_LEVELS[userTier] >= TIER_LEVELS[requiredTier];
}

// Get all skins unlocked for a tier
export function getUnlockedSkins(tier: HolderTier): Skin[] {
  return Object.values(SKINS).filter(skin => meetsRequirement(tier, skin.requiredTier));
}

// Get all trails unlocked for a tier
export function getUnlockedTrails(tier: HolderTier): Trail[] {
  return Object.values(TRAILS).filter(trail => meetsRequirement(tier, trail.requiredTier));
}

// Storage keys
const SKIN_KEY = 'trench-equipped-skin';
const TRAIL_KEY = 'trench-equipped-trail';

// Get equipped skin (defaults to 'default')
export function getEquippedSkin(): SkinId {
  return (localStorage.getItem(SKIN_KEY) as SkinId) || 'default';
}

// Set equipped skin
export function setEquippedSkin(skinId: SkinId): void {
  localStorage.setItem(SKIN_KEY, skinId);
}

// Get equipped trail (defaults to 'none')
export function getEquippedTrail(): TrailId {
  return (localStorage.getItem(TRAIL_KEY) as TrailId) || 'none';
}

// Set equipped trail
export function setEquippedTrail(trailId: TrailId): void {
  localStorage.setItem(TRAIL_KEY, trailId);
}

// Auto-equip best available cosmetics for tier (called when tier changes)
export function autoEquipForTier(tier: HolderTier): { skin: SkinId; trail: TrailId } {
  // Get current equipment
  let currentSkin = getEquippedSkin();
  let currentTrail = getEquippedTrail();
  
  // Check if current skin is still valid for tier
  const skinValid = meetsRequirement(tier, SKINS[currentSkin]?.requiredTier || 'none');
  if (!skinValid) {
    // Downgrade to best available
    const available = getUnlockedSkins(tier);
    currentSkin = available[available.length - 1]?.id || 'default';
    setEquippedSkin(currentSkin);
  }
  
  // Check if current trail is still valid
  const trailValid = meetsRequirement(tier, TRAILS[currentTrail]?.requiredTier || 'none');
  if (!trailValid) {
    const available = getUnlockedTrails(tier);
    currentTrail = available[available.length - 1]?.id || 'none';
    setEquippedTrail(currentTrail);
  }
  
  // If user just reached a new tier, auto-equip new stuff if they haven't customized
  if (tier !== 'none') {
    const unlockedSkins = getUnlockedSkins(tier);
    const unlockedTrails = getUnlockedTrails(tier);
    
    // If on default skin and better is available, upgrade
    if (currentSkin === 'default' && unlockedSkins.length > 1) {
      currentSkin = unlockedSkins[unlockedSkins.length - 1].id;
      setEquippedSkin(currentSkin);
    }
    
    // If no trail and one is available, equip it
    if (currentTrail === 'none' && unlockedTrails.length > 1) {
      currentTrail = unlockedTrails[unlockedTrails.length - 1].id;
      setEquippedTrail(currentTrail);
    }
  }
  
  return { skin: currentSkin, trail: currentTrail };
}

