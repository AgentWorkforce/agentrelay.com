'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Wraps a scene in a parallax "camera". A fine pointer tilts the camera by
 * writing --px/--py (-1..1) for the layers to translate against, and the
 * scene's CSS animations pause while it is off screen. Reduced-motion users
 * get a still scene: no pointer tracking.
 */
export function DepthStage({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const view = new IntersectionObserver(([entry]) => {
      el.dataset.paused = entry.isIntersecting ? 'false' : 'true';
    });
    view.observe(el);

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (still || !finePointer) return () => view.disconnect();

    let frame = 0;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const tick = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      el.style.setProperty('--px', current.x.toFixed(4));
      el.style.setProperty('--py', current.y.toFixed(4));
      const settled = Math.abs(target.x - current.x) < 0.001 && Math.abs(target.y - current.y) < 0.001;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      target.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      target.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      kick();
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      kick();
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      view.disconnect();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
