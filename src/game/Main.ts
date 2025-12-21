import Phaser from 'phaser';
import Player from './entities/Player';
import Spawner from './entities/Obstacles';
import { useGameStore, gameActions } from '../utils/store';
import { spawnSpark } from '../utils/particles';

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

  // Whale events
  private controlsReversed = false;
  private whaleAlertUntil = 0;
  private whaleAlertText: Phaser.GameObjects.Text | null = null;
  private whaleEventsUnlocked = false; // Whale events only after player has used boosts
  private nextWhaleEventDistance = 0; // Set when unlocked
  private whaleTrailCompleted = false; // First event is always trail, then alerts can happen
  
  // Whale trail
  private whaleTrailActive = false;
  private whaleTrailBubbles: string[] = []; // Keys of bubbles in order
  private whaleTrailProgress = 0;
  private whaleTrailLanes: number[] = []; // Lane pattern for trail

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

    // Swipe events
    this.game.events.on('input:jump', () => this.player.jump());
    this.game.events.on('input:slide', () => this.player.slide());
    this.game.events.on('input:left', () => this.player.moveLane(this.controlsReversed ? 1 : -1));
    this.game.events.on('input:right', () => this.player.moveLane(this.controlsReversed ? -1 : 1));

    // Start
    this.speed = 250;
    this.distance = 0;
    this.nextSpawnDistance = 100;
    this.nextBoostDistance = 600 + Math.random() * 400; // First boost after 600-1000m
    this.runActive = true;
    this.scorePopups = [];
    this.invincibleUntil = 0;

    gameActions.startRun();

    this.scale.on('resize', this.handleResize, this);
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
    while (this.distance >= this.nextSpawnDistance) {
      const chunk = pickChunk();

      // Spawn very close to the horizon so they immediately start moving toward the player.
      const zBase = this.zFar * Phaser.Math.FloatBetween(0.94, 0.99);

      chunk.obstacles.forEach((o) => {
        o.lanes.forEach((lane) => {
          this.spawner.spawn(o.type, lane, zBase);
        });
      });

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
      // Check if whale alert should end
      if (this.controlsReversed && this.time.now > this.whaleAlertUntil) {
        this.controlsReversed = false;
        if (this.whaleAlertText) {
          this.whaleAlertText.destroy();
          this.whaleAlertText = null;
        }
      }

      // Check if any whale trail bubbles were missed (went past player)
      if (this.whaleTrailActive && this.spawner?.group) {
        let shouldFail = false;
        const children = [...this.spawner.group.getChildren()]; // Copy array to avoid mutation issues
        
        for (const child of children) {
          const sprite = child as Phaser.Physics.Arcade.Sprite;
          if (!sprite.active || !sprite.getData('isWhaleTrail')) continue;
          
          const z = sprite.getData('z') as number;
          const bubbleIndex = sprite.getData('bubbleIndex') as number;
          
          // If bubble is behind player and not yet collected
          if (z < -50 && bubbleIndex >= this.whaleTrailProgress) {
            shouldFail = true;
            break;
          }
        }
        
        if (shouldFail) {
          this.failWhaleTrail();
        }
      }

      // Check if whale events should unlock (requires using boosts + distance)
      const state = useGameStore.getState();
      if (!this.whaleEventsUnlocked) {
        // Unlock whale events after player has used 4+ boosts AND traveled 4000m+
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
      if (this.distance >= this.nextWhaleEventDistance && !this.controlsReversed && !this.whaleTrailActive) {
        // First event is always whale trail (bonus opportunity)
        // After that, randomly choose between alert and trail
        if (!this.whaleTrailCompleted) {
          // First event: always whale trail for bonus chance
          this.triggerWhaleTrail();
        } else {
          // After first trail: randomly choose (60% trail, 40% alert)
          const eventType = Math.random() < 0.6 ? 'trail' : 'alert';
          
          if (eventType === 'alert') {
            this.triggerWhaleAlert();
          } else {
            this.triggerWhaleTrail();
          }
        }
        
        // Next whale event in 800-1500m
        this.nextWhaleEventDistance = this.distance + Phaser.Math.Between(800, 1500);
      }
    } catch (e) {
      console.error('[WhaleEvents] Error in update:', e);
    }
  }

  triggerWhaleAlert() {
    try {
      this.controlsReversed = true;
      this.whaleAlertUntil = this.time.now + 4000; // 4 seconds of reversed controls
      
      // Show warning text
      this.whaleAlertText = this.add.text(this.centerX, this.scale.height / 2 - 50, '🐋 WHALE ALERT! 🐋\nCONTROLS REVERSED!', {
        fontSize: '28px',
        fontFamily: 'Arial Black',
        color: '#00aaff',
        stroke: '#000033',
        strokeThickness: 6,
        align: 'center',
      }).setOrigin(0.5).setDepth(1000);
      
      // Flash effect
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
    }
  }

  triggerWhaleTrail() {
    try {
      this.whaleTrailActive = true;
      this.whaleTrailProgress = 0;
      this.whaleTrailBubbles = [];
      
      // Generate a lane pattern for 6 bubbles
      this.whaleTrailLanes = [];
      let currentLane = this.player.laneIndex;
      for (let i = 0; i < 6; i++) {
        this.whaleTrailLanes.push(currentLane);
        // Randomly move to adjacent lane for next bubble
        const move = Phaser.Math.Between(-1, 1);
        currentLane = Math.max(0, Math.min(2, currentLane + move));
      }
      
      // Show trail starting message
      const trailText = this.add.text(this.centerX, this.scale.height / 2 - 50, '🐋 WHALE TRAIL! 🐋\nFOLLOW THE BUBBLES!', {
        fontSize: '24px',
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
        duration: 1500,
        onComplete: () => trailText.destroy(),
      });
      
      // Spawn the bubble trail
      this.spawnWhaleTrailBubbles();
    } catch (e) {
      console.error('[WhaleTrail] Error:', e);
      this.whaleTrailActive = false;
    }
  }

  spawnWhaleTrailBubbles() {
    try {
      const spacing = 150; // Z distance between bubbles
      
      for (let i = 0; i < this.whaleTrailLanes.length; i++) {
        const lane = this.whaleTrailLanes[i];
        const zOffset = 200 + (i * spacing); // Start further away, space them out
        
        const bubbleKey = `whale-bubble-${i}`;
        this.whaleTrailBubbles.push(bubbleKey);
        
        // Spawn bubble using spawner with custom texture
        const sprite = this.spawner.spawn('collectible', lane, zOffset, 'item-bubble');
        if (sprite) {
          sprite.setData('bubbleIndex', i);
          sprite.setData('isWhaleTrail', true);
          sprite.setName(bubbleKey);
          
          // Make trail bubbles glow
          sprite.setTint(0x88ffff);
        }
      }
    } catch (e) {
      console.error('[WhaleTrail] Error spawning bubbles:', e);
      this.whaleTrailActive = false;
    }
  }

  onWhaleTrailBubbleCollected(bubbleIndex: number) {
    if (bubbleIndex === this.whaleTrailProgress) {
      // Correct bubble! Progress the trail
      this.whaleTrailProgress++;
      
      // Show progress popup
      this.showBoostPopup(this.player.x, this.player.y - 40, `${this.whaleTrailProgress}/6`, 0x88ffff);
      
      if (this.whaleTrailProgress >= this.whaleTrailLanes.length) {
        // Trail complete! Spawn whale token reward
        this.completeWhaleTrail();
      }
    } else {
      // Wrong bubble or missed one - trail failed
      this.failWhaleTrail();
    }
  }

  completeWhaleTrail() {
    this.whaleTrailActive = false;
    this.whaleTrailCompleted = true; // Allow whale alerts after first trail
    
    // Show success message
    const successText = this.add.text(this.centerX, this.scale.height / 2, '🐋 WHALE INCOMING! 🐋', {
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
    
    // Spawn the rare whale token in player's lane
    const whaleSprite = this.spawner.spawn('collectible', this.player.laneIndex, 300, 'item-whale');
    whaleSprite.setData('isWhaleToken', true);
    whaleSprite.setScale(1.5);
    
    // Make it sparkle
    this.tweens.add({
      targets: whaleSprite,
      angle: 360,
      duration: 2000,
      repeat: -1,
    });
  }

  failWhaleTrail() {
    this.whaleTrailActive = false;
    this.whaleTrailCompleted = true; // Allow whale alerts after first trail (even if failed)
    
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
    const failText = this.add.text(this.centerX, this.scale.height / 2, '❌ TRAIL LOST ❌', {
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
    });
    
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
    
    // Check for shield
    if (gameActions.useShield()) {
      console.log('[SHIELD] Shield saved the player!');
      
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
    
    console.log('[GAME OVER] No shield - player died');
    this.runActive = false;
    const state = useGameStore.getState();
    const best = Math.max(state.best, state.score);
    localStorage.setItem('trench-best', String(best));
    useGameStore.setState({ phase: 'gameover', best });
  }
}