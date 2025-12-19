import Phaser from 'phaser';
import { spawnSpark } from '../../utils/particles';

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
  centerX: number;
  laneWidth: number;

  constructor(scene: Phaser.Scene, centerX: number, laneWidth: number) {
    this.scene = scene;
    this.centerX = centerX;
    this.laneWidth = laneWidth;
    this.group = scene.physics.add.group();
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
    
    if (type === 'pit') {
      sprite.setSize(70, 15).setOffset(0, 5);
    }
    if (type === 'collectible') {
      sprite.setCircle(10, 0, 0);
      // Make collectibles spin
      this.scene.tweens.add({
        targets: sprite,
        angle: 360,
        duration: 1500,
        repeat: -1,
      });
    }
    return { sprite, type, lane } as SpawnedEntity;
  }

  recycleOffscreen(maxY: number) {
    this.group.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (sprite.y > maxY) sprite.destroy();
    });
  }

  handleCollect(player: Phaser.Physics.Arcade.Sprite, cb: (type: string) => void) {
    this.scene.physics.overlap(player, this.group, (_, obj) => {
      const sprite = obj as Phaser.Physics.Arcade.Sprite;
      const key = sprite.texture.key;
      if (!key.startsWith('item-')) return;
      spawnSpark(this.scene, sprite.x, sprite.y, 0xffd166);
      sprite.destroy();
      cb(key.replace('item-', ''));
    });
  }
}
