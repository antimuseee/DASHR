import Phaser from 'phaser';

export type SpawnType = 'pit' | 'block' | 'collectible';

export interface SpawnedEntity {
  sprite: Phaser.Physics.Arcade.Sprite;
  type: SpawnType;
  lane: number;
}

const collectibleKeys = ['item-coin', 'item-wif', 'item-bonk', 'item-rome', 'item-gem'];

export default class Spawner {
  scene: Phaser.Scene;
  group: Phaser.Physics.Arcade.Group;
  textGroup: Phaser.GameObjects.Group;
  centerX: number;
  laneWidth: number;

  constructor(scene: Phaser.Scene, centerX: number, laneWidth: number) {
    this.scene = scene;
    this.centerX = centerX;
    this.laneWidth = laneWidth;
    this.group = scene.physics.add.group();
    this.textGroup = scene.add.group();
  }

  getLaneX(lane: number) {
    const lanes = [this.centerX - this.laneWidth, this.centerX, this.centerX + this.laneWidth];
    return lanes[lane];
  }

  spawn(type: SpawnType, lane: number, y: number) {
    const x = this.getLaneX(lane);
    let key = 'obstacle-block';
    if (type === 'pit') key = 'obstacle-pit';
    if (type === 'collectible') key = Phaser.Utils.Array.GetRandom(collectibleKeys);
    
    const sprite = this.group.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    sprite.setImmovable(true);
    sprite.body?.setAllowGravity(false);
    sprite.setDepth(8);
    
    if (type === 'collectible') {
      sprite.setScale(1.3);
      // Floating animation
      this.scene.tweens.add({
        targets: sprite,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      // Rotation
      this.scene.tweens.add({
        targets: sprite,
        angle: 360,
        duration: 2000,
        repeat: -1,
      });
    } else {
      // Obstacle with "RUG PULL" text
      sprite.setScale(1.1);
      
      // Add "RUG PULL" text on top of obstacle
      const text = this.scene.add.text(x, y - 5, 'RUG PULL', {
        fontSize: '10px',
        fontFamily: 'Arial Black',
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: 2,
      });
      text.setOrigin(0.5, 0.5);
      text.setDepth(9);
      
      // Store reference to move with sprite
      sprite.setData('label', text);
      this.textGroup.add(text);
    }
    
    return { sprite, type, lane } as SpawnedEntity;
  }

  recycleOffscreen(maxY: number) {
    this.group.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (sprite.y > maxY) {
        // Also destroy the label if it exists
        const label = sprite.getData('label') as Phaser.GameObjects.Text;
        if (label) {
          label.destroy();
        }
        sprite.destroy();
      } else {
        // Update label position to follow sprite
        const label = sprite.getData('label') as Phaser.GameObjects.Text;
        if (label) {
          label.x = sprite.x;
          label.y = sprite.y - 5;
        }
      }
    });
  }
}
