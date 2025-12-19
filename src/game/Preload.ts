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

    // Player run frames - bright purple character
    for (let i = 0; i < 5; i++) {
      g.clear();
      g.fillStyle(0x9b5cff, 1);
      g.fillRoundedRect(0, 0, 40, 60, 8);
      g.fillStyle(0x4ef0c5, 1);
      g.fillRect(10 + i * 2, 48, 8, 8); // feet animation
      g.fillStyle(0xffffff, 1);
      g.fillRect(12, 12, 6, 6); // eye
      g.fillRect(22, 12, 6, 6); // eye
      g.generateTexture(`player-run-${i}`, 40, 60);
    }

    // Slide texture - flattened
    g.clear();
    g.fillStyle(0x9b5cff, 1);
    g.fillRoundedRect(0, 0, 50, 30, 8);
    g.fillStyle(0x4ef0c5, 1);
    g.fillRect(4, 22, 42, 6);
    g.generateTexture('player-slide', 50, 30);

    // COLLECTIBLES - bright, friendly colors with glow effect
    const collectibles = {
      coin: { color: 0xffd700, glow: 0xffec80 },      // Gold
      wif: { color: 0xff9500, glow: 0xffb84d },       // Orange  
      bonk: { color: 0xff6b9d, glow: 0xffa0bf },      // Pink
      rome: { color: 0x00d4ff, glow: 0x80e8ff },      // Cyan
      gem: { color: 0xb84dff, glow: 0xd699ff },       // Purple
    };
    
    Object.entries(collectibles).forEach(([key, { color, glow }]) => {
      g.clear();
      // Glow
      g.fillStyle(glow, 0.5);
      g.fillCircle(12, 12, 14);
      // Main circle
      g.fillStyle(color, 1);
      g.fillCircle(12, 12, 10);
      // Shine
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(8, 8, 4);
      g.generateTexture(`item-${key}`, 24, 24);
    });

    // OBSTACLES - dark and dangerous looking
    // Block obstacle - tall red/black barrier
    g.clear();
    g.fillStyle(0x1a0a0a, 1);
    g.fillRect(0, 0, 50, 60);
    g.lineStyle(3, 0xff0000, 1);
    g.strokeRect(2, 2, 46, 56);
    g.lineStyle(2, 0xff0000, 0.5);
    g.lineBetween(0, 30, 50, 30);
    g.lineBetween(25, 0, 25, 60);
    g.generateTexture('obstacle-block', 50, 60);

    // Pit obstacle - wide gap in ground
    g.clear();
    g.fillStyle(0x0a0a0a, 1);
    g.fillRect(0, 0, 70, 20);
    g.lineStyle(2, 0xff3333, 1);
    g.strokeRect(1, 1, 68, 18);
    g.generateTexture('obstacle-pit', 70, 20);

    // Particle
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(2, 2, 2);
    g.generateTexture('particle', 4, 4);
    
    g.destroy();
  }
}
