import Phaser from 'phaser';

export default class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create() {
    this.createTextures();
    this.scene.start('Main');
  }

  // Draw EXACT Solana logo - three identical parallelograms offset horizontally
  // All bars slant the same direction (top-left higher than top-right)
  // Top bar: shifted RIGHT, Middle bar: shifted LEFT, Bottom bar: shifted RIGHT
  drawSolanaLogo(g: Phaser.GameObjects.Graphics, cx: number, cy: number, scale: number = 1) {
    const barWidth = 14 * scale;      // Width of each bar
    const barHeight = 2.5 * scale;    // Height/thickness of each bar
    const slant = 2 * scale;          // How much the parallelogram slants
    const gap = 4 * scale;            // Vertical gap between bars
    const offset = 3 * scale;         // Horizontal offset for S pattern
    
    g.fillStyle(0xffffff, 1);
    
    // Each bar is a parallelogram with 4 points
    // Shape: top-left is higher, slopes down to top-right
    
    // TOP BAR - shifted RIGHT
    const topX = cx + offset;
    const topY = cy - gap;
    g.beginPath();
    g.moveTo(topX - barWidth/2, topY - barHeight/2);           // top-left (highest)
    g.lineTo(topX + barWidth/2, topY - barHeight/2 + slant);   // top-right (lower due to slant)
    g.lineTo(topX + barWidth/2, topY + barHeight/2 + slant);   // bottom-right
    g.lineTo(topX - barWidth/2, topY + barHeight/2);           // bottom-left
    g.closePath();
    g.fillPath();
    
    // MIDDLE BAR - shifted LEFT
    const midX = cx - offset;
    const midY = cy;
    g.beginPath();
    g.moveTo(midX - barWidth/2, midY - barHeight/2);           // top-left (highest)
    g.lineTo(midX + barWidth/2, midY - barHeight/2 + slant);   // top-right (lower due to slant)
    g.lineTo(midX + barWidth/2, midY + barHeight/2 + slant);   // bottom-right
    g.lineTo(midX - barWidth/2, midY + barHeight/2);           // bottom-left
    g.closePath();
    g.fillPath();
    
    // BOTTOM BAR - shifted RIGHT
    const botX = cx + offset;
    const botY = cy + gap;
    g.beginPath();
    g.moveTo(botX - barWidth/2, botY - barHeight/2);           // top-left (highest)
    g.lineTo(botX + barWidth/2, botY - barHeight/2 + slant);   // top-right (lower due to slant)
    g.lineTo(botX + barWidth/2, botY + barHeight/2 + slant);   // bottom-right
    g.lineTo(botX - barWidth/2, botY + barHeight/2);           // bottom-left
    g.closePath();
    g.fillPath();
  }

  createTextures() {
    const g = this.add.graphics();

    // PLAYER - Back view degen with visible head, cap, hoodie
    for (let i = 0; i < 5; i++) {
      g.clear();
      
      // HEAD - visible from back with cap
      g.fillStyle(0x9b5cff, 1);
      g.fillRoundedRect(8, 0, 24, 12, 4);
      g.fillStyle(0x7a4acc, 1);
      g.fillRect(6, 10, 28, 4);
      
      g.fillStyle(0x4a3728, 1);
      g.fillRect(10, 12, 20, 8);
      
      g.fillStyle(0xd4a574, 1);
      g.fillRect(14, 18, 12, 6);
      
      // Body/hoodie
      g.fillStyle(0x1a1a2e, 1);
      g.fillRoundedRect(5, 22, 30, 30, 4);
      
      g.fillStyle(0x2d2d44, 1);
      g.fillRoundedRect(8, 20, 24, 8, 3);
      
      // Solana logo on back - exact dimensions
      this.drawSolanaLogo(g, 20, 36, 1);
      
      // Arms
      g.fillStyle(0x1a1a2e, 1);
      g.fillRect(0 + (i % 2) * 3, 26, 6, 20);
      g.fillRect(34 - (i % 2) * 3, 26, 6, 20);
      
      g.fillStyle(0xd4a574, 1);
      g.fillRect(0 + (i % 2) * 3, 44, 6, 5);
      g.fillRect(34 - (i % 2) * 3, 44, 6, 5);
      
      // Jeans
      g.fillStyle(0x2a4066, 1);
      g.fillRect(8, 50, 10, 18);
      g.fillRect(22, 50, 10, 18);
      
      // Sneakers
      g.fillStyle(0x333333, 1);
      g.fillRect(6 + (i % 2) * 2, 66, 12, 6);
      g.fillRect(22 - (i % 2) * 2, 66, 12, 6);
      
      g.fillStyle(0xff00ff, 0.9);
      g.fillRect(6 + (i % 2) * 2, 70, 12, 3);
      g.fillRect(22 - (i % 2) * 2, 70, 12, 3);
      
      g.generateTexture(`player-run-${i}`, 40, 75);
    }

    // Slide texture
    g.clear();
    g.fillStyle(0x1a1a2e, 1);
    g.fillRoundedRect(0, 5, 50, 25, 6);
    this.drawSolanaLogo(g, 25, 17, 0.7);
    g.fillStyle(0x9b5cff, 1);
    g.fillRoundedRect(35, 2, 15, 10, 3);
    g.generateTexture('player-slide', 55, 32);

    // COLLECTIBLES
    g.clear();
    g.fillStyle(0xffd700, 0.3);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0xffd700, 1);
    g.fillCircle(16, 16, 12);
    g.fillStyle(0xb8860b, 1);
    g.fillCircle(16, 16, 9);
    g.fillStyle(0xffd700, 1);
    g.fillCircle(16, 16, 7);
    g.fillStyle(0x8b7500, 1);
    g.fillRect(14, 10, 4, 12);
    g.fillRect(12, 12, 8, 2);
    g.fillRect(12, 18, 8, 2);
    g.generateTexture('item-coin', 32, 32);

    g.clear();
    g.fillStyle(0xff9500, 0.3);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0xff9500, 1);
    g.fillCircle(16, 16, 12);
    g.fillStyle(0xffffff, 1);
    g.fillRect(10, 12, 4, 4);
    g.fillRect(18, 12, 4, 4);
    g.fillRect(12, 18, 8, 3);
    g.generateTexture('item-wif', 32, 32);

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

    g.clear();
    g.fillStyle(0x00d4ff, 0.3);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0x00d4ff, 1);
    g.fillCircle(16, 16, 12);
    g.fillStyle(0xffffff, 1);
    g.fillRect(10, 8, 4, 16);
    g.fillRect(18, 8, 4, 16);
    g.fillRect(8, 6, 16, 3);
    g.generateTexture('item-rome', 32, 32);

    g.clear();
    g.fillStyle(0xb84dff, 0.4);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0x9b5cff, 1);
    g.fillTriangle(16, 4, 4, 16, 16, 28);
    g.fillTriangle(16, 4, 28, 16, 16, 28);
    g.fillStyle(0xd699ff, 0.6);
    g.fillTriangle(16, 6, 8, 14, 16, 20);
    g.generateTexture('item-gem', 32, 32);

    // OBSTACLE
    g.clear();
    g.fillStyle(0xff0000, 0.3);
    g.fillRoundedRect(-5, -5, 90, 50, 8);
    g.fillStyle(0x0a0000, 1);
    g.fillRoundedRect(0, 0, 80, 40, 6);
    g.lineStyle(3, 0xff0000, 1);
    g.strokeRoundedRect(2, 2, 76, 36, 5);
    g.fillStyle(0x000000, 1);
    g.fillEllipse(40, 28, 60, 16);
    g.lineStyle(2, 0xff3333, 0.8);
    g.lineBetween(15, 15, 30, 25);
    g.lineBetween(65, 15, 50, 25);
    g.lineBetween(40, 10, 40, 20);
    g.generateTexture('obstacle-block', 80, 40);

    g.clear();
    g.fillStyle(0x1a0000, 1);
    g.fillRect(0, 0, 40, 60);
    g.fillStyle(0xff0000, 1);
    g.fillRect(5, 5, 30, 50);
    g.fillStyle(0x990000, 1);
    g.fillRect(15, 0, 10, 60);
    g.fillStyle(0xffffff, 0.5);
    g.fillTriangle(20, 50, 10, 35, 30, 35);
    g.generateTexture('obstacle-pit', 40, 60);

    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(3, 3, 3);
    g.generateTexture('particle', 6, 6);
    
    g.destroy();
  }
}
