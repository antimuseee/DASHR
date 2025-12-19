import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import Boot from '../game/Boot';
import Preload from '../game/Preload';
import MainScene from '../game/Main';
import { attachSwipe } from '../utils/swipes';
import { useGameStore } from '../utils/store';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const phaserRef = useRef<Phaser.Game | null>(null);
  const runId = useGameStore((s) => s.runId);

  useEffect(() => {
    if (!containerRef.current || phaserRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: containerRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#070513',
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 1400 }, debug: false },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: { pixelArt: true },
      scene: [Boot, Preload, MainScene],
    });

    phaserRef.current = game;

    // Swipe controls for mobile
    const destroySwipe = attachSwipe(containerRef.current, {
      onUp: () => game.events.emit('input:jump'),
      onDown: () => game.events.emit('input:slide'),
      onLeft: () => game.events.emit('input:left'),
      onRight: () => game.events.emit('input:right'),
    });

    return () => {
      destroySwipe();
      game.destroy(true);
      phaserRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!phaserRef.current) return;
    if (runId > 0) {
      const mainScene = phaserRef.current.scene.getScene('Main') as MainScene | null;
      mainScene?.restartRun?.();
    }
  }, [runId]);

  return <div ref={containerRef} className="game-host" />;
}
