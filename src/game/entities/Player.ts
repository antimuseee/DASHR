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
    
    // Enable gravity for jumping
    this.setGravityY(2500);
    
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
    // Can only jump if on ground
    if (this.isJumping || this.isSliding) {
      console.log('Cannot jump - isJumping:', this.isJumping, 'isSliding:', this.isSliding);
      return;
    }
    console.log('JUMPING!');
    this.isJumping = true;
    this.setVelocityY(-900);
  }

  slide() {
    if (this.isSliding || this.isJumping) return;
    this.isSliding = true;
    this.setTexture('player-slide');
    this.setBodySize(50, 24);
    this.setOffset(-4, 30);
    this.scene.time.delayedCall(600, () => {
      this.isSliding = false;
      this.setTexture('player-run-0');
      this.setBodySize(30, 50);
      this.setOffset(5, 5);
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
    
    // Move to target lane
    const targetX = this.getLaneX();
    this.x = Phaser.Math.Linear(this.x, targetX, 0.2);
    
    // Check if landed - only if falling down (positive velocity) and at/below ground
    const vel = this.body?.velocity.y ?? 0;
    if (this.y >= this.groundY && vel >= 0) {
      this.y = this.groundY;
      this.setVelocityY(0);
      if (this.isJumping) {
        console.log('Landed!');
        this.isJumping = false;
      }
    }
  }
}
