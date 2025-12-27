import Phaser from 'phaser';
import { SkinId, TrailId, SKINS, TRAILS, getEquippedSkin, getEquippedTrail } from '../../utils/cosmetics';

// Dev-only logging helper
const isDev = import.meta.env.DEV;
const devLog = (...args: any[]) => {
  if (isDev) console.log(...args);
};

export default class Player extends Phaser.Physics.Arcade.Sprite {
  laneIndex = 1;
  laneWidth: number;
  centerX: number;
  groundY: number;
  isSliding = false;
  isJumping = false;
  
  // Cosmetics
  currentSkin: SkinId = 'default';
  currentTrail: TrailId = 'none';
  trailParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  trailTimer: number = 0;
  rainbowColorIndex: number = 0; // For cycling through rainbow colors

  constructor(scene: Phaser.Scene, x: number, y: number, laneWidth: number) {
    super(scene, x, y, 'player-run-0');
    this.centerX = x;
    this.laneWidth = laneWidth;
    this.groundY = y;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(false);
    this.setDepth(10);
    this.setScale(1.3); // Bigger player to show detail
    
    // Gravity for jumping
    this.setGravityY(3000);
    
    this.setBodySize(25, 65);
    this.setOffset(7, 5);
    
    // Create run animation (will be updated when skin changes)
    this.updateRunAnimation(getEquippedSkin());
    this.play('run');
    
    // Load equipped cosmetics
    this.applySkin(getEquippedSkin());
    this.applyTrail(getEquippedTrail());
  }
  
  // Update run animation to use correct textures for current skin
  updateRunAnimation(skinId: SkinId) {
    // Get texture suffix based on skin (all skins except default have pre-generated textures)
    let suffix = '';
    if (skinId !== 'default') {
      suffix = `-${skinId}`;
    }
    
    const frames = Array.from({ length: 5 }).map((_, i) => ({ key: `player-run-${i}${suffix}` }));
    
    // Remove old animation if it exists
    if (this.anims.exists('run')) {
      this.anims.remove('run');
    }
    
    this.anims.create({
      key: 'run',
      frames: frames,
      frameRate: 10,
      repeat: -1,
    });
  }
  
  // Apply a skin (uses pre-tinted textures)
  applySkin(skinId: SkinId) {
    this.currentSkin = skinId;
    const skin = SKINS[skinId];
    if (skin) {
      // Clear any previous tinting
      this.clearTint();
      this.setBlendMode(Phaser.BlendModes.NORMAL);
      this.setAlpha(1);
      
      // Update animation to use correct textures
      this.updateRunAnimation(skinId);
      
      if (skinId === 'default') {
        // Use default textures
        const currentFrame = this.frame?.name || 'player-run-0';
        const frameNum = currentFrame.replace('player-run-', '').replace(/-\w+$/g, '');
        this.setTexture(`player-run-${frameNum}`);
        devLog(`[Cosmetics] Applied skin: ${skin.name} (default)`);
      } else {
        // Use pre-generated textures for all non-default skins
        const suffix = `-${skinId}`;
        const currentFrame = this.frame?.name || 'player-run-0';
        const frameNum = currentFrame.replace('player-run-', '').replace(/-\w+$/g, '');
        this.setTexture(`player-run-${frameNum}${suffix}`);
        devLog(`[Cosmetics] Applied skin: ${skin.name} (${skinId} texture)`);
      }
      
      // Restart animation with new textures
      if (this.anims.exists('run')) {
        this.play('run');
      }
    }
  }
  
  // Reapply current skin (useful after texture changes)
  reapplySkin() {
    this.applySkin(this.currentSkin);
  }
  
  // Rainbow particle emitters (one for each color)
  rainbowEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  
  // Apply a trail effect
  applyTrail(trailId: TrailId) {
    // Clean up existing trail
    if (this.trailParticles) {
      this.trailParticles.destroy();
      this.trailParticles = null;
    }
    // Clean up rainbow emitters
    this.rainbowEmitters.forEach(e => e.destroy());
    this.rainbowEmitters = [];
    
    this.currentTrail = trailId;
    const trail = TRAILS[trailId];
    
    if (!trail || trail.colors.length === 0) {
      devLog('[Cosmetics] Trail disabled');
      return;
    }
    
    // For rainbow, create separate emitters for each color
    if (trailId === 'rainbow') {
      for (let i = 0; i < 6; i++) {
        const emitter = this.scene.add.particles(0, 0, `particle-rainbow-${i}`, {
          speed: { min: 30, max: 80 },
          scale: { start: 1.2, end: 0.1 },
          alpha: { start: 1, end: 0.2 },
          lifespan: 800,
          blendMode: Phaser.BlendModes.ADD,
          emitting: false,
        });
        emitter.setDepth(9);
        this.rainbowEmitters.push(emitter);
      }
      this.rainbowColorIndex = 0;
      devLog(`[Cosmetics] Rainbow trail created with 6 color emitters`);
      return;
    }
    
    // For other trails, use pre-colored particle textures
    const particleTexture = `particle-${trailId}`;
    
    const particleConfig: any = {
      speed: { min: 30, max: 80 },
      scale: { start: 1.2, end: 0.1 },
      alpha: { start: 1, end: 0.2 },
      lifespan: 800,
      frequency: 15,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
      quantity: 2,
    };
    
    const particles = this.scene.add.particles(0, 0, particleTexture, particleConfig);
    
    devLog(`[Cosmetics] Trail particles created: ${particleTexture}`);
    particles.setDepth(9); // Behind player
    
    this.trailParticles = particles;
    devLog(`[Cosmetics] Applied trail: ${trail.name}`);
  }
  
  // Update cosmetics (call from main scene when tier changes)
  // force=true will apply even if same as current (use on game start)
  updateCosmetics(skinId: SkinId, trailId: TrailId, force: boolean = false) {
    if (force || skinId !== this.currentSkin) {
      this.applySkin(skinId);
    }
    if (force || trailId !== this.currentTrail) {
      this.applyTrail(trailId);
    }
  }

  jump() {
    if (this.isJumping || this.isSliding) return;
    this.isJumping = true;
    this.setVelocityY(-1200);
  }

  slide() {
    if (this.isSliding || this.isJumping) return;
    this.isSliding = true;
    // Use correct slide texture based on current skin (all non-default have pre-generated textures)
    let slideTexture = 'player-slide';
    if (this.currentSkin !== 'default') {
      slideTexture = `player-slide-${this.currentSkin}`;
    }
    this.setTexture(slideTexture);
    this.setBodySize(50, 25);
    this.setOffset(-4, 5);
    this.scene.time.delayedCall(600, () => {
      this.isSliding = false;
      // Use correct run texture based on current skin
      let runTexture = 'player-run-0';
      if (this.currentSkin !== 'default') {
        runTexture = `player-run-0-${this.currentSkin}`;
      }
      this.setTexture(runTexture);
      this.setBodySize(25, 65);
      this.setOffset(7, 5);
      // Restart animation
      if (this.anims.exists('run')) {
        this.play('run');
      }
    });
  }

  moveLane(dir: -1 | 1) {
    this.laneIndex = Phaser.Math.Clamp(this.laneIndex + dir, 0, 2);
  }

  getLaneX() {
    const lanes = [this.centerX - this.laneWidth, this.centerX, this.centerX + this.laneWidth];
    return lanes[this.laneIndex];
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    
    const targetX = this.getLaneX();
    this.x = Phaser.Math.Linear(this.x, targetX, 0.25);
    
    const vel = this.body?.velocity.y ?? 0;
    if (this.y >= this.groundY && vel >= 0) {
      this.y = this.groundY;
      this.setVelocityY(0);
      this.isJumping = false;
    }
    
    if (this.y < 50) {
      this.y = 50;
    }
    
    // Update trail particles position and emit
    if (this.currentTrail === 'rainbow' && this.rainbowEmitters.length > 0) {
      // Rainbow trail: cycle through colored emitters
      this.trailTimer += delta;
      if (this.trailTimer >= 16) {
        this.trailTimer = 0;
        // Emit from the current color emitter
        const emitter = this.rainbowEmitters[this.rainbowColorIndex % 6];
        emitter.emitParticleAt(this.x - 5, this.y + 25, 1);
        emitter.emitParticleAt(this.x + 5, this.y + 25, 1);
        emitter.emitParticleAt(this.x, this.y + 30, 1);
        this.rainbowColorIndex = (this.rainbowColorIndex + 1) % 6;
      }
    } else if (this.trailParticles) {
      // Other trails: normal emission
      this.trailTimer += delta;
      if (this.trailTimer >= 16) {
        this.trailTimer = 0;
        this.trailParticles.emitParticleAt(this.x - 5, this.y + 25, 2);
        this.trailParticles.emitParticleAt(this.x + 5, this.y + 25, 2);
        this.trailParticles.emitParticleAt(this.x, this.y + 30, 3);
      }
    }
  }
  
  // Clean up when destroyed
  destroy(fromScene?: boolean) {
    if (this.trailParticles) {
      this.trailParticles.destroy();
      this.trailParticles = null;
    }
    // Clean up rainbow emitters
    this.rainbowEmitters.forEach(e => e.destroy());
    this.rainbowEmitters = [];
    super.destroy(fromScene);
  }
}
