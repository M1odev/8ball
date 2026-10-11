import { type CSSProperties, type PointerEvent, type ReactNode, useRef, useState } from 'react';

type Drag = { id: number; x: number; y: number; left: number; right: number; up: number };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function PlayfulBall({ children, label }: { children: ReactNode; label: string }) {
  const drag = useRef<Drag | null>(null);
  const moved = useRef(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [bouncing, setBouncing] = useState(false);

  const start = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || drag.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    moved.current = false;
    drag.current = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      left: Math.max(0, Math.min(80, rect.left - 16)),
      right: Math.max(0, Math.min(80, window.innerWidth - rect.right - 16)),
      up: Math.max(0, Math.min(64, rect.top - 16)),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const origin = drag.current;
    if (!origin || origin.id !== event.pointerId) return;
    const x = event.clientX - origin.x;
    const y = event.clientY - origin.y;
    if (Math.hypot(x, y) > 6) moved.current = true;
    setOffset({ x: clamp(x, -origin.left, origin.right), y: clamp(y, -origin.up, 64) });
  };

  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (event.type === 'pointercancel') moved.current = true;
    setDragging(false);
    setOffset({ x: 0, y: 0 });
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <button type="button" className={`orb-play${dragging ? ' is-dragging' : ''}`}
      data-testid="button-play-ball" aria-label={`${label}. Click to bounce or drag to play.`}
      style={{ '--drag-x': `${offset.x}px`, '--drag-y': `${offset.y}px`, '--drag-angle': `${offset.x / 8}deg` } as CSSProperties}
      onPointerDown={start} onPointerMove={move} onPointerUp={finish}
      onPointerCancel={finish} onLostPointerCapture={finish}
      onClick={event => {
        const wasDrag = moved.current;
        moved.current = false;
        if (wasDrag && event.detail > 0) return;
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setBouncing(true);
      }}>
      <span className={`orb-bounce${bouncing ? ' is-bouncing' : ''}`}
        onAnimationEnd={event => {
          if (event.animationName === 'ball-hop') setBouncing(false);
        }}>
        <span className="orb-hover">{children}</span>
      </span>
    </button>
  );
}
