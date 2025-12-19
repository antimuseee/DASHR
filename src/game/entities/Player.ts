import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  laneIndex = 1;
  laneWidth: number;
  centerX: number;
  groundY: number;
  isSliding = false;
  isJumping = false;

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
    
    this.anims.create({
      key: 'run',
      frames: Array.from({ length: 5 }).map((_, i) => ({ key: `player-run-${i}` })),
      frameRate: 10,
      repeat: -1,
    });
    this.play('run');
  }

  jump() {
    if (this.isJumping || this.isSliding) return;
    this.isJumping = true;
    this.setVelocityY(-1200);
  }

  slide() {
    if (this.isSliding || this.isJumping) return;
    this.isSliding = true;
    this.setTexture('player-slide');
    this.setBodySize(50, 25);
    this.setOffset(-4, 5);
    this.scene.time.delayedCall(600, () => {
      this.isSliding = false;
      this.setTexture('player-run-0');
      this.setBodySize(25, 65);
      this.setOffset(7, 5);
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
  }
}
