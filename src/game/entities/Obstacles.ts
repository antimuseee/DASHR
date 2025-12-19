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

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.physics.add.group();
  }

  spawn(type: SpawnType, lane: number, y: number) {
    const x = 180 + [-80, 0, 80][lane];
    let key = 'obstacle-block';
    if (type === 'pit') key = 'obstacle-pit';
    if (type === 'collectible') key = Phaser.Utils.Array.GetRandom(collectibleKeys);
    const sprite = this.group.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    sprite.setImmovable(true);
    if (type === 'pit') sprite.setSize(60, 10).setOffset(0, 10);
    if (type === 'collectible') sprite.setCircle(10, 0, 0).setVelocityY(0);
    return { sprite, type, lane } as SpawnedEntity;
  }

  recycleOffscreen() {
    this.group.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (sprite.y > 900) sprite.destroy();
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
