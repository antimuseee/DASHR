import Phaser from 'phaser';

export default class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create() {
    this.createTextures();
    this.scene.start('Main');
  }

  createTextures() {
    const g = this.add.graphics();

    for (let i = 0; i < 5; i++) {
      g.clear();
      g.fillStyle(0x9b5cff, 1);
      g.fillRoundedRect(0, 0, 40, 60, 8);
      g.fillStyle(0x4ef0c5, 1);
      g.fillRect(10 + i, 45, 10, 10);
      g.fillStyle(0x1a1d3a, 1);
      g.fillRect(5, 5, 30, 10);
      g.generateTexture(`player-run-${i}`, 40, 60);
    }

    g.clear();
    g.fillStyle(0x9b5cff, 1);
    g.fillRoundedRect(0, 0, 50, 30, 8);
    g.fillStyle(0x4ef0c5, 1);
    g.fillRect(4, 20, 42, 8);
    g.generateTexture('player-slide', 50, 30);

    const colors = {
      coin: 0xffd166,
      wif: 0xffb347,
      bonk: 0xff6b6b,
      rome: 0x5aa9ff,
      gem: 0xa855f7,
    } as const;
    Object.entries(colors).forEach(([key, value]) => {
      g.clear();
      g.fillStyle(value, 1);
      g.fillRoundedRect(0, 0, 20, 20, 6);
      g.lineStyle(2, 0xffffff, 0.8);
      g.strokeRoundedRect(2, 2, 16, 16, 6);
      g.generateTexture(`item-${key}`, 20, 20);
    });

    g.clear();
    g.fillStyle(0x1b0b24, 1);
    g.fillRect(0, 0, 60, 20);
    g.lineStyle(2, 0xff2d55, 1);
    g.strokeRect(0, 0, 60, 20);
    g.generateTexture('obstacle-pit', 60, 20);

    g.clear();
    g.fillStyle(0x2c0909, 1);
    g.fillRect(0, 0, 40, 40);
    g.lineStyle(2, 0xff4338, 1);
    g.strokeRect(0, 0, 40, 40);
    g.generateTexture('obstacle-block', 40, 40);

    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture('particle', 4, 4);
  }
}
