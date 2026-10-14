'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import s from './home-8.module.css';

/**
 * The page root. Content is visible without script; once mounted it sets
 * `data-motion` so `[data-reveal]` children start hidden and rise in, once,
 * when they enter the viewport.
 */
export function RevealRoot({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.dataset.motion = 'on';
    const targets = root.querySelectorAll<HTMLElement>('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add(s.isIn);
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={s.page}>
      {children}
    </div>
  );
}
