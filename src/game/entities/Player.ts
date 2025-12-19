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
    console.log('Player created at', x, y, 'laneWidth:', laneWidth);
  }

  jump() {
    if (this.isSliding) return;
    console.log('Player jumping from y:', this.y);
    this.scene.tweens.add({
      targets: this,
      y: this.y - 150,
      duration: 300,
      ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: () => console.log('Jump complete, y:', this.y),
    });
  }

  slide() {
    if (this.isSliding) return;
    this.isSliding = true;
    console.log('Player sliding');
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
    const oldLane = this.laneIndex;
    const target = Phaser.Math.Clamp(this.laneIndex + dir, 0, 2);
    this.laneIndex = target;
    console.log('Lane change:', oldLane, '->', this.laneIndex, 'x will go to:', this.getLaneX());
  }

  getLaneX() {
    const lanes = [this.centerX - this.laneWidth, this.centerX, this.centerX + this.laneWidth];
    return lanes[this.laneIndex];
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    const targetX = this.getLaneX();
    const oldX = this.x;
    this.x = Phaser.Math.Linear(this.x, targetX, 0.2);
    if (Math.abs(oldX - this.x) > 1) {
      console.log('Moving x:', oldX.toFixed(0), '->', this.x.toFixed(0), 'target:', targetX);
    }
  }
}
