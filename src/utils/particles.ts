import Phaser from 'phaser';

// Pre-created emitter pool for different colors to avoid creating new emitters at runtime
// This prevents lag spikes on mobile when activating boosts
const sparkEmitterPool: Map<Phaser.Scene, Map<number, Phaser.GameObjects.Particles.ParticleEmitter>> = new Map();

// Colors used in the game for sparks
const SPARK_COLORS = [
  0x9b5cff, // purple (default)
  0xffd700, // gold (double boost, coins)
  0x00ffff, // cyan (shield)
  0xff00ff, // magenta (magnet)
  0x00ff00, // green (extra life)
  0x00aaff, // blue (whale token)
  0xffffff, // white (fallback)
];

// Initialize the emitter pool for a scene - call this in scene create()
export function initSparkEmitters(scene: Phaser.Scene) {
  const sceneEmitters = new Map<number, Phaser.GameObjects.Particles.ParticleEmitter>();
  
  for (const color of SPARK_COLORS) {
    const emitter = scene.add.particles(0, 0, 'particle', {
      lifespan: 400,
      speed: { min: 80, max: 160 },
      scale: { start: 1, end: 0 },
      tint: color,
      emitting: false, // Don't auto-emit, we'll call emitParticleAt manually
    });
    emitter.setDepth(100);
    sceneEmitters.set(color, emitter);
  }
  
  sparkEmitterPool.set(scene, sceneEmitters);
  console.log('[Particles] Spark emitter pool initialized with', SPARK_COLORS.length, 'colors');
}

// Clean up emitters when scene is destroyed
export function destroySparkEmitters(scene: Phaser.Scene) {
  const sceneEmitters = sparkEmitterPool.get(scene);
  if (sceneEmitters) {
    sceneEmitters.forEach(emitter => emitter.destroy());
    sparkEmitterPool.delete(scene);
  }
}

export function spawnSpark(scene: Phaser.Scene, x: number, y: number, tint: number = 0x9b5cff) {
  const sceneEmitters = sparkEmitterPool.get(scene);
  
  if (sceneEmitters) {
    // Find exact color match or closest color
    let emitter = sceneEmitters.get(tint);
    
    // If no exact match, use white as fallback
    if (!emitter) {
      emitter = sceneEmitters.get(0xffffff);
    }
    
    if (emitter) {
      // Emit particles at position using pre-created emitter
      emitter.emitParticleAt(x, y, 6);
      return;
    }
  }
  
  // Fallback: create emitter if pool not initialized (shouldn't happen normally)
  const emitter = scene.add.particles(x, y, 'particle', {
    lifespan: 400,
    speed: { min: 80, max: 160 },
    scale: { start: 1, end: 0 },
    tint,
    quantity: 6,
  });
  scene.time.delayedCall(450, () => emitter.destroy());
}
