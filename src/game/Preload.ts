import Phaser from 'phaser';

export default class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create() {
    this.createTextures();
    this.scene.start('Main');
  }

  // Draw PERFECT Solana logo - horizontal bars with slanted ends and a TRUE smooth gradient
  // Per your request: all three bars are centered (no side-to-side offsets)
  drawSolanaLogo(g: Phaser.GameObjects.Graphics, cx: number, cy: number, scale: number = 1) {
    const barWidth = 14 * scale;
    const barHeight = 2.8 * scale;
    const slant = 3 * scale;
    const gap = 4.2 * scale;
    const xCenter = Math.round(cx);

    // Total span of the logo for diagonal gradient calculation
    const logoTop = cy - gap - barHeight / 2;
    const logoBot = cy + gap + barHeight / 2;
    const logoLeft = xCenter - barWidth / 2 - Math.abs(slant);
    const logoRight = xCenter + barWidth / 2 + Math.abs(slant);
    const logoHeight = logoBot - logoTop;
    const logoWidth = logoRight - logoLeft;

    // Diagonal gradient like the official mark:
    // teal is strongest in the UPPER-RIGHT, fading toward the BOTTOM-LEFT.
    const teal = { r: 0x14, g: 0xf1, b: 0x95 };   // #14F195
    const purple = { r: 0x99, g: 0x45, b: 0xff }; // #9945FF
    const ur = { x: logoRight, y: logoTop };      // upper-right anchor
    const maxU = logoWidth + logoHeight;          // along (-1,+1) direction

    const getColorAtXY = (x: number, y: number) => {
      // project point onto direction from upper-right -> bottom-left (v = (-1, +1))
      const u = (ur.x - x) + (y - ur.y); // 0 at upper-right, increases toward bottom-left
      const t = Phaser.Math.Clamp(u / maxU, 0, 1);
      const r = Math.round(teal.r + (purple.r - teal.r) * t);
      const gVal = Math.round(teal.g + (purple.g - teal.g) * t);
      const b = Math.round(teal.b + (purple.b - teal.b) * t);
      return (r << 16) | (gVal << 8) | b;
    };

    const drawBar = (x: number, y: number) => {
      const halfW = barWidth / 2;
      const halfH = barHeight / 2;

      // Draw the bar using tiny rectangles so color can vary across BOTH X and Y (true diagonal gradient)
      const step = 0.5 * scale; // small enough for smooth gradient, still fast at this sprite size

      for (let hOff = -halfH; hOff <= halfH; hOff += step) {
        const currentY = y + hOff;

        // Slanted bar ends ( / direction ): top shifted LEFT, bottom no shift
        const tSlant = (hOff + halfH) / barHeight;
        const currentSlant = -slant * (1 - tSlant);

        const leftX = x - halfW + currentSlant;
        const rightX = x + halfW + currentSlant;

        for (let xx = leftX; xx <= rightX; xx += step) {
          const color = getColorAtXY(xx, currentY);
          g.fillStyle(color, 1);
          g.fillRect(xx, currentY, step, step);
        }
      }
    };

    // Draw the three bars (all centered)
    drawBar(xCenter, cy - gap); // TOP
    drawBar(xCenter, cy);       // MIDDLE
    drawBar(xCenter, cy + gap); // BOTTOM
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

    // BOOST: 2X MULTIPLIER - Electric yellow bolt
    g.clear();
    g.fillStyle(0xffff00, 0.4);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0xffd700, 1);
    g.fillCircle(16, 16, 13);
    g.fillStyle(0xff8c00, 1);
    // Lightning bolt shape
    g.fillTriangle(18, 4, 10, 16, 16, 16);
    g.fillTriangle(14, 16, 22, 16, 14, 28);
    g.fillStyle(0xffff00, 1);
    g.fillTriangle(17, 6, 12, 15, 16, 15);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(14, 10, 2);
    g.generateTexture('boost-double', 32, 32);

    // BOOST: SHIELD - Cyan protective bubble
    g.clear();
    g.fillStyle(0x00ffff, 0.3);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0x00d4ff, 0.8);
    g.fillCircle(16, 16, 13);
    g.fillStyle(0x00ffff, 0.4);
    g.fillCircle(16, 16, 10);
    // Shield icon
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(16, 6, 8, 12, 16, 26);
    g.fillTriangle(16, 6, 24, 12, 16, 26);
    g.fillStyle(0x00d4ff, 1);
    g.fillTriangle(16, 9, 11, 13, 16, 23);
    g.fillTriangle(16, 9, 21, 13, 16, 23);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(12, 10, 2);
    g.generateTexture('boost-shield', 32, 32);

    // BOOST: MAGNET - Purple/pink magnet
    g.clear();
    g.fillStyle(0xff00ff, 0.4);
    g.fillCircle(16, 16, 16);
    g.fillStyle(0xff00ff, 1);
    g.fillCircle(16, 16, 13);
    // Magnet U-shape
    g.fillStyle(0xff0066, 1);
    g.fillRect(8, 8, 6, 16);
    g.fillRect(18, 8, 6, 16);
    g.fillRect(8, 20, 16, 6);
    g.fillStyle(0xcccccc, 1);
    g.fillRect(8, 8, 6, 5);
    g.fillRect(18, 8, 6, 5);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(11, 10, 2);
    g.generateTexture('boost-magnet', 32, 32);

    // OBSTACLE - Rug Pull Pit with pump & dump chart
    g.clear();
    // Outer glow
    g.fillStyle(0xff0000, 0.3);
    g.fillRoundedRect(-5, -5, 90, 50, 8);
    // Dark pit background
    g.fillStyle(0x0a0000, 1);
    g.fillRoundedRect(0, 0, 80, 40, 6);
    
    // Pump & Dump chart pattern (contained within pit)
    // Green pump line - parabolic rise from bottom-left to peak
    g.lineStyle(2, 0x00ff00, 0.7);
    // Start low left, curve up to peak around x=45
    g.lineBetween(8, 32, 15, 28);   // Start rising
    g.lineBetween(15, 28, 22, 22);  // Accelerate
    g.lineBetween(22, 22, 30, 15);  // Steeper
    g.lineBetween(30, 15, 38, 9);   // Near peak
    g.lineBetween(38, 9, 45, 7);    // Peak!
    
    // Red dump line - sharp crash from peak to bottom-right
    g.lineStyle(2, 0xff0000, 0.8);
    g.lineBetween(45, 7, 50, 18);   // Initial crash
    g.lineBetween(50, 18, 54, 28);  // Falling fast
    g.lineBetween(54, 28, 58, 33);  // Bottom
    g.lineBetween(58, 33, 72, 34);  // Flatline at bottom (rug pulled)
    
    // Red border outline
    g.lineStyle(3, 0xff0000, 1);
    g.strokeRoundedRect(2, 2, 76, 36, 5);
    
    // Dark hole/void at bottom
    g.fillStyle(0x000000, 0.7);
    g.fillEllipse(40, 30, 55, 14);
    
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

    // WHALE TOKEN - Rare reward, blue whale shape
    g.clear();
    g.fillStyle(0x0066cc, 0.4);
    g.fillCircle(20, 20, 20);
    g.fillStyle(0x0088ff, 1);
    g.fillCircle(20, 20, 17);
    // Whale body
    g.fillStyle(0x00aaff, 1);
    g.fillEllipse(20, 22, 24, 14);
    // Whale tail
    g.fillTriangle(36, 20, 40, 12, 40, 28);
    // Whale head
    g.fillStyle(0x00ccff, 1);
    g.fillCircle(8, 22, 8);
    // Eye
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 20, 3);
    g.fillStyle(0x000000, 1);
    g.fillCircle(5, 20, 1.5);
    // Water spout
    g.fillStyle(0x88ddff, 0.8);
    g.fillCircle(10, 8, 3);
    g.fillCircle(8, 5, 2);
    g.fillCircle(12, 4, 2);
    g.generateTexture('item-whale', 40, 40);

    // BUBBLE - Trail marker (bright green/yellow to stand out)
    g.clear();
    // Outer glow - bright green
    g.fillStyle(0x00ff88, 0.4);
    g.fillCircle(14, 14, 14);
    // Middle ring - yellow
    g.fillStyle(0xffff00, 0.7);
    g.fillCircle(14, 14, 10);
    // Inner - bright green
    g.fillStyle(0x00ff44, 0.9);
    g.fillCircle(14, 14, 6);
    // Whale icon hint - small blue center
    g.fillStyle(0x00aaff, 1);
    g.fillCircle(14, 14, 3);
    // Shine
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(10, 10, 2);
    g.generateTexture('item-bubble', 28, 28);
    
    g.destroy();
  }
}
