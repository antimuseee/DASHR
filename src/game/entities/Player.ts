import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  laneIndex = 1;
  laneWidth: number;
  centerX: number;
  isSliding = false;

  constructor(scene: Phaser.Scene, x: number, y: number, laneWidth: number) {
    super(scene, x, y, 'player-run-0');
    this.centerX = x;
    this.laneWidth = laneWidth;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(false);
    this.setDepth(10);
    this.setGravityY(0);
    this.body?.setAllowGravity(false);
    this.setBodySize(30, 50);
    this.setOffset(5, 5);
    
    this.anims.create({
      key: 'run',
      frames: Array.from({ length: 5 }).map((_, i) => ({ key: `player-run-${i}` })),
      frameRate: 12,
      repeat: -1,
    });
    this.play('run');
  }

  jump() {
    if (this.isSliding) return;
    this.scene.tweens.add({
      targets: this,
      y: this.y - 120,
      duration: 250,
      ease: 'Quad.easeOut',
      yoyo: true,
    });
  }

  slide() {
    if (this.isSliding) return;
    this.isSliding = true;
    this.setTexture('player-slide');
    this.setBodySize(50, 24);
    this.setOffset(-4, 6);
    this.scene.time.delayedCall(600, () => {
      this.isSliding = false;
      this.setTexture('player-run-0');
      this.setBodySize(30, 50);
      this.setOffset(5, 5);
    });
  }

  moveLane(dir: -1 | 1) {
    const target = Phaser.Math.Clamp(this.laneIndex + dir, 0, 2);
    this.laneIndex = target;
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    const lanes = [this.centerX - this.laneWidth, this.centerX, this.centerX + this.laneWidth];
    const targetX = lanes[this.laneIndex];
    this.x = Phaser.Math.Linear(this.x, targetX, 0.2);
  }
}
