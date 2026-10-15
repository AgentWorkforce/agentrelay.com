'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import landing from '../../app/landing.module.css';
import s from './carousel.module.css';

export type CarouselItem = {
  id: string;
  title: string;
  line: string;
  visual: ReactNode;
  /** How long this item stays before handing on, in ms. */
  ms?: number;
};

/**
 * A list of items beside one large window on an accent card. The active
 * item fills its progress line, then hands on to the next; picking one
 * switches the window straight to it. The countdown runs only while the
 * carousel is in view; without motion, nothing auto-advances. `flip` puts
 * the window on the left; `footer` sits under the list.
 */
export function Carousel({
  items,
  label,
  accent = 'blue',
  flip = false,
  footer,
}: {
  items: CarouselItem[];
  label: string;
  accent?: 'blue' | 'orange';
  flip?: boolean;
  footer?: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = `${items[0].id}-panel`;

  // Only count down while the carousel is on screen, so it starts on the first item.
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={s.carousel} ref={root} data-playing={inView || undefined} data-flip={flip || undefined}>
      <div className={s.side}>
        <ol className={s.list} role="tablist" aria-label={label}>
          {items.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={index === active}
                aria-controls={panelId}
                className={s.tab}
                onClick={() => setActive(index)}
              >
                <span className={s.track}>
                  {index === active ? (
                    <i
                      key={active}
                      className={s.progress}
                      style={{ animationDuration: `${item.ms ?? 8000}ms` }}
                      onAnimationEnd={() => setActive((active + 1) % items.length)}
                    />
                  ) : null}
                </span>
                <span className={s.label}>
                  <b>{item.title}</b>
                  <span>{item.line}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        {footer}
      </div>

      <div className={s.stage} id={panelId} role="tabpanel" aria-labelledby={`tab-${items[active].id}`}>
        <div className={accent === 'orange' ? landing.previewAccent : landing.previewAccentBlue} />
        <div className={s.window} key={items[active].id}>
          {items[active].visual}
        </div>
      </div>
    </div>
  );
}
