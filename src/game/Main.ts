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
  { weight: 4, obstacles: [{ type: 'pit', lanes: [1] }, { type: 'block', lanes: [0, 2] }], collectibles: 2 },
  { weight: 3, obstacles: [{ type: 'block', lanes: [1] }], collectibles: 3 },
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
  ground!: Phaser.GameObjects.Rectangle;
  speed = 200;
  distance = 0;
  lastSpawnY = 0;
  runActive = false;

  constructor() {
    super('Main');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0418');
    this.physics.world.setBounds(0, 0, 360, 1200);

    this.addGradientBG();

    const laneXs = [100, 180, 260];
    laneXs.forEach((x) => {
      this.add.rectangle(x, 320, 80, 640, 0x4ef0c5, 0.06).setDepth(-1).setStrokeStyle(2, 0x9b5cff, 0.2);
    });

    this.ground = this.add.rectangle(180, 560, 400, 140, 0x130a24).setDepth(1);
    this.add.rectangle(180, 490, 400, 4, 0x4ef0c5, 0.5).setDepth(2);
    this.physics.add.existing(this.ground, true);

    this.player = new Player(this, 180, 480);
    this.physics.add.collider(this.player, this.ground);
    this.add.rectangle(180, 480, 48, 70, 0xffffff, 0.08).setDepth(9);

    this.spawner = new Spawner(this);
    this.physics.add.collider(this.player, this.spawner.group, () => this.triggerGameOver());
    this.spawner.handleCollect(this.player, (type) => this.collect(type));

    this.registerInputs();
    this.startRun();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.removeAllListeners('input:jump');
      this.game.events.removeAllListeners('input:slide');
      this.game.events.removeAllListeners('input:left');
      this.game.events.removeAllListeners('input:right');
    });
  }

  startRun() {
    this.speed = 200;
    this.distance = 0;
    this.lastSpawnY = this.player?.y ?? 480;
    this.runActive = true;
    gameActions.startRun();
  }

  restartRun() {
    this.scene.restart();
  }

  addGradientBG() {
    const g = this.add.graphics();
    g.fillStyle(0x0d0420, 1);
    g.fillRect(0, 0, 360, 640);
    g.fillStyle(0x09142d, 0.6);
    g.fillRect(0, 0, 360, 320);
    g.generateTexture('bg-tex', 360, 640);
    g.destroy();
    this.add.image(180, 320, 'bg-tex').setDepth(-5).setScrollFactor(0);
  }

  update(_, delta: number) {
    if (!this.runActive) return;

    this.distance += (this.speed * delta) / 1000;
    this.speed += 8 * (delta / 1000);

    useGameStore.setState((s) => ({
      distance: this.distance,
      score: s.score + ((this.speed * delta) / 40) * s.multiplier,
      multiplier: Math.min(5, 1 + this.distance / 2000),
      tokens: Math.floor(this.distance / 1000),
    }));

    this.spawnAhead();
    this.spawner.group.setVelocityY(-this.speed);
    this.spawner.recycleOffscreen();

    this.cameras.main.scrollY = this.player.y - 320;

    if (this.player.y > this.cameras.main.scrollY + 700) {
      this.triggerGameOver();
    }
  }

  spawnAhead() {
    const buffer = 900;
    while (this.lastSpawnY < this.player.y + buffer) {
      this.lastSpawnY += Phaser.Math.Between(160, 240);
      const chunk = pickChunk();
      chunk.obstacles.forEach((o) => {
        o.lanes.forEach((lane) => {
          const entity = this.spawner.spawn(o.type, lane, this.lastSpawnY);
          entity.sprite.setVelocityY(-this.speed);
        });
      });
      for (let i = 0; i < chunk.collectibles; i++) {
        const lane = Phaser.Math.Between(0, 2);
        const entity = this.spawner.spawn('collectible', lane, this.lastSpawnY - 60 - i * 10);
        entity.sprite.setVelocityY(-this.speed * 0.8);
      }
    }
  }

  collect(type: string) {
    const valueMap: Record<string, number> = {
      coin: 50,
      wif: 80,
      bonk: 60,
      rome: 70,
      gem: 120,
    };
    const bonus = valueMap[type] ?? 40;
    useGameStore.setState((s) => ({ score: s.score + bonus, tokens: s.tokens + 1 }));
    spawnSpark(this, this.player.x, this.player.y - 20, 0x4ef0c5);
  }

  registerInputs() {
    this.input.keyboard?.on('keydown-UP', () => this.player.jump());
    this.input.keyboard?.on('keydown-DOWN', () => this.player.slide());
    this.input.keyboard?.on('keydown-LEFT', () => this.player.moveLane(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.player.moveLane(1));

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
