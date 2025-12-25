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

    // Helper to create player frame with optional body tint
    const createPlayerFrame = (frameIndex: number, bodyTint?: number) => {
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
      
      // Body/hoodie - use tint if provided, otherwise default dark
      const bodyColor = bodyTint || 0x1a1a2e;
      // For tinted skins, make hood slightly lighter by adding to RGB values
      let hoodColor = 0x2d2d44;
      if (bodyTint) {
        const r = (bodyTint >> 16) & 0xff;
        const g = (bodyTint >> 8) & 0xff;
        const b = bodyTint & 0xff;
        hoodColor = ((Math.min(255, r + 30) << 16) | (Math.min(255, g + 30) << 8) | Math.min(255, b + 30));
      }
      
      g.fillStyle(bodyColor, 1);
      g.fillRoundedRect(5, 22, 30, 30, 4);
      
      g.fillStyle(hoodColor, 1);
      g.fillRoundedRect(8, 20, 24, 8, 3);
      
      // Solana logo on back - exact dimensions
      this.drawSolanaLogo(g, 20, 36, 1);
      
      // Arms - use body tint
      g.fillStyle(bodyColor, 1);
      g.fillRect(0 + (frameIndex % 2) * 3, 26, 6, 20);
      g.fillRect(34 - (frameIndex % 2) * 3, 26, 6, 20);
      
      g.fillStyle(0xd4a574, 1);
      g.fillRect(0 + (frameIndex % 2) * 3, 44, 6, 5);
      g.fillRect(34 - (frameIndex % 2) * 3, 44, 6, 5);
      
      // Jeans
      g.fillStyle(0x2a4066, 1);
      g.fillRect(8, 50, 10, 18);
      g.fillRect(22, 50, 10, 18);
      
      // Sneakers
      g.fillStyle(0x333333, 1);
      g.fillRect(6 + (frameIndex % 2) * 2, 66, 12, 6);
      g.fillRect(22 - (frameIndex % 2) * 2, 66, 12, 6);
      
      g.fillStyle(0xff00ff, 0.9);
      g.fillRect(6 + (frameIndex % 2) * 2, 70, 12, 3);
      g.fillRect(22 - (frameIndex % 2) * 2, 70, 12, 3);
    };

    // PLAYER - Default (no tint)
    for (let i = 0; i < 5; i++) {
      createPlayerFrame(i);
      g.generateTexture(`player-run-${i}`, 40, 75);
    }
    
    // PLAYER - Bronze skin (bronze/copper body)
    for (let i = 0; i < 5; i++) {
      createPlayerFrame(i, 0xcd7f32); // Bronze
      g.generateTexture(`player-run-${i}-bronze`, 40, 75);
    }
    
    // PLAYER - Silver skin (darker metallic gray body)
    for (let i = 0; i < 5; i++) {
      createPlayerFrame(i, 0x888888); // Darker metallic gray
      g.generateTexture(`player-run-${i}-silver`, 40, 75);
    }
    
    // PLAYER - Chrome skin (bright blue-tinted chrome body)
    for (let i = 0; i < 5; i++) {
      createPlayerFrame(i, 0xb0d0ff); // Bright blue-tinted chrome
      g.generateTexture(`player-run-${i}-chrome`, 40, 75);
    }
    
    // PLAYER - Neon skin (bright green body)
    for (let i = 0; i < 5; i++) {
      createPlayerFrame(i, 0x00ff00); // Bright green
      g.generateTexture(`player-run-${i}-neon`, 40, 75);
    }
    
    // PLAYER - Diamond skin (bright cyan body)
    for (let i = 0; i < 5; i++) {
      createPlayerFrame(i, 0x00ffff); // Bright cyan
      g.generateTexture(`player-run-${i}-diamond`, 40, 75);
    }
    
    // PLAYER - Gold skin (golden body)
    for (let i = 0; i < 5; i++) {
      createPlayerFrame(i, 0xffd700); // Gold
      g.generateTexture(`player-run-${i}-gold`, 40, 75);
    }
    
    // PLAYER - Holographic skin (magenta/pink body)
    for (let i = 0; i < 5; i++) {
      createPlayerFrame(i, 0xff00ff); // Magenta
      g.generateTexture(`player-run-${i}-holographic`, 40, 75);
    }

    // Slide texture (default)
    g.clear();
    g.fillStyle(0x1a1a2e, 1);
    g.fillRoundedRect(0, 5, 50, 25, 6);
    this.drawSolanaLogo(g, 25, 17, 0.7);
    g.fillStyle(0x9b5cff, 1);
    g.fillRoundedRect(35, 2, 15, 10, 3);
    g.generateTexture('player-slide', 55, 32);
    
    // Slide texture (bronze - bronze body)
    g.clear();
    g.fillStyle(0xcd7f32, 1); // Bronze
    g.fillRoundedRect(0, 5, 50, 25, 6);
    this.drawSolanaLogo(g, 25, 17, 0.7);
    g.fillStyle(0x9b5cff, 1);
    g.fillRoundedRect(35, 2, 15, 10, 3);
    g.generateTexture('player-slide-bronze', 55, 32);
    
    // Slide texture (silver - darker metallic gray body)
    g.clear();
    g.fillStyle(0x888888, 1); // Darker metallic gray
    g.fillRoundedRect(0, 5, 50, 25, 6);
    this.drawSolanaLogo(g, 25, 17, 0.7);
    g.fillStyle(0x9b5cff, 1);
    g.fillRoundedRect(35, 2, 15, 10, 3);
    g.generateTexture('player-slide-silver', 55, 32);
    
    // Slide texture (chrome - bright blue-tinted chrome body)
    g.clear();
    g.fillStyle(0xb0d0ff, 1); // Bright blue-tinted chrome
    g.fillRoundedRect(0, 5, 50, 25, 6);
    this.drawSolanaLogo(g, 25, 17, 0.7);
    g.fillStyle(0x9b5cff, 1);
    g.fillRoundedRect(35, 2, 15, 10, 3);
    g.generateTexture('player-slide-chrome', 55, 32);
    
    // Slide texture (neon - bright green body)
    g.clear();
    g.fillStyle(0x00ff00, 1); // Bright green
    g.fillRoundedRect(0, 5, 50, 25, 6);
    this.drawSolanaLogo(g, 25, 17, 0.7);
    g.fillStyle(0x9b5cff, 1);
    g.fillRoundedRect(35, 2, 15, 10, 3);
    g.generateTexture('player-slide-neon', 55, 32);
    
    // Slide texture (diamond - bright cyan body)
    g.clear();
    g.fillStyle(0x00ffff, 1); // Bright cyan
    g.fillRoundedRect(0, 5, 50, 25, 6);
    this.drawSolanaLogo(g, 25, 17, 0.7);
    g.fillStyle(0x9b5cff, 1);
    g.fillRoundedRect(35, 2, 15, 10, 3);
    g.generateTexture('player-slide-diamond', 55, 32);
    
    // Slide texture (gold - golden body)
    g.clear();
    g.fillStyle(0xffd700, 1); // Gold
    g.fillRoundedRect(0, 5, 50, 25, 6);
    this.drawSolanaLogo(g, 25, 17, 0.7);
    g.fillStyle(0x9b5cff, 1);
    g.fillRoundedRect(35, 2, 15, 10, 3);
    g.generateTexture('player-slide-gold', 55, 32);
    
    // Slide texture (holographic - magenta body)
    g.clear();
    g.fillStyle(0xff00ff, 1); // Magenta
    g.fillRoundedRect(0, 5, 50, 25, 6);
    this.drawSolanaLogo(g, 25, 17, 0.7);
    g.fillStyle(0x9b5cff, 1);
    g.fillRoundedRect(35, 2, 15, 10, 3);
    g.generateTexture('player-slide-holographic', 55, 32);

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

    // Default white particle
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(3, 3, 3);
    g.generateTexture('particle', 6, 6);
    
    // Trail-specific colored particles (for proper color display)
    // Neon trail particles (green)
    g.clear();
    g.fillStyle(0x00ff88, 1); // Primary neon green
    g.fillCircle(3, 3, 3);
    g.generateTexture('particle-neon', 6, 6);
    
    // Fire trail particles (orange/red)
    g.clear();
    g.fillStyle(0xff6600, 1); // Primary fire orange
    g.fillCircle(3, 3, 3);
    g.generateTexture('particle-fire', 6, 6);
    
    // Rainbow trail particles (use first color - red)
    g.clear();
    g.fillStyle(0xff0000, 1); // Primary rainbow red
    g.fillCircle(3, 3, 3);
    g.generateTexture('particle-rainbow', 6, 6);
    
    // Diamond trail particles (cyan)
    g.clear();
    g.fillStyle(0x00ffff, 1); // Primary diamond cyan
    g.fillCircle(3, 3, 3);
    g.generateTexture('particle-diamond', 6, 6);
    
    // Rainbow trail particles - create one for each rainbow color
    const rainbowColors = [0xff0000, 0xff7700, 0xffff00, 0x00ff00, 0x0077ff, 0x8800ff];
    rainbowColors.forEach((color, i) => {
      g.clear();
      g.fillStyle(color, 1);
      g.fillCircle(3, 3, 3);
      g.generateTexture(`particle-rainbow-${i}`, 6, 6);
    });

    // WHALE TOKEN - Rare reward, blue whale shape (collectible)
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

    // WHALE LEADER - Larger whale that leads the trail (back view, swimming away)
    g.clear();
    // Whale body (larger, from behind)
    g.fillStyle(0x0088ff, 1);
    g.fillEllipse(30, 28, 40, 22);
    // Tail flukes (prominent from behind)
    g.fillStyle(0x00aaff, 1);
    g.fillTriangle(30, 8, 10, 0, 50, 0); // Wide tail at top
    g.fillTriangle(30, 8, 20, 16, 40, 16); // Tail connects to body
    // Back detail
    g.fillStyle(0x0066cc, 1);
    g.fillEllipse(30, 32, 30, 12);
    // Dorsal fin
    g.fillStyle(0x00aaff, 1);
    g.fillTriangle(30, 18, 25, 30, 35, 30);
    // Side fins visible
    g.fillStyle(0x0099ee, 1);
    g.fillEllipse(12, 35, 10, 6);
    g.fillEllipse(48, 35, 10, 6);
    // Bubble trail hint
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(30, 50, 4);
    g.fillCircle(25, 55, 3);
    g.fillCircle(35, 55, 3);
    g.generateTexture('whale-leader', 60, 60);

    // BUBBLE - Small white whale trail bubble
    g.clear();
    // Outer glow - soft white
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(10, 10, 10);
    // Main bubble - white/cyan
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(10, 10, 7);
    // Inner highlight - light cyan
    g.fillStyle(0x88ffff, 0.6);
    g.fillCircle(10, 10, 4);
    // Shine
    g.fillStyle(0xffffff, 1);
    g.fillCircle(7, 7, 2);
    g.generateTexture('item-bubble', 20, 20);
    
    g.destroy();
  }
}
