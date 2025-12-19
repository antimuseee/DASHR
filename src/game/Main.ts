import Phaser from 'phaser';
import Player from './entities/Player';
import Spawner from './entities/Obstacles';
import { useGameStore } from '../utils/store';
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
  runActive = false;
  centerX = 0;
  groundY = 0;
  laneWidth = 100;
  private keyHandler!: (e: KeyboardEvent) => void;
  private gridLines: Phaser.GameObjects.Graphics[] = [];
  private bgElements: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('Main');
  }

  create() {
    this.centerX = this.scale.width / 2;
    this.groundY = this.scale.height - 120;

    // CYBERPUNK BACKGROUND
    this.createBackground();
    
    // NEON GROUND with grid
    this.createGround();

    // Player
    this.player = new Player(this, this.centerX, this.groundY - 35, this.laneWidth);
    
    // Spawner
    this.spawner = new Spawner(this, this.centerX, this.laneWidth);

    // Keyboard
    this.keyHandler = (e: KeyboardEvent) => {
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
          this.player.moveLane(-1);
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          this.player.moveLane(1);
          break;
      }
    };
    document.addEventListener('keydown', this.keyHandler);

    // Swipe events
    this.game.events.on('input:jump', () => this.player.jump());
    this.game.events.on('input:slide', () => this.player.slide());
    this.game.events.on('input:left', () => this.player.moveLane(-1));
    this.game.events.on('input:right', () => this.player.moveLane(1));

    // Start
    this.speed = 250;
    this.distance = 0;
    this.nextSpawnDistance = 100;
    this.runActive = true;

    useGameStore.setState({ phase: 'running', score: 0, distance: 0, multiplier: 1, tokens: 0 });

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
      const sign = this.add.text(
        50 + (i * w / 4),
        80 + Math.random() * 100,
        text,
        { 
          fontSize: '24px',
          fontFamily: 'Arial Black',
          color: i % 2 === 0 ? '#ff00ff' : '#00ffff',
          stroke: '#000000',
          strokeThickness: 4,
        }
      );
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

    // Neon grid lines on ground (perspective effect)
    const grid = this.add.graphics();
    grid.lineStyle(2, 0xff00ff, 0.4);
    
    // Horizontal lines
    for (let i = 0; i < 8; i++) {
      const y = this.groundY + i * 15;
      const alpha = 0.4 - i * 0.04;
      grid.lineStyle(2, 0xff00ff, alpha);
      grid.lineBetween(0, y, w, y);
    }
    
    // Vertical lane dividers with glow
    const laneXs = [this.centerX - this.laneWidth, this.centerX, this.centerX + this.laneWidth];
    laneXs.forEach((x) => {
      grid.lineStyle(3, 0x00ffff, 0.3);
      grid.lineBetween(x, 0, x, this.groundY);
      grid.lineStyle(1, 0x00ffff, 0.6);
      grid.lineBetween(x, 0, x, this.groundY);
    });
    
    grid.setScrollFactor(0).setDepth(-5);

    // Glowing edge line
    const edgeLine = this.add.graphics();
    edgeLine.lineStyle(4, 0x00ffff, 0.8);
    edgeLine.lineBetween(0, this.groundY - 2, w, this.groundY - 2);
    edgeLine.lineStyle(8, 0x00ffff, 0.2);
    edgeLine.lineBetween(0, this.groundY - 2, w, this.groundY - 2);
    edgeLine.setScrollFactor(0).setDepth(5);

    // Side rails glow
    const rails = this.add.graphics();
    rails.lineStyle(3, 0x9b5cff, 0.5);
    rails.lineBetween(this.centerX - this.laneWidth * 1.8, 0, this.centerX - this.laneWidth * 1.8, h);
    rails.lineBetween(this.centerX + this.laneWidth * 1.8, 0, this.centerX + this.laneWidth * 1.8, h);
    rails.setScrollFactor(0).setDepth(-8);
  }

  handleResize(gameSize: Phaser.Structs.Size) {
    this.centerX = gameSize.width / 2;
    this.groundY = gameSize.height - 120;
  }

  restartRun() {
    this.scene.restart();
  }

  update(_: number, delta: number) {
    if (!this.runActive) return;

    this.distance += (this.speed * delta) / 1000;
    this.speed += 3 * (delta / 1000);

    useGameStore.setState({
      distance: this.distance,
      score: useGameStore.getState().score + ((this.speed * delta) / 50) * useGameStore.getState().multiplier,
      multiplier: Math.min(5, 1 + this.distance / 2000),
      tokens: Math.floor(this.distance / 1000),
    });

    this.spawnByDistance();
    this.spawner.group.setVelocityY(this.speed);
    this.spawner.recycleOffscreen(this.groundY + 100);
    this.checkCollisions();
  }

  spawnByDistance() {
    while (this.distance >= this.nextSpawnDistance) {
      const chunk = pickChunk();
      
      chunk.obstacles.forEach((o) => {
        o.lanes.forEach((lane) => {
          this.spawner.spawn('block', lane, -60);
        });
      });
      
      for (let i = 0; i < chunk.collectibles; i++) {
        const lane = Phaser.Math.Between(0, 2);
        this.spawner.spawn('collectible', lane, -150 - i * 50);
      }
      
      this.nextSpawnDistance += Phaser.Math.Between(200, 300);
    }
  }

  checkCollisions() {
    const px = this.player.x;
    const py = this.player.y;

    this.spawner.group.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      
      const key = sprite.texture.key;
      const sx = sprite.x;
      const sy = sprite.y;
      
      const sameLane = Math.abs(px - sx) < 40;
      if (!sameLane) return;
      
      const close = Math.abs(py - sy) < 50;
      if (!close) return;
      
      if (key.startsWith('item-')) {
        this.collect(key.replace('item-', ''));
        spawnSpark(this, sx, sy, 0xffd700);
        sprite.destroy();
      } else {
        if (this.player.isJumping) {
          return;
        }
        this.triggerGameOver();
      }
    });
  }

  collect(type: string) {
    const valueMap: Record<string, number> = { coin: 50, wif: 80, bonk: 60, rome: 70, gem: 120 };
    const bonus = valueMap[type] ?? 40;
    const state = useGameStore.getState();
    useGameStore.setState({ score: state.score + bonus, tokens: state.tokens + 1 });
  }

  triggerGameOver() {
    if (!this.runActive) return;
    this.runActive = false;
    const state = useGameStore.getState();
    const best = Math.max(state.best, state.score);
    localStorage.setItem('trench-best', String(best));
    useGameStore.setState({ phase: 'gameover', best });
    this.spawner.group.setVelocityY(0);
  }
}
