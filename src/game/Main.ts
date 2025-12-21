import Phaser from 'phaser';
import Player from './entities/Player';
import Spawner from './entities/Obstacles';
import { useGameStore, gameActions } from '../utils/store';
import { spawnSpark } from '../utils/particles';
import { getDevice } from '../utils/device';

interface ChunkConfig {
  weight: number;
  obstacles: Array<{ type: 'pit' | 'block'; lanes: number[] }>;
  collectibles: number;
}

const chunks: ChunkConfig[] = [
  { weight: 4, obstacles: [{ type: 'block', lanes: [1] }], collectibles: 3 },
  { weight: 3, obstacles: [{ type: 'block', lanes: [0] }, { type: 'block', lanes: [2] }], collectibles: 2 },
  { weight: 2, obstacles: [{ type: 'block', lanes: [0] }], collectibles: 4 },
];

function pickChunk() {
  const total = chunks.reduce((a, c) => a + c.weight, 0);
  let r = Math.random() * total;
  for (const chunk of chunks) {
    r -= chunk.weight;
    if (r <= 0) return chunk;
  }
  return chunks[0];
}

// Module-level variable for controls reversal (avoids closure issues with event handlers)
let isControlsReversed = false;

export default class MainScene extends Phaser.Scene {
  player!: Player;
  spawner!: Spawner;
  speed = 250;
  distance = 0;
  nextSpawnDistance = 0;
  nextBoostDistance = 0;
  runActive = false;
  centerX = 0;
  groundY = 0;
  laneWidth = 100;

  // Perspective tuning
  horizonY = 0;
  nearY = 0;
  zFar = 1200; // distance from horizon to player along the "road"
  farLaneFactor = 0.14; // how much lanes converge at the horizon (smaller = more 3D)
  nearScaleMul = 1.0;
  farScaleMul = 0.18;

  // Score popup tracking
  private scorePopups: Phaser.GameObjects.Text[] = [];
  
  // Invincibility after shield save
  private invincibleUntil = 0;
  
  // Extra life from surviving whale manipulation
  private hasExtraLife = false;

  // Trading chart (portfolio tracker)
  private chartGraphics: Phaser.GameObjects.Graphics | null = null;
  private chartData: number[] = []; // Score history for chart
  private chartUpdateTimer = 0;
  private lastChartScore = 0;

  // Whale events
  private controlsReversed = false;
  private whaleAlertTimer = 0; // Countdown timer in seconds
  private whaleAlertEnding = false; // Flag to prevent repeat end-of-alert processing
  private whaleAlertText: Phaser.GameObjects.Text | null = null;
  private whaleExclaim1: Phaser.GameObjects.Text | null = null;
  private whaleExclaim2: Phaser.GameObjects.Text | null = null;
  private whaleEventsUnlocked = false; // Whale events only after player has used boosts
  private nextWhaleEventDistance = 0; // Set when unlocked
  private lastWhaleEventWasTrail = false; // Alternate between trail and manipulation
  private whaleTrailBoostThreshold = 4; // Boosts needed for next trail
  private whaleManipulationBoostThreshold = 7; // Boosts needed for next manipulation
  
  // Whale trail - follow the bubble trail to catch the whale!
  private whaleTrailActive = false;
  private whaleLeader: Phaser.GameObjects.Sprite | null = null; // The whale to catch
  private whaleLeaderZ = 0; // Whale's current z distance (starts far, gets closer)
  private whaleLeaderLane = 1; // Whale's current lane
  private whaleTrailPath: { lane: number; z: number }[] = []; // Pre-generated bubble path
  private whaleTrailProgress = 0; // Current bubble index player needs to collect
  private whaleTrailBubbles: Phaser.Physics.Arcade.Sprite[] = []; // Active bubble sprites
  private whaleStartZ = 0; // Where whale started (for lerping closer)
  private whaleTrailStartTime = 0; // Time when trail started

  private keyHandler!: (e: KeyboardEvent) => void;

  constructor() {
    super('Main');
  }

  create() {
    this.centerX = this.scale.width / 2;
    this.groundY = this.scale.height - 120;
    this.horizonY = Math.floor(this.scale.height * 0.28);
    this.nearY = this.groundY - 30;

    // CYBERPUNK BACKGROUND
    this.createBackground();

    // NEON GROUND with stronger perspective grid
    this.createGround();

    // Player
    this.player = new Player(this, this.centerX, this.groundY - 35, this.laneWidth);

    // Spawner
    this.spawner = new Spawner(this, this.centerX, this.laneWidth);

    // Keyboard
    this.keyHandler = (e: KeyboardEvent) => {
      // Don't intercept keys when typing in an input field (check both target and activeElement)
      const target = e.target as HTMLElement;
      const activeEl = document.activeElement as HTMLElement;
      const isTyping = 
        target?.tagName === 'INPUT' || 
        target?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'INPUT' || 
        activeEl?.tagName === 'TEXTAREA';
      
      if (isTyping) {
        return; // Let the input handle the key
      }
      
      if (!this.runActive) return;
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          e.preventDefault();
          this.player.jump();
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          this.player.slide();
          break;
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          this.player.moveLane(this.controlsReversed ? 1 : -1);
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          this.player.moveLane(this.controlsReversed ? -1 : 1);
          break;
        // Boost activation keys
        case 'Digit1':
        case 'KeyQ':
          e.preventDefault();
          this.activateBoostFromInventory('double');
          break;
        case 'Digit2':
        case 'KeyE':
          e.preventDefault();
          this.activateBoostFromInventory('shield');
          break;
        case 'Digit3':
        case 'KeyR':
          e.preventDefault();
          this.activateBoostFromInventory('magnet');
          break;
      }
    };
    document.addEventListener('keydown', this.keyHandler);

    // Remove old swipe event listeners before adding new ones (prevents double-firing on restart)
    this.game.events.off('input:jump');
    this.game.events.off('input:slide');
    this.game.events.off('input:left');
    this.game.events.off('input:right');
    
    // Swipe events - use module-level isControlsReversed to avoid closure issues
    const scene = this;
    this.game.events.on('input:jump', () => scene.player.jump());
    this.game.events.on('input:slide', () => scene.player.slide());
    this.game.events.on('input:left', () => {
      scene.player.moveLane(isControlsReversed ? 1 : -1);
    });
    this.game.events.on('input:right', () => {
      scene.player.moveLane(isControlsReversed ? -1 : 1);
    });

    // Start
    this.speed = 250;
    this.distance = 0;
    this.nextSpawnDistance = 100;
    this.nextBoostDistance = 600 + Math.random() * 400; // First boost after 600-1000m
    this.runActive = true;
    this.scorePopups = [];
    this.invincibleUntil = 0;
    this.hasExtraLife = false; // Reset extra life on new game
    this.controlsReversed = false; // Reset controls on new game
    this.whaleAlertTimer = 0; // Reset whale alert timer
    isControlsReversed = false; // Reset module-level variable too

    gameActions.startRun();

    this.scale.off('resize', this.handleResize, this); // Remove old listener first
    this.scale.on('resize', this.handleResize, this);
    
    // Force a resize check shortly after start for mobile first-load positioning
    this.time.delayedCall(100, () => {
      this.handleResize({ width: this.scale.width, height: this.scale.height } as Phaser.Structs.Size);
    });
    
    // Pre-warm particle system on mobile to prevent slowdown on first boost activation
    const device = getDevice();
    if (device.isMobile) {
      const warmupEmitter = this.add.particles(-100, -100, 'particle', {
        lifespan: 50,
        speed: 1,
        scale: { start: 0.01, end: 0 },
        quantity: 1,
      });
      this.time.delayedCall(100, () => warmupEmitter.destroy());
    }
    
    // Create trading chart graphics
    this.chartGraphics = this.add.graphics();
    this.chartGraphics.setScrollFactor(0).setDepth(999);
    this.chartData = []; // Start empty - line will build as points accumulate
    this.chartUpdateTimer = 0;
    this.lastChartScore = 0;
    
    this.events.once('shutdown', () => {
      document.removeEventListener('keydown', this.keyHandler);
    });
  }

  createBackground() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Dark gradient sky
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0015, 0x0a0015, 0x1a0a2e, 0x1a0a2e, 1);
    bg.fillRect(0, 0, w, h);
    bg.setScrollFactor(0).setDepth(-100);

    // Distant city silhouette
    const city = this.add.graphics();
    city.fillStyle(0x0d0d1a, 1);
    for (let i = 0; i < 15; i++) {
      const bx = i * (w / 12) - 20;
      const bh = 100 + Math.random() * 200;
      const bw = 30 + Math.random() * 50;
      city.fillRect(bx, h * 0.3 - bh, bw, bh);

      // Random lit windows
      city.fillStyle(0x9b5cff, 0.3 + Math.random() * 0.4);
      for (let j = 0; j < 5; j++) {
        if (Math.random() > 0.5) {
          city.fillRect(bx + 5 + Math.random() * (bw - 15), h * 0.3 - bh + 10 + j * 30, 8, 12);
        }
      }
      city.fillStyle(0x0d0d1a, 1);
    }
    city.setScrollFactor(0).setDepth(-90);

    // Floating neon signs
    const signs = ['PUMP', 'MOON', 'HODL', 'APE'];
    signs.forEach((text, i) => {
      const sign = this.add.text(50 + (i * w) / 4, 80 + Math.random() * 100, text, {
        fontSize: '24px',
        fontFamily: 'Arial Black',
        color: i % 2 === 0 ? '#ff00ff' : '#00ffff',
        stroke: '#000000',
        strokeThickness: 4,
      });
      sign.setScrollFactor(0).setDepth(-80).setAlpha(0.7);

      // Glow effect via tween
      this.tweens.add({
        targets: sign,
        alpha: 0.4,
        duration: 1000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
      });
    });

    // Purple/pink fog at horizon
    const fog = this.add.graphics();
    fog.fillStyle(0x9b5cff, 0.15);
    fog.fillRect(0, h * 0.25, w, h * 0.2);
    fog.fillStyle(0xff00ff, 0.1);
    fog.fillRect(0, h * 0.3, w, h * 0.15);
    fog.setScrollFactor(0).setDepth(-85);
  }

  createGround() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Main ground platform
    const ground = this.add.graphics();
    ground.fillGradientStyle(0x1a0a2e, 0x1a0a2e, 0x0a0015, 0x0a0015, 1);
    ground.fillRect(0, this.groundY - 20, w, h - this.groundY + 50);
    ground.setScrollFactor(0).setDepth(-10);

    // Neon grid lines on ground (stronger perspective)
    const grid = this.add.graphics();

    // Horizontal lines (denser toward the player, sparser near horizon)
    for (let i = 0; i < 22; i++) {
      const t = i / 21;
      const eased = t * t;
      const y = Phaser.Math.Linear(this.horizonY, this.groundY + 35, eased);
      const alpha = Phaser.Math.Linear(0.06, 0.35, eased);
      grid.lineStyle(2, 0xff00ff, alpha);
      grid.lineBetween(0, y, w, y);
    }

    // Vertical lane dividers converge toward vanishing point
    const vanishX = this.centerX;
    const vanishY = this.horizonY;
    const laneXs = [this.centerX - this.laneWidth, this.centerX, this.centerX + this.laneWidth];
    laneXs.forEach((xBottom) => {
      const xTop = Phaser.Math.Linear(vanishX, xBottom, this.farLaneFactor);
      grid.lineStyle(2, 0x00ffff, 0.32);
      grid.lineBetween(xBottom, this.groundY + 40, xTop, vanishY);
      grid.lineStyle(1, 0x00ffff, 0.6);
      grid.lineBetween(xBottom, this.groundY + 40, xTop, vanishY);
    });

    grid.setScrollFactor(0).setDepth(-5);

    // Glowing edge line
    const edgeLine = this.add.graphics();
    edgeLine.lineStyle(4, 0x00ffff, 0.8);
    edgeLine.lineBetween(0, this.groundY - 2, w, this.groundY - 2);
    edgeLine.lineStyle(8, 0x00ffff, 0.2);
    edgeLine.lineBetween(0, this.groundY - 2, w, this.groundY - 2);
    edgeLine.setScrollFactor(0).setDepth(5);

    // Side rails glow (slightly converging)
    const rails = this.add.graphics();
    const railOffset = this.laneWidth * 1.8;
    const leftBottom = this.centerX - railOffset;
    const rightBottom = this.centerX + railOffset;
    const leftTop = Phaser.Math.Linear(this.centerX, leftBottom, this.farLaneFactor);
    const rightTop = Phaser.Math.Linear(this.centerX, rightBottom, this.farLaneFactor);

    rails.lineStyle(3, 0x9b5cff, 0.5);
    rails.lineBetween(leftBottom, this.groundY + 60, leftTop, this.horizonY);
    rails.lineBetween(rightBottom, this.groundY + 60, rightTop, this.horizonY);
    rails.setScrollFactor(0).setDepth(-8);
  }

  handleResize(gameSize: Phaser.Structs.Size) {
    this.centerX = gameSize.width / 2;
    this.groundY = gameSize.height - 120;
    this.horizonY = Math.floor(gameSize.height * 0.28);
    this.nearY = this.groundY - 30;
    
    // Update player position to match new dimensions
    if (this.player) {
      this.player.centerX = this.centerX;
      this.player.groundY = this.groundY;
      this.player.y = this.groundY - 35;
      this.player.x = this.player.getLaneX();
    }
    
    // Update spawner center
    if (this.spawner) {
      this.spawner.centerX = this.centerX;
    }
  }

  restartRun() {
    this.scene.restart();
  }

  update(_: number, delta: number) {
    if (!this.runActive) return;

    const dt = delta / 1000;
    const distanceDelta = (this.speed * dt);
    this.distance += distanceDelta;
    this.speed += 3 * dt;

    // Update boost timers
    gameActions.updateBoostTimer(dt);

    // Update whale alert
    this.updateWhaleEvents(dt);
    
    // Update trading chart
    this.updateTradingChart(dt);

    // Distance-based scoring
    gameActions.addDistanceScore(distanceDelta);

    // Update multiplier based on distance (caps at 5x)
    const newMultiplier = Math.min(5, 1 + this.distance / 2000);
    useGameStore.setState({
      distance: this.distance,
      multiplier: newMultiplier,
    });

    this.spawnByDistance();
    
    // Magnet effect - attract collectibles
    this.updateMagnetEffect(dt);

    this.spawner.updatePerspective(this.speed, delta, {
      centerX: this.centerX,
      laneWidth: this.laneWidth,
      horizonY: this.horizonY,
      nearY: this.nearY,
      zFar: this.zFar,
      farLaneFactor: this.farLaneFactor,
      nearScaleMul: this.nearScaleMul,
      farScaleMul: this.farScaleMul,
      outY: this.groundY + 220,
      zBehind: 380,
      behindScaleMul: 1.15,
      groundY: this.groundY,
    });

    this.checkCollisions();
  }
  
  updateMagnetEffect(dt: number) {
    const state = useGameStore.getState();
    if (!state.hasMagnet) return;
    
    const playerLane = this.player.laneIndex;
    const magnetRange = 400; // Z distance to attract from
    const attractSpeed = 3; // How fast items move toward player lane
    
    this.spawner.group.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      
      const key = sprite.texture.key;
      // Only attract collectibles (items), not obstacles or boosts
      if (!key.startsWith('item-')) return;
      
      const z = (sprite.getData('z') as number) ?? 99999;
      const lane = (sprite.getData('lane') as number) ?? 1;
      
      // Only attract items within range and in front of player
      if (z > magnetRange || z < -50) return;
      
      // If not in player's lane, move toward it
      if (lane !== playerLane) {
        const direction = playerLane > lane ? 1 : -1;
        const newLane = lane + direction * attractSpeed * dt;
        
        // Clamp to valid lane range and snap when close
        const clampedLane = Math.max(0, Math.min(2, newLane));
        const snappedLane = Math.abs(clampedLane - playerLane) < 0.1 ? playerLane : clampedLane;
        
        sprite.setData('lane', snappedLane);
        
        // Visual feedback - make attracted items glow/pulse
        if (!sprite.getData('magnetized')) {
          sprite.setData('magnetized', true);
          sprite.setTint(0xff00ff); // Pink tint when being attracted
        }
      }
    });
  }

  spawnByDistance() {
    // During whale trail, don't spawn ANYTHING new - only the bubble trail, whale, and existing pits
    if (this.whaleTrailActive) {
      // Still advance spawn distance so we don't get a flood after trail ends
      while (this.distance >= this.nextSpawnDistance) {
        this.nextSpawnDistance += Phaser.Math.Between(200, 300);
      }
      return;
    }
    
    while (this.distance >= this.nextSpawnDistance) {
      const chunk = pickChunk();

      // Spawn very close to the horizon so they immediately start moving toward the player.
      const zBase = this.zFar * Phaser.Math.FloatBetween(0.94, 0.99);

      // Spawn obstacles (pits)
      chunk.obstacles.forEach((o) => {
        o.lanes.forEach((lane) => {
          this.spawner.spawn(o.type, lane, zBase);
        });
      });

      // Spawn collectibles
      for (let i = 0; i < chunk.collectibles; i++) {
        const lane = Phaser.Math.Between(0, 2);
        this.spawner.spawn('collectible', lane, zBase + 120 + i * 140);
      }

      this.nextSpawnDistance += Phaser.Math.Between(200, 300);
    }

    // Spawn boosts occasionally
    if (this.distance >= this.nextBoostDistance) {
      const lane = Phaser.Math.Between(0, 2);
      const zBase = this.zFar * Phaser.Math.FloatBetween(0.94, 0.99);
      this.spawner.spawn('boost', lane, zBase);
      
      // Next boost in 800-1400m (boosts are rare!)
      this.nextBoostDistance = this.distance + Phaser.Math.Between(800, 1400);
    }
  }

  updateWhaleEvents(dt: number) {
    try {
      // Count down whale alert timer
      if (this.controlsReversed && this.whaleAlertTimer > 0) {
        this.whaleAlertTimer -= dt;
        
        // Check if whale alert should end
        if (this.whaleAlertTimer <= 0) {
          console.log('[WhaleManipulation] Timer expired, ending manipulation');
          this.controlsReversed = false;
          isControlsReversed = false; // Update module-level variable for swipe handlers
          this.whaleAlertTimer = 0;
          
          // Destroy all whale alert text elements
          if (this.whaleAlertText) {
            this.whaleAlertText.destroy();
            this.whaleAlertText = null;
          }
          if (this.whaleExclaim1) {
            this.whaleExclaim1.destroy();
            this.whaleExclaim1 = null;
          }
          if (this.whaleExclaim2) {
            this.whaleExclaim2.destroy();
            this.whaleExclaim2 = null;
          }
        
        // Show "controls restored" message so player knows it's safe
        const restoredText = this.add.text(this.centerX, this.scale.height / 2 - 50, '✅ CONTROLS RESTORED!', {
          fontSize: '24px',
          fontFamily: 'Arial Black',
          color: '#00ff00',
          stroke: '#003300',
          strokeThickness: 4,
          align: 'center',
        }).setOrigin(0.5).setDepth(1000);
        
        this.tweens.add({
          targets: restoredText,
          alpha: 0,
          y: restoredText.y - 30,
          duration: 1200,
          onComplete: () => restoredText.destroy(),
        });
        
        // Grant extra life for surviving whale manipulation (only if still alive!)
        if (this.runActive) {
          this.hasExtraLife = true;
          
          // Show extra life granted message
          this.time.delayedCall(800, () => {
            if (!this.runActive) return; // Don't show if game ended
            const extraLifeText = this.add.text(this.centerX, this.scale.height / 2 - 20, '💚 EXTRA LIFE GRANTED! 💚', {
              fontSize: '20px',
              fontFamily: 'Arial Black',
              color: '#ffff00',
              stroke: '#333300',
              strokeThickness: 4,
              align: 'center',
            }).setOrigin(0.5).setDepth(1000);
            
            this.tweens.add({
              targets: extraLifeText,
              alpha: 0,
              y: extraLifeText.y - 40,
              scale: 1.3,
              duration: 1500,
              onComplete: () => extraLifeText.destroy(),
            });
          });
        }
        
        // IMPORTANT: Return here to prevent immediately triggering another whale event
        // in the same frame (since controlsReversed is now false)
        console.log('[WhaleManipulation] Cleanup complete, returning to prevent re-trigger');
        return;
        }
      }
      
      // Update whale leader position (whale gets closer as player collects bubbles)
      if (this.whaleTrailActive && this.whaleLeader) {
        // Update whale visual position with perspective
        // whaleLeaderZ is updated in onWhaleTrailBubbleCollected based on progress
        const e = Math.max(0, Math.min(1, this.whaleLeaderZ / this.zFar));
        const laneFactor = Phaser.Math.Linear(1, this.farLaneFactor, e);
        const x = this.centerX + (this.whaleLeaderLane - 1) * this.laneWidth * laneFactor;
        const y = Phaser.Math.Linear(this.nearY, this.horizonY, e);
        const scale = Phaser.Math.Linear(1.2, 0.15, e); // Bigger when closer, very small when far
        
        this.whaleLeader.setPosition(x, y);
        this.whaleLeader.setScale(scale);
        this.whaleLeader.setAlpha(Phaser.Math.Linear(1, 0.4, e));
        
        // Add gentle swimming animation (bob up/down, wiggle side to side)
        this.whaleLeader.y += Math.sin(this.time.now / 150) * 3;
        this.whaleLeader.x += Math.sin(this.time.now / 300) * 2;
        
        // Check if any bubble was missed (went past player without being collected)
        this.checkWhaleTrailMissedBubbles();
      }

      // Check if whale events should unlock (requires using boosts + distance)
      const state = useGameStore.getState();
      if (!this.whaleEventsUnlocked) {
        // Whale trail only activates after 4 boosts used AND traveled far enough
        if (state.boostsUsed >= 4 && this.distance >= 4000) {
          this.whaleEventsUnlocked = true;
          this.nextWhaleEventDistance = this.distance + Phaser.Math.Between(300, 600); // First event soon after unlock
          
          // Announce whale events unlocked
          const unlockText = this.add.text(this.centerX, this.scale.height / 2 - 80, '🐋 WHALE ZONE ENTERED 🐋', {
            fontSize: '24px',
            fontFamily: 'Arial Black',
            color: '#00aaff',
            stroke: '#000033',
            strokeThickness: 5,
            align: 'center',
          }).setOrigin(0.5).setDepth(1000);
          
          this.tweens.add({
            targets: unlockText,
            alpha: 0,
            y: unlockText.y - 40,
            duration: 2000,
            onComplete: () => unlockText.destroy(),
          });
        }
        return; // Don't trigger events until unlocked
      }

      // Trigger new whale event at distance threshold
      // Alternate between whale trail (bonus) and whale manipulation (challenge)
      if (this.distance >= this.nextWhaleEventDistance && !this.controlsReversed && !this.whaleTrailActive) {
        // Check if we should trigger a trail or manipulation based on boost count
        const canTriggerTrail = state.boostsUsed >= this.whaleTrailBoostThreshold && !this.lastWhaleEventWasTrail;
        const canTriggerManipulation = state.boostsUsed >= this.whaleManipulationBoostThreshold && this.lastWhaleEventWasTrail;
        
        if (canTriggerTrail) {
          console.log(`[WhaleTrail] Boost threshold met (${state.boostsUsed} >= ${this.whaleTrailBoostThreshold})`);
          this.triggerWhaleTrail();
          this.lastWhaleEventWasTrail = true;
          // Increase threshold for next trail (need to use more boosts each time)
          this.whaleTrailBoostThreshold += 6;
          // Distance will be set in completeWhaleTrail/failWhaleTrail AFTER trail ends
        } else if (canTriggerManipulation) {
          console.log(`[WhaleManipulation] Boost threshold met (${state.boostsUsed} >= ${this.whaleManipulationBoostThreshold})`);
          this.triggerWhaleAlert();
          this.lastWhaleEventWasTrail = false;
          // Increase threshold for next manipulation (need 6 more boosts each time)
          this.whaleManipulationBoostThreshold += 6;
          // Wait a while before next event
          this.nextWhaleEventDistance = this.distance + Phaser.Math.Between(2000, 3000);
        }
      }
    } catch (e) {
      console.error('[WhaleEvents] Error in update:', e);
    }
  }

  updateTradingChart(dt: number) {
    if (!this.chartGraphics) return;
    
    const state = useGameStore.getState();
    const currentScore = state.score;
    
    // Update chart every 0.2 seconds to keep it smooth but not too expensive
    this.chartUpdateTimer += dt;
    if (this.chartUpdateTimer >= 0.2) {
      this.chartUpdateTimer = 0;
      
      // Add current score to chart data
      this.chartData.push(currentScore);
      
      // Keep only last 60 data points (12 seconds at 0.2s intervals)
      if (this.chartData.length > 60) {
        this.chartData.shift();
      }
      
      this.lastChartScore = currentScore;
    }
    
    // Redraw chart every frame for smooth appearance
    this.drawTradingChart();
  }

  drawTradingChart() {
    if (!this.chartGraphics) return;
    
    this.chartGraphics.clear();
    
    // Chart dimensions and position (left side, below wallet and background text)
    const chartWidth = 160;
    const chartHeight = 70;
    const chartX = 10;
    const chartY = 180; // Below wallet box and PUMP text
    const padding = 6;
    
    // Background with border
    this.chartGraphics.fillStyle(0x000000, 0.6);
    this.chartGraphics.fillRoundedRect(chartX, chartY, chartWidth, chartHeight, 4);
    this.chartGraphics.lineStyle(1, 0x00ff00, 0.4);
    this.chartGraphics.strokeRoundedRect(chartX, chartY, chartWidth, chartHeight, 4);
    
    // Draw grid lines for trading chart feel
    this.chartGraphics.lineStyle(1, 0x00ff00, 0.1);
    const graphHeight = chartHeight - padding * 2;
    const graphX = chartX + padding;
    const graphY = chartY + padding;
    for (let i = 1; i < 4; i++) {
      const y = graphY + (graphHeight / 4) * i;
      this.chartGraphics.lineBetween(graphX, y, chartX + chartWidth - padding, y);
    }
    
    // Need at least 2 points to draw a line
    if (this.chartData.length < 2) return;
    
    // Find min/max for scaling
    const minScore = Math.min(...this.chartData);
    const maxScore = Math.max(...this.chartData);
    const scoreRange = maxScore - minScore || 1; // Avoid division by zero
    
    // Draw the line chart - builds from LEFT to RIGHT
    const graphWidth = chartWidth - padding * 2;
    const maxPoints = 60; // Max points we'll show
    const pointSpacing = graphWidth / maxPoints; // Fixed spacing per point
    
    for (let i = 0; i < this.chartData.length - 1; i++) {
      // Points build from left side, each point has fixed spacing
      const x1 = graphX + i * pointSpacing;
      const x2 = graphX + (i + 1) * pointSpacing;
      
      // Don't draw beyond chart bounds
      if (x2 > chartX + chartWidth - padding) break;
      
      const y1 = graphY + graphHeight - ((this.chartData[i] - minScore) / scoreRange) * graphHeight;
      const y2 = graphY + graphHeight - ((this.chartData[i + 1] - minScore) / scoreRange) * graphHeight;
      
      // Color the line segment based on direction (green for up, red for down)
      if (this.chartData[i + 1] < this.chartData[i] * 0.95) {
        // Significant drop (5% or more) - red
        this.chartGraphics.lineStyle(2, 0xff3333, 1);
      } else if (this.chartData[i + 1] > this.chartData[i] * 1.1) {
        // Big spike (10% or more, like whale catch) - bright cyan-green
        this.chartGraphics.lineStyle(3, 0x00ffaa, 1);
      } else {
        // Normal uptrend - green
        this.chartGraphics.lineStyle(2, 0x00ff00, 0.9);
      }
      
      this.chartGraphics.lineBetween(x1, y1, x2, y2);
    }
    
    // Draw a small dot at the current position (rightmost point)
    if (this.chartData.length > 0) {
      const lastIndex = this.chartData.length - 1;
      const lastX = graphX + lastIndex * pointSpacing;
      if (lastX <= chartX + chartWidth - padding) {
        const lastY = graphY + graphHeight - ((this.chartData[lastIndex] - minScore) / scoreRange) * graphHeight;
        this.chartGraphics.fillStyle(0x00ff00, 1);
        this.chartGraphics.fillCircle(lastX, lastY, 3);
      }
    }
  }

  addChartDip(severity: 'shield' | 'extralife') {
    // Add a dramatic dip to the chart when shield or extra life saves the player
    const state = useGameStore.getState();
    const currentScore = state.score;
    
    // Calculate dip amount based on severity - more dramatic drops
    const dipPercent = severity === 'shield' ? 0.35 : 0.50; // 35% for shield, 50% for extra life
    const dippedScore = Math.max(0, currentScore * (1 - dipPercent));
    
    // Add multiple points to show the crash and slow recovery
    // First: sharp drop down
    this.chartData.push(currentScore * 0.85); // Start dropping
    this.chartData.push(currentScore * 0.6);  // Keep falling
    this.chartData.push(dippedScore);          // Bottom of the dip
    this.chartData.push(dippedScore);          // Stay at bottom briefly
    this.chartData.push(dippedScore * 1.05);   // Tiny recovery
    this.chartData.push(dippedScore * 1.08);   // Slow climb back
    
    // Keep only last 60 data points
    while (this.chartData.length > 60) {
      this.chartData.shift();
    }
    
    // Redraw immediately to show the dip
    this.drawTradingChart();
  }

  addChartSpike() {
    // Add a dramatic spike when whale is caught - zig-zag then parabolic up
    const state = useGameStore.getState();
    const currentScore = state.score;
    const baseScore = this.chartData[this.chartData.length - 1] || currentScore * 0.8;
    
    // Zig-zag pattern going up
    this.chartData.push(baseScore * 1.1);   // Up
    this.chartData.push(baseScore * 1.05);  // Slight dip
    this.chartData.push(baseScore * 1.2);   // Up more
    this.chartData.push(baseScore * 1.15);  // Slight dip
    this.chartData.push(baseScore * 1.35);  // Up more
    this.chartData.push(baseScore * 1.3);   // Tiny dip
    
    // Parabolic spike up!
    this.chartData.push(baseScore * 1.5);   // Accelerating
    this.chartData.push(baseScore * 1.8);   // Faster
    this.chartData.push(baseScore * 2.2);   // Even faster
    this.chartData.push(currentScore);       // Peak at actual score
    
    // Keep only last 60 data points
    while (this.chartData.length > 60) {
      this.chartData.shift();
    }
    
    // Redraw immediately to show the spike
    this.drawTradingChart();
    
    // Flash green "RUNNER" text on chart
    this.flashChartText();
  }

  flashChartText() {
    // Flash green text over the chart when whale is caught
    const chartX = 10;
    const chartY = 180;
    const chartWidth = 160;
    const chartHeight = 70;
    
    const flashText = this.add.text(chartX + chartWidth / 2, chartY + chartHeight / 2, '🚀 MOON!', {
      fontSize: '20px',
      fontFamily: 'Arial Black',
      color: '#00ff00',
      stroke: '#003300',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1000);
    
    // Pulse and fade animation
    this.tweens.add({
      targets: flashText,
      scale: { from: 0.5, to: 1.5 },
      alpha: { from: 1, to: 0 },
      duration: 800,
      ease: 'Power2',
      onComplete: () => flashText.destroy(),
    });
  }

  addChartCrash() {
    // When player dies - dramatic crash to flat red line at absolute bottom
    const state = useGameStore.getState();
    const currentScore = state.score || this.chartData[this.chartData.length - 1] || 100;
    
    // Find the minimum value in existing data to ensure crash goes BELOW it
    const minInChart = Math.min(...this.chartData, currentScore);
    const crashBottom = -minInChart * 0.1; // Go slightly negative to ensure it's at the very bottom
    
    // Add rapid crash points - steep drop
    this.chartData.push(currentScore * 0.5);   // Start crashing hard
    this.chartData.push(currentScore * 0.2);   // Keep falling
    this.chartData.push(currentScore * 0.05);  // Almost at bottom
    this.chartData.push(crashBottom);           // Hit absolute bottom
    
    // Add flat line at bottom - but only enough to show crash while keeping some green visible
    // Fill about 15-20 more points (not the whole chart)
    for (let i = 0; i < 18; i++) {
      this.chartData.push(crashBottom);
    }
    
    // Keep only last 60 data points - this preserves some green on the left
    while (this.chartData.length > 60) {
      this.chartData.shift();
    }
    
    // Redraw to show the crash
    this.drawTradingChart();
  }

  triggerWhaleAlert() {
    try {
      console.log('[WhaleManipulation] Triggering whale manipulation');
      this.controlsReversed = true;
      isControlsReversed = true; // Update module-level variable for swipe handlers
      this.whaleAlertTimer = 4; // 4 seconds of reversed controls (countdown in seconds)
      
      // Show warning text with blinking red exclamation marks (slightly smaller on mobile)
      const device = getDevice();
      const fontSize = device.isMobile ? '24px' : '28px'; // Just a tiny bit smaller on mobile
      const exclaimSize = device.isMobile ? '28px' : '32px';
      const exclaimOffset = device.isMobile ? 140 : 155;
      
      this.whaleAlertText = this.add.text(this.centerX, this.scale.height / 2 - 50, '🐋 WHALE MANIPULATION 🐋\nCONTROLS REVERSED!', {
        fontSize: fontSize,
        fontFamily: 'Arial Black',
        color: '#00aaff',
        stroke: '#000033',
        strokeThickness: 6,
        align: 'center',
      }).setOrigin(0.5).setDepth(1000);
      
      // Add blinking red exclamation marks
      this.whaleExclaim1 = this.add.text(this.centerX - exclaimOffset, this.scale.height / 2 - 65, '❗', {
        fontSize: exclaimSize,
        color: '#ff0000',
      }).setOrigin(0.5).setDepth(1001);
      
      this.whaleExclaim2 = this.add.text(this.centerX + exclaimOffset, this.scale.height / 2 - 65, '❗', {
        fontSize: exclaimSize,
        color: '#ff0000',
      }).setOrigin(0.5).setDepth(1001);
      
      // Blink the exclamation marks red
      this.tweens.add({
        targets: [this.whaleExclaim1, this.whaleExclaim2],
        alpha: 0,
        duration: 150,
        yoyo: true,
        repeat: 12,
        onComplete: () => {
          if (this.whaleExclaim1) {
            this.whaleExclaim1.destroy();
            this.whaleExclaim1 = null;
          }
          if (this.whaleExclaim2) {
            this.whaleExclaim2.destroy();
            this.whaleExclaim2 = null;
          }
        }
      });
      
      // Flash effect on main text
      this.tweens.add({
        targets: this.whaleAlertText,
        alpha: 0.3,
        duration: 200,
        yoyo: true,
        repeat: 8,
      });
      
      // Tint screen blue briefly
      const overlay = this.add.rectangle(this.centerX, this.scale.height / 2, this.scale.width, this.scale.height, 0x0066ff, 0.3);
      overlay.setDepth(999);
      this.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: 500,
        onComplete: () => overlay.destroy(),
      });
    } catch (e) {
      console.error('[WhaleAlert] Error:', e);
      this.controlsReversed = false;
      isControlsReversed = false;
    }
  }

  triggerWhaleTrail() {
    try {
      this.whaleTrailActive = true;
      this.whaleTrailProgress = 0;
      this.whaleTrailStartTime = this.time.now;
      this.whaleTrailBubbles = [];
      
      // Clear ALL existing collectibles and boosts from the track - only pits remain
      this.clearTrackForWhaleTrail();
      
      // Generate a bubble trail path that starts near player and goes far
      // Path weaves across lanes, avoiding pits
      this.generateWhaleTrailPath();
      
      // Spawn all bubbles along the path
      this.spawnWhaleTrailBubbles();
      
      // Spawn whale FAR away at the horizon (where objects spawn)
      this.whaleStartZ = this.zFar * 0.95; // Very far, near spawn point
      this.whaleLeaderZ = this.whaleStartZ;
      this.whaleLeaderLane = this.whaleTrailPath[this.whaleTrailPath.length - 1]?.lane ?? 1;
      
      // Create the whale sprite (starts tiny because it's far)
      this.whaleLeader = this.add.sprite(this.centerX, this.horizonY, 'whale-leader');
      this.whaleLeader.setDepth(100);
      this.whaleLeader.setScale(0.15); // Very small (far away)
      
      // Show chase message (longer on mobile for more reaction time)
      const device = getDevice();
      const trailText = this.add.text(this.centerX, this.scale.height / 2 - 50, '🐋 FOLLOW THE TRAIL! 🐋\nCATCH THE WHALE!', {
        fontSize: device.isMobile ? '20px' : '24px',
        fontFamily: 'Arial Black',
        color: '#88ffff',
        stroke: '#003333',
        strokeThickness: 5,
        align: 'center',
      }).setOrigin(0.5).setDepth(1000);
      
      this.tweens.add({
        targets: trailText,
        alpha: 0,
        y: trailText.y - 50,
        duration: device.isMobile ? 2500 : 1500, // Longer on mobile
        onComplete: () => trailText.destroy(),
      });
    } catch (e) {
      console.error('[WhaleTrail] Error:', e);
      this.whaleTrailActive = false;
    }
  }

  generateWhaleTrailPath() {
    // Generate a path of 10 bubbles from near player to far away
    // Path weaves across lanes, avoiding pits
    this.whaleTrailPath = [];
    const numBubbles = 10;
    
    // On mobile, start bubbles further away to give player more time to see and react
    const device = getDevice();
    const startZ = device.isMobile ? 350 : 150; // Mobile: further away for more reaction time
    const endZ = this.zFar * 0.85; // End far away
    const zStep = (endZ - startZ) / (numBubbles - 1);
    
    let currentLane = this.player.laneIndex; // Start in player's lane
    
    for (let i = 0; i < numBubbles; i++) {
      const z = startZ + (i * zStep);
      
      // Find a safe lane (no pit) at this z position
      let safeLane = this.findSafeLaneAt(z, currentLane);
      
      this.whaleTrailPath.push({ lane: safeLane, z: z });
      
      // For next bubble, try to change lanes (weave across) but prefer adjacent lanes
      if (i < numBubbles - 1) {
        const nextZ = startZ + ((i + 1) * zStep);
        // Try to move to an adjacent lane for variety
        const possibleMoves = [-1, 0, 1];
        const shuffled = possibleMoves.sort(() => Math.random() - 0.5);
        
        for (const move of shuffled) {
          const testLane = Math.max(0, Math.min(2, safeLane + move));
          if (!this.isPitAtPosition(testLane, nextZ)) {
            currentLane = testLane;
            break;
          }
        }
      }
    }
  }
  
  findSafeLaneAt(z: number, preferredLane: number): number {
    // Find a lane without a pit at this z, preferring the given lane
    if (!this.isPitAtPosition(preferredLane, z)) {
      return preferredLane;
    }
    
    // Try adjacent lanes
    const alternatives = [0, 1, 2].filter(lane => lane !== preferredLane);
    alternatives.sort((a, b) => Math.abs(a - preferredLane) - Math.abs(b - preferredLane));
    
    for (const lane of alternatives) {
      if (!this.isPitAtPosition(lane, z)) {
        return lane;
      }
    }
    
    // If all lanes have pits, return preferred (player will have to jump/slide)
    return preferredLane;
  }
  
  spawnWhaleTrailBubbles() {
    // Spawn all bubbles along the pre-generated path
    for (let i = 0; i < this.whaleTrailPath.length; i++) {
      const point = this.whaleTrailPath[i];
      const spawned = this.spawner.spawn('collectible', point.lane, point.z, 'item-bubble');
      
      if (spawned && spawned.sprite) {
        spawned.sprite.setData('isWhaleTrail', true);
        spawned.sprite.setData('bubbleIndex', i);
        spawned.sprite.setTint(0xffffff); // White bubbles
        spawned.sprite.setScale(i === 0 ? 1.2 : 0.9); // First bubble bigger
        spawned.sprite.setAlpha(0.95);
        this.whaleTrailBubbles.push(spawned.sprite);
      }
    }
  }
  
  isPitAtPosition(lane: number, z: number): boolean {
    // Check if there's a pit obstacle at the given lane and z position
    const zTolerance = 120; // Check within this z range
    let foundPit = false;
    
    this.spawner.group.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      
      const key = sprite.texture.key;
      if (key !== 'obstacle-block') return; // Only check pits
      
      const spriteLane = sprite.getData('lane') as number;
      const spriteZ = sprite.getData('z') as number;
      
      if (spriteLane === lane && Math.abs(spriteZ - z) < zTolerance) {
        foundPit = true;
      }
    });
    
    return foundPit;
  }
  
  clearTrackForWhaleTrail() {
    // Remove ALL collectibles and boosts from the track - only keep pits (obstacle-block)
    const toDestroy: Phaser.Physics.Arcade.Sprite[] = [];
    
    this.spawner.group.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      
      const key = sprite.texture.key;
      
      // Keep pits (obstacle-block), destroy everything else
      if (key !== 'obstacle-block') {
        toDestroy.push(sprite);
      }
    });
    
    toDestroy.forEach(sprite => sprite.destroy());
  }
  
  checkWhaleTrailMissedBubbles() {
    // Check if the bubble the player needs to collect has gone past them
    if (!this.whaleTrailActive) return;
    if (this.whaleTrailProgress >= this.whaleTrailPath.length) return;
    
    // Find the current bubble player needs to collect
    for (const bubble of this.whaleTrailBubbles) {
      if (!bubble.active) continue;
      
      const bubbleIndex = bubble.getData('bubbleIndex') as number;
      if (bubbleIndex !== this.whaleTrailProgress) continue;
      
      // This is the bubble they need - check if it went past
      const z = bubble.getData('z') as number;
      if (z < -50) {
        // Bubble went past player without being collected - trail lost!
        this.failWhaleTrail();
        return;
      }
    }
  }

  onWhaleTrailBubbleCollected(bubbleIndex: number) {
    // Check if this is the correct bubble in sequence
    if (bubbleIndex !== this.whaleTrailProgress) {
      // Wrong bubble - player skipped one, trail lost!
      this.failWhaleTrail();
      return;
    }
    
    // Correct bubble! Progress the trail
    this.whaleTrailProgress++;
    
    // Show progress popup
    const total = this.whaleTrailPath.length;
    this.showBoostPopup(this.player.x, this.player.y - 40, `${this.whaleTrailProgress}/${total} 🐋`, 0x88ffff);
    
    // Move whale closer based on progress (lerp from far to catchable)
    const progress = this.whaleTrailProgress / total;
    const targetZ = 150; // Where whale can be caught
    this.whaleLeaderZ = Phaser.Math.Linear(this.whaleStartZ, targetZ, progress);
    
    // Check if trail complete - whale caught!
    if (this.whaleTrailProgress >= total) {
      this.completeWhaleTrail();
    }
  }

  completeWhaleTrail() {
    this.whaleTrailActive = false;
    this.whaleTrailCompleted = true; // Allow whale alerts after first trail
    this.whaleTrailBubbles = []; // Clear bubble references
    
    // Set next whale event FAR in the future (back to normal gameplay for a long time)
    this.nextWhaleEventDistance = this.distance + Phaser.Math.Between(3000, 5000);
    
    // Destroy the whale leader with a catch animation
    if (this.whaleLeader) {
      const whale = this.whaleLeader;
      this.tweens.add({
        targets: whale,
        scale: 2,
        alpha: 0,
        duration: 500,
        onComplete: () => whale.destroy(),
      });
      this.whaleLeader = null;
    }
    
    // Clean up any remaining trail bubbles
    const toDestroy: Phaser.Physics.Arcade.Sprite[] = [];
    this.spawner.group.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (sprite.getData('isWhaleTrail')) {
        toDestroy.push(sprite);
      }
    });
    toDestroy.forEach(sprite => sprite.destroy());
    
    // Show success message
    const successText = this.add.text(this.centerX, this.scale.height / 2, '🐋 WHALE CAUGHT! 🐋', {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5).setDepth(1000);
    
    this.tweens.add({
      targets: successText,
      scale: 1.5,
      alpha: 0,
      duration: 1000,
      onComplete: () => successText.destroy(),
    });
    
    // Spawn the rare whale token reward in player's lane
    const spawned = this.spawner.spawn('collectible', this.player.laneIndex, 300, 'item-whale');
    if (spawned && spawned.sprite) {
      spawned.sprite.setData('isWhaleToken', true);
      spawned.sprite.setScale(1.5);
      
      // Make it sparkle
      this.tweens.add({
        targets: spawned.sprite,
        angle: 360,
        duration: 2000,
        repeat: -1,
      });
    }
  }

  failWhaleTrail() {
    this.whaleTrailActive = false;
    this.whaleTrailCompleted = true; // Allow whale alerts after first trail (even if failed)
    this.whaleTrailBubbles = []; // Clear bubble references
    
    // Set next whale event FAR in the future (back to normal gameplay for a long time)
    this.nextWhaleEventDistance = this.distance + Phaser.Math.Between(3000, 5000);
    
    // Whale escapes - animate it swimming away
    if (this.whaleLeader) {
      const whale = this.whaleLeader;
      this.tweens.add({
        targets: whale,
        y: whale.y - 100,
        scale: 0.1,
        alpha: 0,
        duration: 800,
        onComplete: () => whale.destroy(),
      });
      this.whaleLeader = null;
    }
    
    // Remove remaining bubbles - collect first, then destroy to avoid mutation during iteration
    const toDestroy: Phaser.Physics.Arcade.Sprite[] = [];
    this.spawner.group.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (sprite.getData('isWhaleTrail')) {
        toDestroy.push(sprite);
      }
    });
    toDestroy.forEach(sprite => sprite.destroy());
    
    // Show fail message
    const failText = this.add.text(this.centerX, this.scale.height / 2, '🐋 WHALE ESCAPED! 🐋', {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5).setDepth(1000);
    
    this.tweens.add({
      targets: failText,
      alpha: 0,
      y: failText.y - 30,
      duration: 1000,
      onComplete: () => failText.destroy(),
    });
  }

  checkCollisions() {
    const playerLane = this.player.laneIndex;
    const pBounds = this.player.getBounds();
    const feetY = pBounds.bottom;

    this.spawner.group.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;

      const lane = (sprite.getData('lane') as number) ?? 1;
      if (lane !== playerLane) return;

      const z = (sprite.getData('z') as number) ?? 99999;

      // Only consider entities near the player.
      if (z > 130) return;
      if (z < -120) return;

      const key = sprite.texture.key;

      if (key.startsWith('item-')) {
        // Collectibles: trigger burst when closer to the player (lower z = closer)
        if (z > 60) return;
        
        // Check if this is a whale trail bubble
        if (sprite.getData('isWhaleTrail')) {
          const bubbleIndex = sprite.getData('bubbleIndex') as number;
          this.onWhaleTrailBubbleCollected(bubbleIndex);
          sprite.destroy();
          return;
        }
        
        // Check if this is the whale token reward
        if (sprite.getData('isWhaleToken')) {
          this.collectWhaleToken(sprite.x, sprite.y);
          sprite.destroy();
          return;
        }
        
        this.collectItem(key.replace('item-', ''), sprite.x, sprite.y);
        sprite.destroy();
        return;
      }

      if (key.startsWith('boost-')) {
        // Boosts: trigger when close
        if (z > 60) return;
        this.collectBoost(key.replace('boost-', ''), sprite.x, sprite.y);
        sprite.destroy();
        return;
      }

      // Pit (with RUG PULL label): ONLY kill when the pit is actually under the player's FEET (not head/shoulder overlap) and the player isn't jumping.
      if (key === 'obstacle-block') {
        // Skip if player is jumping
        if (this.player.isJumping) return;
        
        // Skip if player is invincible (recently saved by shield)
        if (this.time.now < this.invincibleUntil) {
          console.log('[INVINCIBLE] Skipping pit collision');
          return;
        }

        // Check when pit reaches the player's feet
        // Widen the z window so we can detect collision as pits pass through
        if (z > 50) return;  // Too far away
        if (z < -100) return; // Too far past (already off screen)

        // Simplified collision: check if pit's bottom edge overlaps player's feet area
        const pitBounds = sprite.getBounds();
        const playerBounds = this.player.getBounds();
        
        const pitBottom = pitBounds.bottom;
        const playerFeetTop = playerBounds.bottom - 15;  // Top of feet area
        const playerFeetBottom = playerBounds.bottom;    // Bottom of feet
        
        // Check X overlap (same lane)
        const xOverlap = Math.abs(pitBounds.centerX - playerBounds.centerX) < Math.max(pitBounds.width, 24) / 2;
        
        // Check Y overlap (pit bottom in feet area)
        const yOverlap = pitBottom >= playerFeetTop && pitBottom <= playerFeetBottom + 5;
        
        if (!xOverlap || !yOverlap) {
          return;
        }
        
        console.log('[PIT COLLISION] Triggering game over check...');

        this.triggerGameOver();
        return;
      }


    });
  }

  collectItem(type: string, x: number, y: number) {
    const result = gameActions.addCollectibleScore(type);
    
    // Particle color by tier
    const tierColors: Record<string, number> = {
      common: 0xffd700,
      uncommon: 0xff9500,
      rare: 0x00d4ff,
      legendary: 0xb84dff,
    };
    const color = tierColors[result.tier] || 0xffd700;
    spawnSpark(this, x, y, color);
    
    // Show score popup
    this.showScorePopup(x, y, result.points, result.combo > 1 ? result.combo : undefined);
  }

  collectWhaleToken(x: number, y: number) {
    // Whale token is worth massive points!
    const points = 500;
    const state = useGameStore.getState();
    const multiplier = state.activeBoost === 'double' ? 2 : 1;
    const totalPoints = points * multiplier * state.multiplier;
    
    useGameStore.setState({
      score: state.score + totalPoints,
      collectibleScore: state.collectibleScore + totalPoints,
      tokens: state.tokens + 1,
      whaleTokens: state.whaleTokens + 1,
    });
    
    // Add chart spike for whale catch!
    this.addChartSpike();
    
    // Big sparkle effect
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        spawnSpark(this, x + Phaser.Math.Between(-30, 30), y + Phaser.Math.Between(-30, 30), 0x00aaff);
      }, i * 100);
    }
    
    // Show big score popup
    this.showBoostPopup(x, y - 30, `🐋 +${Math.round(totalPoints)}!`, 0x00aaff);
  }

  collectBoost(type: string, x: number, y: number) {
    // Add boost to inventory instead of auto-activating
    const boostType = type as 'double' | 'shield' | 'magnet';
    gameActions.addBoostToInventory(boostType);
    
    // Show pickup feedback
    const boostNames: Record<string, string> = {
      double: '⚡ 2X [1/Q]',
      shield: '🛡️ SHIELD [2/E]',
      magnet: '🧲 MAGNET [3/R]',
    };
    const boostColors: Record<string, number> = {
      double: 0xffd700,
      shield: 0x00ffff,
      magnet: 0xff00ff,
    };
    
    this.showBoostPopup(x, y, boostNames[type] || '+BOOST', boostColors[type] || 0xffffff);
    spawnSpark(this, x, y, boostColors[type] || 0xffffff);
  }

  activateBoostFromInventory(type: 'double' | 'shield' | 'magnet') {
    const success = gameActions.activateBoostFromInventory(type);
    
    if (success) {
      // Show activation feedback
      const boostNames: Record<string, string> = {
        double: '⚡ 2X ACTIVATED!',
        shield: '🛡️ SHIELD ON!',
        magnet: '🧲 MAGNET ON!',
      };
      const boostColors: Record<string, number> = {
        double: 0xffd700,
        shield: 0x00ffff,
        magnet: 0xff00ff,
      };
      
      this.showBoostPopup(this.player.x, this.player.y - 40, boostNames[type], boostColors[type]);
      spawnSpark(this, this.player.x, this.player.y, boostColors[type]);
    }
  }

  showScorePopup(x: number, y: number, points: number, combo?: number) {
    const text = combo && combo > 1 
      ? `+${points} x${combo}` 
      : `+${points}`;
    
    const color = combo && combo > 3 ? '#ff00ff' : combo && combo > 1 ? '#00ffff' : '#ffd700';
    
    const popup = this.add.text(x, y - 20, text, {
      fontSize: combo && combo > 3 ? '18px' : '14px',
      fontFamily: 'Arial Black',
      color: color,
      stroke: '#000000',
      strokeThickness: 3,
    });
    popup.setOrigin(0.5);
    popup.setDepth(100);

    this.tweens.add({
      targets: popup,
      y: y - 60,
      alpha: 0,
      scale: 1.3,
      duration: 800,
      ease: 'Power2',
      onComplete: () => popup.destroy(),
    });
  }

  showBoostPopup(x: number, y: number, text: string, color: number) {
    const colorStr = '#' + color.toString(16).padStart(6, '0');
    const popup = this.add.text(x, y - 30, text, {
      fontSize: '20px',
      fontFamily: 'Arial Black',
      color: colorStr,
      stroke: '#000000',
      strokeThickness: 4,
    });
    popup.setOrigin(0.5);
    popup.setDepth(100);

    this.tweens.add({
      targets: popup,
      y: y - 80,
      alpha: 0,
      scale: 1.5,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => popup.destroy(),
    });
  }

  triggerGameOver() {
    if (!this.runActive) return;
    
    // Check for shield first
    if (gameActions.useShield()) {
      console.log('[SHIELD] Shield saved the player!');
      
      // Add chart dip for shield save
      this.addChartDip('shield');
      
      // Shield absorbed the hit! Show effect and continue
      this.showBoostPopup(this.player.x, this.player.y - 50, '🛡️ SHIELD SAVED!', 0x00ffff);
      spawnSpark(this, this.player.x, this.player.y, 0x00ffff);
      
      // Grant 1 second of invincibility so the same pit doesn't kill us
      this.invincibleUntil = this.time.now + 1000;
      console.log('[SHIELD] Invincible until:', this.invincibleUntil);
      
      // Brief invincibility flash effect
      this.tweens.add({
        targets: this.player.sprite,
        alpha: 0.3,
        duration: 100,
        yoyo: true,
        repeat: 5,
      });
      return;
    }
    
    // Check for extra life from surviving whale manipulation
    if (this.hasExtraLife) {
      console.log('[EXTRA LIFE] Extra life saved the player!');
      this.hasExtraLife = false; // Use up the extra life
      
      // Add chart dip for extra life usage
      this.addChartDip('extralife');
      
      // Show extra life used message
      this.showBoostPopup(this.player.x, this.player.y - 50, '💚 EXTRA LIFE USED!', 0x00ff00);
      spawnSpark(this, this.player.x, this.player.y, 0x00ff00);
      
      // Show explanation text
      const usedText = this.add.text(this.centerX, this.scale.height / 2 - 80, '💚 EXTRA LIFE KEPT YOU ALIVE! 💚', {
        fontSize: '22px',
        fontFamily: 'Arial Black',
        color: '#00ff00',
        stroke: '#003300',
        strokeThickness: 4,
        align: 'center',
      }).setOrigin(0.5).setDepth(1000);
      
      this.tweens.add({
        targets: usedText,
        alpha: 0,
        y: usedText.y - 40,
        duration: 2000,
        onComplete: () => usedText.destroy(),
      });
      
      // Grant 1.5 seconds of invincibility
      this.invincibleUntil = this.time.now + 1500;
      
      // Flash effect
      this.tweens.add({
        targets: this.player.sprite,
        alpha: 0.3,
        duration: 100,
        yoyo: true,
        repeat: 7,
      });
      return;
    }
    
    console.log('[GAME OVER] No shield or extra life - player died');
    
    // Crash the trading chart to flat red line
    this.addChartCrash();
    
    this.runActive = false;
    const state = useGameStore.getState();
    const best = Math.max(state.best, state.score);
    localStorage.setItem('trench-best', String(best));
    useGameStore.setState({ phase: 'gameover', best });
  }
}