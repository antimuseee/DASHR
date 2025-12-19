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
    this.setScale(1.2); // Slightly bigger player
    
    // Gravity for jumping
    this.setGravityY(3000);
    
    this.setBodySize(25, 55);
    this.setOffset(7, 5);
    
    // Add glow effect behind player
    const glow = scene.add.graphics();
    glow.fillStyle(0x9b5cff, 0.3);
    glow.fillCircle(0, 0, 30);
    glow.setDepth(9);
    
    this.anims.create({
      key: 'run',
      frames: Array.from({ length: 5 }).map((_, i) => ({ key: `player-run-${i}` })),
      frameRate: 12,
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
    this.setBodySize(50, 20);
    this.setOffset(-4, 5);
    this.scene.time.delayedCall(600, () => {
      this.isSliding = false;
      this.setTexture('player-run-0');
      this.setBodySize(25, 55);
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
