import type { PointerEvent as ReactPointerEvent } from 'react';

type ResizeAxis = 'x' | 'y';

function startPointerResize(
  event: ReactPointerEvent<HTMLElement>,
  options: {
    startSize: number;
    axis: ResizeAxis;
    /** +1 increases size along the axis; -1 reverses it. */
    direction?: 1 | -1;
    onSize: (size: number) => void;
  },
): void {
  event.preventDefault();
  const startCoord = options.axis === 'x' ? event.clientX : event.clientY;
  const { startSize, onSize, axis } = options;
  const direction = options.direction ?? 1;
  const target = event.currentTarget;
  target.setPointerCapture(event.pointerId);

  const onMove = (moveEvent: globalThis.PointerEvent) => {
    const current = axis === 'x' ? moveEvent.clientX : moveEvent.clientY;
    onSize(startSize + direction * (current - startCoord));
  };

  const onUp = () => {
    target.releasePointerCapture(event.pointerId);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

/** Drag a vertical splitter to resize a workspace or graph column. */
export function startColumnResize(
  event: ReactPointerEvent<HTMLElement>,
  options: {
    startWidth: number;
    direction?: 1 | -1;
    onWidth: (width: number) => void;
  },
): void {
  startPointerResize(event, {
    startSize: options.startWidth,
    axis: 'x',
    direction: options.direction,
    onSize: options.onWidth,
  });
}

/** Drag a horizontal splitter to resize graph search results. */
export function startRowResize(
  event: ReactPointerEvent<HTMLElement>,
  options: {
    startHeight: number;
    direction?: 1 | -1;
    onHeight: (height: number) => void;
  },
): void {
  startPointerResize(event, {
    startSize: options.startHeight,
    axis: 'y',
    direction: options.direction,
    onSize: options.onHeight,
  });
}
