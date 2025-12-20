import Hammer from 'hammerjs';

type SwipeHandlers = {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
};

export function attachSwipe(element: HTMLElement, handlers: SwipeHandlers) {
  const hammer = new Hammer.Manager(element, { touchAction: 'auto' });
  hammer.add(new Hammer.Swipe({ 
    direction: Hammer.DIRECTION_ALL,
    threshold: 30, // Minimum distance for swipe
    velocity: 0.3, // Minimum velocity
  }));

  // Debounce to prevent double-firing
  let lastSwipeTime = 0;
  const SWIPE_COOLDOWN = 150; // ms between swipes
  
  const debounced = (handler?: () => void) => {
    const now = Date.now();
    if (now - lastSwipeTime < SWIPE_COOLDOWN) return;
    lastSwipeTime = now;
    handler?.();
  };

  hammer.on('swipeup', () => debounced(handlers.onUp));
  hammer.on('swipedown', () => debounced(handlers.onDown));
  hammer.on('swipeleft', () => debounced(handlers.onLeft));
  hammer.on('swiperight', () => debounced(handlers.onRight));

  return () => hammer.destroy();
}
