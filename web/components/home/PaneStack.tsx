'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import s from './switchboard.module.css';

/**
 * Pins the hero while the pane that follows rises over its agent marquee,
 * then lets both scroll on together once the marquee is covered.
 *
 * The hero sticks once its bottom meets the viewport's bottom (`--hero-stick`,
 * negative when the hero is taller than the viewport). Its track is taller
 * than the hero by `--pin-travel`, the marquee's height, so the pin holds for
 * exactly that much scroll; the pane is pulled up by the same amount so it
 * still starts right under the hero.
 */
export function PaneStack({ hero, children }: { hero: ReactNode; children: ReactNode }) {
  const stackRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stack = stackRef.current;
    const heroEl = heroRef.current;
    if (!stack || !heroEl) return;
    const update = () => {
      const marquee = heroEl.querySelector('[data-marquee-band]');
      const heroBox = heroEl.getBoundingClientRect();
      const travel = marquee ? heroBox.bottom - marquee.getBoundingClientRect().top : 0;
      stack.style.setProperty('--hero-stick', `${Math.min(0, window.innerHeight - heroEl.offsetHeight)}px`);
      stack.style.setProperty('--pin-travel', `${Math.max(0, Math.round(travel))}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(heroEl);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className={s.stack} ref={stackRef}>
      <div className={s.track}>
        <div className={s.pinned} ref={heroRef}>
          {hero}
        </div>
      </div>
      <div className={s.rising}>{children}</div>
    </div>
  );
}
