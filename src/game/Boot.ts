import Phaser from 'phaser';

export default class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.setBaseURL('');
  }

  create() {
    this.scene.start('Preload');
  }
}
