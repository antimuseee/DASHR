import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import Boot from '../game/Boot';
import Preload from '../game/Preload';
import MainScene from '../game/Main';
import { attachSwipe } from '../utils/swipes';
import { gameActions, useGameStore } from '../utils/store';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const phaserRef = useRef<Phaser.Game | null>(null);
  const runId = useGameStore((s) => s.runId);

  useEffect(() => {
    if (!containerRef.current || phaserRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: containerRef.current,
      width: 360,
      height: 640,
      backgroundColor: '#070513',
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 1400 }, debug: false },
      },
      scale: {
        mode: Phaser.Scale.ENVELOP,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: { pixelArt: true },
      scene: [Boot, Preload, MainScene],
    });

    phaserRef.current = game;

    const destroySwipe = attachSwipe(containerRef.current, {
      onUp: () => game.events.emit('input:jump'),
      onDown: () => game.events.emit('input:slide'),
      onLeft: () => game.events.emit('input:left'),
      onRight: () => game.events.emit('input:right'),
    });

    const onResize = () => game.scale.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', onResize);
    onResize();

    return () => {
      destroySwipe();
      window.removeEventListener('resize', onResize);
      game.destroy(true);
      phaserRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!phaserRef.current) return;
    if (runId > 0) {
      phaserRef.current.scene.getScenes(true).forEach((s) => {
        if (s.scene.key === 'Main') {
          (s as unknown as { restartRun: () => void }).restartRun?.();
        }
      });
    }
  }, [runId]);

  return <div ref={containerRef} className="game-host" aria-label="Trench Runner game canvas" />;
}
