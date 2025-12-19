import Hammer from 'hammerjs';

type SwipeHandlers = {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
};

export function attachSwipe(element: HTMLElement, handlers: SwipeHandlers) {
  const hammer = new Hammer.Manager(element, { touchAction: 'auto' });
  hammer.add(new Hammer.Swipe({ direction: Hammer.DIRECTION_ALL }));

  hammer.on('swipeup', () => handlers.onUp?.());
  hammer.on('swipedown', () => handlers.onDown?.());
  hammer.on('swipeleft', () => handlers.onLeft?.());
  hammer.on('swiperight', () => handlers.onRight?.());

  return () => hammer.destroy();
}
