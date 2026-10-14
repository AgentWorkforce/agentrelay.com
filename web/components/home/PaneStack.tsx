'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import s from './switchboard.module.css';

/**
 * Pins the hero once its bottom reaches the bottom of the viewport, so the
 * pane that follows it rises over the marquee instead of the marquee
 * scrolling away. The hero is taller than the viewport, so its sticky offset
 * is the (negative) difference, measured here and kept current on resize.
 */
export function PaneStack({ hero, children }: { hero: ReactNode; children: ReactNode }) {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const update = () => {
      el.style.setProperty('--hero-stick', `${Math.min(0, window.innerHeight - el.offsetHeight)}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className={s.stack}>
      <div className={s.pinned} ref={heroRef}>
        {hero}
      </div>
      {children}
    </div>
  );
}
