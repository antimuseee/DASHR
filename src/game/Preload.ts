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

    // PLAYER - Back view degen with hoodie (purple/dark)
    for (let i = 0; i < 5; i++) {
      g.clear();
      // Body/hoodie - dark with purple trim
      g.fillStyle(0x1a1a2e, 1);
      g.fillRoundedRect(5, 10, 30, 35, 4);
      // Hood
      g.fillStyle(0x2d2d44, 1);
      g.fillRoundedRect(8, 5, 24, 15, 6);
      // Solana logo on back (simplified S shape)
      g.fillStyle(0x9b5cff, 1);
      g.fillRect(15, 18, 10, 3);
      g.fillRect(15, 24, 10, 3);
      g.fillRect(15, 30, 10, 3);
      // Jeans
      g.fillStyle(0x2a4066, 1);
      g.fillRect(8, 45, 10, 15);
      g.fillRect(22, 45, 10, 15);
      // Sneakers with animation
      g.fillStyle(0x333333, 1);
      g.fillRect(6 + (i % 2) * 2, 58, 12, 6);
      g.fillRect(22 - (i % 2) * 2, 58, 12, 6);
      // Sneaker glow
      g.fillStyle(0xff00ff, 0.8);
      g.fillRect(6 + (i % 2) * 2, 62, 12, 2);
      g.fillRect(22 - (i % 2) * 2, 62, 12, 2);
      // Hair peeking from hood
      g.fillStyle(0x4a3728, 1);
      g.fillRect(12, 6, 16, 6);
      g.generateTexture(`player-run-${i}`, 40, 65);
    }

    // Slide texture
    g.clear();
    g.fillStyle(0x1a1a2e, 1);
    g.fillRoundedRect(0, 5, 50, 25, 6);
    g.fillStyle(0x9b5cff, 1);
    g.fillRect(20, 12, 10, 3);
    g.fillRect(20, 18, 10, 3);
    g.generateTexture('player-slide', 50, 30);

    // COLLECTIBLES - Golden $SOL coins
    g.clear();
    // Outer glow
    g.fillStyle(0xffd700, 0.3);
    g.fillCircle(16, 16, 16);
    // Coin body
    g.fillStyle(0xffd700, 1);
    g.fillCircle(16, 16, 12);
    // Inner darker ring
    g.fillStyle(0xb8860b, 1);
    g.fillCircle(16, 16, 9);
    // Center
    g.fillStyle(0xffd700, 1);
    g.fillCircle(16, 16, 7);
    // $ symbol
    g.fillStyle(0x8b7500, 1);
    g.fillRect(14, 10, 4, 12);
    g.fillRect(12, 12, 8, 2);
    g.fillRect(12, 18, 8, 2);
    g.generateTexture('item-coin', 32, 32);

    // $WIF token (dog themed - orange)
    g.clear();
    g.fillStyle(0xff9500, 0.3);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0xff9500, 1);
    g.fillCircle(16, 16, 12);
    g.fillStyle(0xffffff, 1);
    g.fillRect(10, 12, 4, 4); // eye
    g.fillRect(18, 12, 4, 4); // eye
    g.fillRect(12, 18, 8, 3); // snout
    g.generateTexture('item-wif', 32, 32);

    // $BONK token (pink/red)
    g.clear();
    g.fillStyle(0xff6b9d, 0.3);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0xff6b9d, 1);
    g.fillCircle(16, 16, 12);
    g.fillStyle(0xffffff, 1);
    g.fillRect(8, 10, 6, 6);
    g.fillRect(18, 10, 6, 6);
    g.fillStyle(0xff0000, 1);
    g.fillRect(12, 18, 8, 4);
    g.generateTexture('item-bonk', 32, 32);

    // $ROME token (cyan/blue)
    g.clear();
    g.fillStyle(0x00d4ff, 0.3);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0x00d4ff, 1);
    g.fillCircle(16, 16, 12);
    g.fillStyle(0xffffff, 1);
    // Column shapes
    g.fillRect(10, 8, 4, 16);
    g.fillRect(18, 8, 4, 16);
    g.fillRect(8, 6, 16, 3);
    g.generateTexture('item-rome', 32, 32);

    // Purple gem
    g.clear();
    g.fillStyle(0xb84dff, 0.4);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0x9b5cff, 1);
    // Diamond shape
    g.fillTriangle(16, 4, 4, 16, 16, 28);
    g.fillTriangle(16, 4, 28, 16, 16, 28);
    g.fillStyle(0xd699ff, 0.6);
    g.fillTriangle(16, 6, 8, 14, 16, 20);
    g.generateTexture('item-gem', 32, 32);

    // OBSTACLE - Rug-pull pit (black hole with red cracks)
    g.clear();
    // Outer warning glow
    g.fillStyle(0xff0000, 0.2);
    g.fillEllipse(35, 15, 70, 30);
    // Black pit
    g.fillStyle(0x000000, 1);
    g.fillEllipse(35, 15, 60, 24);
    // Red crack lines
    g.lineStyle(2, 0xff0000, 0.8);
    g.lineBetween(10, 10, 25, 18);
    g.lineBetween(45, 10, 60, 18);
    g.lineBetween(20, 20, 35, 8);
    g.lineBetween(50, 20, 35, 8);
    g.generateTexture('obstacle-block', 70, 30);

    // Whale dump obstacle (falling red candle)
    g.clear();
    g.fillStyle(0x1a0000, 1);
    g.fillRect(0, 0, 40, 60);
    g.fillStyle(0xff0000, 1);
    g.fillRect(5, 5, 30, 50);
    g.fillStyle(0x990000, 1);
    g.fillRect(15, 0, 10, 60);
    // Down arrow
    g.fillStyle(0xffffff, 0.5);
    g.fillTriangle(20, 50, 10, 35, 30, 35);
    g.generateTexture('obstacle-pit', 40, 60);

    // Particle
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(3, 3, 3);
    g.generateTexture('particle', 6, 6);

    // Neon sign textures for background
    g.clear();
    g.fillStyle(0xff00ff, 0.8);
    g.fillRoundedRect(0, 0, 80, 30, 4);
    g.fillStyle(0xff00ff, 0.3);
    g.fillRoundedRect(-5, -5, 90, 40, 6);
    g.generateTexture('sign-glow', 80, 30);
    
    g.destroy();
  }
}
