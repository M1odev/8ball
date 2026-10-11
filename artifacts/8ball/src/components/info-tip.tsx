import { useEffect, useId, useRef, useState } from 'react';

export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setPinned(false); } };
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setPinned(false); } };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open]);
  return (
    <span className="info-tip" ref={ref}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => { if (!pinned) setOpen(false); }}>
      <button type="button" className="info-btn" aria-label={label} aria-expanded={open} aria-describedby={id}
        onFocus={() => setOpen(true)} onBlur={() => { if (!pinned) setOpen(false); }}
        onClick={() => { const next = !pinned; setPinned(next); setOpen(next); }}>i</button>
      <span id={id} role="tooltip" className={`info-pop${open ? ' is-open' : ''}`}>{children}</span>
    </span>
  );
}
