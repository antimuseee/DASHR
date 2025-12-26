import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import Boot from '../game/Boot';
import Preload from '../game/Preload';
import MainScene from '../game/Main';
import { attachSwipe } from '../utils/swipes';
import { getDevice } from '../utils/device';

// Store game reference globally so menus can restart
declare global {
  interface Window {
    phaserGame: Phaser.Game | null;
  }
}

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const phaserRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || phaserRef.current) return;

    // Wait for next frame to ensure DOM is fully laid out
    const initGame = () => {
      if (!containerRef.current) return;
      
      const device = getDevice();
      
      // Performance-optimized config for WebViews (Phantom, etc.)
      // WebViews have significantly lower performance than native browsers
      const isLowPerf = device.isLowPerformance;
      
      if (isLowPerf) {
        console.log('[GameCanvas] Low performance mode enabled for WebView');
      }
      
      const game = new Phaser.Game({
      // Use CANVAS for WebViews (more consistent, avoids WebGL issues)
      type: isLowPerf ? Phaser.CANVAS : Phaser.AUTO,
      parent: containerRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#070513',
      physics: {
        default: 'arcade',
        arcade: { 
          gravity: { x: 0, y: 1400 }, 
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: { 
        pixelArt: true,
        // Disable anti-aliasing for WebViews (slight perf boost)
        antialias: !isLowPerf,
      },
      scene: [Boot, Preload, MainScene],
      input: {
        keyboard: {
          target: window, // Default, but we handle keys ourselves
        },
      },
      disableContextMenu: true,
    });

    phaserRef.current = game;
    window.phaserGame = game;

      // Swipe controls for mobile
      const destroySwipe = attachSwipe(containerRef.current!, {
        onUp: () => game.events.emit('input:jump'),
        onDown: () => game.events.emit('input:slide'),
        onLeft: () => game.events.emit('input:left'),
        onRight: () => game.events.emit('input:right'),
      });

      // Store cleanup function
      (containerRef.current as any)._cleanup = () => {
        destroySwipe();
        window.phaserGame = null;
        game.destroy(true);
        phaserRef.current = null;
      };
    };

    // Use requestAnimationFrame to ensure DOM is ready with proper dimensions
    const frameId = requestAnimationFrame(() => {
      requestAnimationFrame(initGame);
    });

    return () => {
      cancelAnimationFrame(frameId);
      if ((containerRef.current as any)?._cleanup) {
        (containerRef.current as any)._cleanup();
      }
    };
  }, []);

  return <div ref={containerRef} className="game-host" />;
}
