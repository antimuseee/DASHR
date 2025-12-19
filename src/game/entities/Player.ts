import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  laneIndex = 1;
  lanes = [-80, 0, 80];
  isSliding = false;
  baseY = 500;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-run-0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(10);
    this.setBodySize(24, 50);
    this.setOffset(8, 6);
    this.anims.create({
      key: 'run',
      frames: Array.from({ length: 5 }).map((_, i) => ({ key: `player-run-${i}` })),
      frameRate: 12,
      repeat: -1,
    });
    this.play('run');
  }

  jump() {
    if (!this.body?.blocking.down) return;
    this.setVelocityY(-720);
  }

  slide() {
    if (this.isSliding) return;
    this.isSliding = true;
    this.setTexture('player-slide');
    this.setBodySize(50, 24);
    this.setOffset(-4, 6);
    this.scene.time.delayedCall(800, () => {
      this.isSliding = false;
      this.setTexture('player-run-0');
      this.setBodySize(24, 50);
      this.setOffset(8, 6);
    });
  }

  moveLane(dir: -1 | 1) {
    const target = Phaser.Math.Clamp(this.laneIndex + dir, 0, this.lanes.length - 1);
    this.laneIndex = target;
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    const targetX = 180 + this.lanes[this.laneIndex];
    this.x = Phaser.Math.Linear(this.x, targetX, 0.25);
  }
}
