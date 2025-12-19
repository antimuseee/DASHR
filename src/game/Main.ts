import Phaser from 'phaser';
import Player from './entities/Player';
import Spawner from './entities/Obstacles';
import { gameActions, useGameStore } from '../utils/store';
import { spawnSpark } from '../utils/particles';

interface ChunkConfig {
  weight: number;
  obstacles: Array<{ type: 'pit' | 'block'; lanes: number[] }>;
  collectibles: number;
}

const chunks: ChunkConfig[] = [
  { weight: 4, obstacles: [{ type: 'block', lanes: [1] }], collectibles: 3 },
  { weight: 3, obstacles: [{ type: 'block', lanes: [0] }, { type: 'block', lanes: [2] }], collectibles: 2 },
  { weight: 2, obstacles: [{ type: 'pit', lanes: [0, 2] }], collectibles: 4 },
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
  speed = 300;
  distance = 0;
  lastSpawnY = 0;
  runActive = false;
  centerX = 0;
  groundY = 0;
  laneWidth = 100;

  constructor() {
    super('Main');
  }

  create() {
    this.centerX = this.scale.width / 2;
    this.groundY = this.scale.height - 100;

    this.cameras.main.setBackgroundColor('#0a0418');

    // Draw background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0f2f, 0x1a0f2f, 0x05040a, 0x05040a, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);
    bg.setScrollFactor(0).setDepth(-10);

    // Draw 3 lanes
    const laneXs = [this.centerX - this.laneWidth, this.centerX, this.centerX + this.laneWidth];
    laneXs.forEach((x) => {
      const lane = this.add.rectangle(x, this.scale.height / 2, 90, this.scale.height, 0x9b5cff, 0.1);
      lane.setStrokeStyle(2, 0x9b5cff, 0.3);
      lane.setScrollFactor(0).setDepth(-5);
    });

    // Ground line
    this.add.rectangle(this.centerX, this.groundY, this.scale.width, 8, 0x4ef0c5, 0.8)
      .setScrollFactor(0).setDepth(5);

    // Player
    this.player = new Player(this, this.centerX, this.groundY - 40, this.laneWidth);
    
    // Spawner
    this.spawner = new Spawner(this, this.centerX, this.laneWidth);
    this.physics.add.collider(this.player, this.spawner.group, () => this.triggerGameOver());
    this.spawner.handleCollect(this.player, (type) => this.collect(type));

    this.registerInputs();
    this.startRun();

    this.scale.on('resize', this.handleResize, this);
  }

  handleResize(gameSize: Phaser.Structs.Size) {
    this.centerX = gameSize.width / 2;
    this.groundY = gameSize.height - 100;
  }

  startRun() {
    this.speed = 300;
    this.distance = 0;
    this.lastSpawnY = this.player?.y ?? this.groundY - 40;
    this.runActive = true;
    gameActions.startRun();
  }

  restartRun() {
    this.scene.restart();
  }

  update(_: number, delta: number) {
    if (!this.runActive) return;

    this.distance += (this.speed * delta) / 1000;
    this.speed += 5 * (delta / 1000);

    useGameStore.setState((s) => ({
      distance: this.distance,
      score: s.score + ((this.speed * delta) / 40) * s.multiplier,
      multiplier: Math.min(5, 1 + this.distance / 2000),
      tokens: Math.floor(this.distance / 1000),
    }));

    this.spawnAhead();
    this.spawner.group.setVelocityY(this.speed);
    this.spawner.recycleOffscreen(this.groundY + 200);
  }

  spawnAhead() {
    const buffer = 800;
    while (this.lastSpawnY > -buffer) {
      this.lastSpawnY -= Phaser.Math.Between(200, 350);
      const chunk = pickChunk();
      chunk.obstacles.forEach((o) => {
        o.lanes.forEach((lane) => {
          const entity = this.spawner.spawn(o.type, lane, this.lastSpawnY);
          entity.sprite.setVelocityY(this.speed);
        });
      });
      for (let i = 0; i < chunk.collectibles; i++) {
        const lane = Phaser.Math.Between(0, 2);
        const entity = this.spawner.spawn('collectible', lane, this.lastSpawnY + 60 + i * 30);
        entity.sprite.setVelocityY(this.speed);
      }
    }
  }

  collect(type: string) {
    const valueMap: Record<string, number> = { coin: 50, wif: 80, bonk: 60, rome: 70, gem: 120 };
    const bonus = valueMap[type] ?? 40;
    useGameStore.setState((s) => ({ score: s.score + bonus, tokens: s.tokens + 1 }));
    spawnSpark(this, this.player.x, this.player.y - 20, 0x4ef0c5);
  }

  registerInputs() {
    // Keyboard
    this.input.keyboard?.on('keydown-UP', () => this.player.jump());
    this.input.keyboard?.on('keydown-W', () => this.player.jump());
    this.input.keyboard?.on('keydown-SPACE', () => this.player.jump());
    this.input.keyboard?.on('keydown-DOWN', () => this.player.slide());
    this.input.keyboard?.on('keydown-S', () => this.player.slide());
    this.input.keyboard?.on('keydown-LEFT', () => this.player.moveLane(-1));
    this.input.keyboard?.on('keydown-A', () => this.player.moveLane(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.player.moveLane(1));
    this.input.keyboard?.on('keydown-D', () => this.player.moveLane(1));

    // Swipe events from React
    this.game.events.on('input:jump', () => this.player.jump());
    this.game.events.on('input:slide', () => this.player.slide());
    this.game.events.on('input:left', () => this.player.moveLane(-1));
    this.game.events.on('input:right', () => this.player.moveLane(1));
  }

  triggerGameOver() {
    if (!this.runActive) return;
    this.runActive = false;
    const final = useGameStore.getState().score;
    gameActions.gameOver(final, this.distance, Math.floor(this.distance / 1000));
    this.spawner.group.setVelocityY(0);
  }
}
