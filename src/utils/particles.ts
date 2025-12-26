import Phaser from 'phaser';

export function spawnSpark(scene: Phaser.Scene, x: number, y: number, tint: number = 0x9b5cff) {
  const emitter = scene.add.particles(x, y, 'particle', {
    lifespan: 400,
    speed: { min: 80, max: 160 },
    scale: { start: 1, end: 0 },
    tint,
    quantity: 6,
  });
  scene.time.delayedCall(450, () => emitter.destroy());
}
