import Phaser from 'phaser';
import { getDevice } from './device';

export function spawnSpark(scene: Phaser.Scene, x: number, y: number, tint: number = 0x9b5cff) {
  const device = getDevice();
  
  // Skip particles entirely in very low performance scenarios
  // or reduce particle count significantly for WebViews
  if (device.isLowPerformance) {
    // Minimal particle effect for WebView/Phantom
    const emitter = scene.add.particles(x, y, 'particle', {
      lifespan: 250,           // Shorter lifespan
      speed: { min: 60, max: 100 },  // Slower = less updates
      scale: { start: 0.8, end: 0 },
      tint,
      quantity: 2,             // Only 2 particles instead of 6
    });
    scene.time.delayedCall(300, () => emitter.destroy());
    return;
  }
  
  const emitter = scene.add.particles(x, y, 'particle', {
    lifespan: 400,
    speed: { min: 80, max: 160 },
    scale: { start: 1, end: 0 },
    tint,
    quantity: 6,
  });
  scene.time.delayedCall(450, () => emitter.destroy());
}
