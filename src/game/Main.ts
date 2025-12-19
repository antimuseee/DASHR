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

  constructor() {
    super('Main');
  }

  create() {
    this.centerX = this.scale.width / 2;
    this.groundY = this.scale.height - 100;

    this.cameras.main.setBackgroundColor('#0a0418');

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0f2f, 0x1a0f2f, 0x05040a, 0x05040a, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);
    bg.setScrollFactor(0).setDepth(-10);

    // 3 lanes
    const laneXs = [this.centerX - this.laneWidth, this.centerX, this.centerX + this.laneWidth];
    laneXs.forEach((x) => {
      const lane = this.add.rectangle(x, this.scale.height / 2, 90, this.scale.height, 0x9b5cff, 0.1);
      lane.setStrokeStyle(2, 0x9b5cff, 0.3);
      lane.setScrollFactor(0).setDepth(-5);
    });

    // Ground
    this.add.rectangle(this.centerX, this.groundY + 30, this.scale.width, 60, 0x0a0612, 1)
      .setScrollFactor(0).setDepth(1);
    this.add.rectangle(this.centerX, this.groundY, this.scale.width, 4, 0x4ef0c5, 0.8)
      .setScrollFactor(0).setDepth(5);

    // Player
    this.player = new Player(this, this.centerX, this.groundY - 30, this.laneWidth);
    
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

  handleResize(gameSize: Phaser.Structs.Size) {
    this.centerX = gameSize.width / 2;
    this.groundY = gameSize.height - 100;
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
      
      // Check if in same lane (within 40 pixels horizontally)
      const sameLane = Math.abs(px - sx) < 40;
      if (!sameLane) return;
      
      // Check if vertically close (within 50 pixels)
      const close = Math.abs(py - sy) < 50;
      if (!close) return;
      
      if (key.startsWith('item-')) {
        // Collectible - pick it up
        this.collect(key.replace('item-', ''));
        spawnSpark(this, sx, sy, 0xffd700);
        sprite.destroy();
      } else {
        // Obstacle - BUT if player is jumping, they're SAFE!
        if (this.player.isJumping) {
          // Player is in the air - obstacle passes harmlessly
          return;
        }
        // Player is on ground and hit obstacle - game over
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
