import Phaser from 'phaser';
import { getDevice } from '../../utils/device';

export type SpawnType = 'pit' | 'block' | 'collectible' | 'boost';

export interface SpawnedEntity {
  sprite: Phaser.Physics.Arcade.Sprite;
  type: SpawnType;
  lane: number;
  subType?: string;
}

type PerspectiveConfig = {
  centerX: number;
  laneWidth: number;
  horizonY: number;
  nearY: number;
  outY: number;
  zFar: number;
  zBehind: number;
  farLaneFactor: number;
  nearScaleMul: number;
  farScaleMul: number;
  behindScaleMul: number;
  groundY: number; // Player feet level
};

// Weighted collectible spawning - common items appear more often
const collectibleWeights = [
  { key: 'item-coin', weight: 40 },   // Common - 40%
  { key: 'item-wif', weight: 20 },    // Uncommon - 20%
  { key: 'item-bonk', weight: 20 },   // Uncommon - 20%
  { key: 'item-rome', weight: 12 },   // Rare - 12%
  { key: 'item-gem', weight: 8 },     // Legendary - 8%
];

const boostWeights = [
  { key: 'boost-double', weight: 45 },  // 2x multiplier
  { key: 'boost-shield', weight: 40 },  // Shield protection
  { key: 'boost-magnet', weight: 15 },  // Magnet (visual only for now)
];

function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[0];
}

function project(lane: number, z: number, cfg: PerspectiveConfig) {
  // z >= 0: horizon -> player plane (original working code)
  // z < 0: player plane -> out of view (continue at constant speed)

  if (z >= 0) {
    // Original working projection for horizon to player
    const d = Phaser.Math.Clamp(z / cfg.zFar, 0, 1); // 1 = far (horizon), 0 = near (player)
    const e = Math.pow(d, 0.55); // Curve for 3D effect

    const laneFactor = Phaser.Math.Linear(1, cfg.farLaneFactor, e);
    const x = cfg.centerX + (lane - 1) * cfg.laneWidth * laneFactor;
    const y = Phaser.Math.Linear(cfg.nearY, cfg.horizonY, e);
    const scaleMul = Phaser.Math.Linear(cfg.nearScaleMul, cfg.farScaleMul, e);
    const alpha = Phaser.Math.Linear(1, 0.55, e);

    return { x, y, depthD: d, scaleMul, alpha };
  }

  // Past the player: continue at constant speed toward bottom of screen
  // Use LINEAR interpolation for Y so speed doesn't change
  const t = Phaser.Math.Clamp(-z / cfg.zBehind, 0, 1); // 0 = at player, 1 = off screen
  
  // Keep X in the lane (full width since we're at/past player level)
  const x = cfg.centerX + (lane - 1) * cfg.laneWidth;
  
  // Y continues linearly from nearY to outY at constant speed
  const y = Phaser.Math.Linear(cfg.nearY, cfg.outY, t);
  
  // Scale stays at nearScaleMul (full size) or slightly larger
  const scaleMul = cfg.nearScaleMul * Phaser.Math.Linear(1, cfg.behindScaleMul, t);
  
  // Fade out as it moves past
  const alpha = Phaser.Math.Linear(1, 0, t);

  return { x, y, depthD: 0, scaleMul, alpha };
}

export default class Spawner {
  scene: Phaser.Scene;
  group: Phaser.Physics.Arcade.Group;
  textGroup: Phaser.GameObjects.Group;
  centerX: number;
  laneWidth: number;

  constructor(scene: Phaser.Scene, centerX: number, laneWidth: number) {
    this.scene = scene;
    this.centerX = centerX;
    this.laneWidth = laneWidth;
    this.group = scene.physics.add.group();
    this.textGroup = scene.add.group();
  }

  spawn(type: SpawnType, lane: number, z: number) {
    let key = 'obstacle-block';
    let subType = '';

    if (type === 'collectible') {
      const selected = weightedRandom(collectibleWeights);
      key = selected.key;
      subType = key.replace('item-', '');
    } else if (type === 'boost') {
      const selected = weightedRandom(boostWeights);
      key = selected.key;
      subType = key.replace('boost-', '');
    }

    // Create offscreen; updatePerspective() will place it correctly.
    const sprite = this.group.create(this.centerX, -9999, key) as Phaser.Physics.Arcade.Sprite;
    sprite.setImmovable(true);
    sprite.body?.setAllowGravity(false);

    sprite.setData('type', type);
    sprite.setData('lane', lane);
    sprite.setData('z', z);
    sprite.setData('pulseAlpha', 1);
    sprite.setData('subType', subType);

    if (type === 'collectible') {
      const baseScale = 1.3;
      sprite.setData('baseScale', baseScale);
      sprite.setDepth(4);

      // Rotation reads well at distance.
      this.scene.tweens.add({
        targets: sprite,
        angle: 360,
        duration: 2200,
        repeat: -1,
      });
    } else if (type === 'boost') {
      // Boosts are larger and have a pulsing glow effect
      const baseScale = 1.6;
      sprite.setData('baseScale', baseScale);
      sprite.setDepth(5);

      // Pulsing scale effect
      this.scene.tweens.add({
        targets: sprite,
        scaleX: '*=1.15',
        scaleY: '*=1.15',
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Rotation
      this.scene.tweens.add({
        targets: sprite,
        angle: 360,
        duration: 1800,
        repeat: -1,
      });
    } else {
      const baseScale = 1.1;
      sprite.setData('baseScale', baseScale);
      sprite.setDepth(4);

      // Add "RUG PULL" label and keep it synced in updatePerspective.
      const device = getDevice();
      const text = this.scene.add.text(this.centerX, -9999, 'RUG PULL', {
        // Mobile: bigger text for readability. Desktop: original size
        fontSize: device.isMobile ? '18px' : '14px',
        fontFamily: 'Arial Black',
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: device.isMobile ? 4 : 3,
        ...(device.isMobile && { shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true } }),
      });
      text.setOrigin(0.5, 0.5);
      text.setDepth(9);

      sprite.setData('label', text);
      this.textGroup.add(text);
    }

    return { sprite, type, lane, subType } as SpawnedEntity;
  }

  updatePerspective(speed: number, deltaMs: number, cfg: PerspectiveConfig) {
    const dt = deltaMs / 1000;

    this.group.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      

      const z0 = (sprite.getData('z') as number) ?? cfg.zFar;
      const z = z0 - speed * dt;
      sprite.setData('z', z);

      // Past bottom-out distance => recycle.
      if (z < -cfg.zBehind - 60) {
        const label = sprite.getData('label') as Phaser.GameObjects.Text;
        if (label) label.destroy();
        sprite.destroy();
        return;
      }

      const lane = (sprite.getData('lane') as number) ?? 1;
      const baseScale = (sprite.getData('baseScale') as number) ?? 1;
      const pulseAlpha = (sprite.getData('pulseAlpha') as number) ?? 1;

      const p = project(lane, z, cfg);

      sprite.setPosition(p.x, p.y);

      const s = baseScale * p.scaleMul;

      // Make pits look like narrow vertical holes in the ground
      if (sprite.texture.key === 'obstacle-block') {
        sprite.setScale(s * 0.9, s * 0.7);
        
        sprite.setAlpha(Math.min(0.95, p.alpha * pulseAlpha));
} else {
        sprite.setScale(s);
        sprite.setAlpha(p.alpha * pulseAlpha);
      }

      // Pits always render below player (depth 10) regardless of z position
      // Use z-based depth sorting within the below-player range (1-8) for proper 3D effect
      if (sprite.texture.key === 'obstacle-block') {
        // Closer objects (lower z) get higher depth, but always below player
        // z from -30 to 500, map to depth 1-8
        const normalizedZ = Phaser.Math.Clamp((z + 30) / 530, 0, 1);
        sprite.setDepth(1 + Math.round(normalizedZ * 7));  // Depth 1-8, always below player
      } else {
        // Other objects use normal depth sorting
        if (z < 0) {
          sprite.setDepth(25);
        } else {
          sprite.setDepth(6 + Math.round((1 - p.depthD) * 10));
        }
      }

      const label = sprite.getData('label') as Phaser.GameObjects.Text;
      if (label) {
        label.x = p.x;
        label.y = p.y - 5 * p.scaleMul; // Centered on taller pit
        label.setScale(p.scaleMul * 1.2); // Slightly larger text
        label.setAlpha(p.alpha);
        label.setDepth(sprite.depth + 1);
      }
    });
  }
}