'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Arms scroll reveals once JS runs: content renders visible on the server and
 * only hides after this effect sets `data-armed`, so a failed hydration never
 * leaves the page blank. Each `[data-reveal]` gets `data-in` when it enters.
 */
export function RevealPage({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !('IntersectionObserver' in window)) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.in = 'true';
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
    );

    for (const el of targets) {
      // Anything already scrolled past stays shown rather than replaying.
      if (el.getBoundingClientRect().bottom < 0) el.dataset.in = 'true';
      else io.observe(el);
    }
    root.dataset.armed = 'true';

    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
