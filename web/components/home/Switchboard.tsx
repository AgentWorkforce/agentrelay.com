'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

import switchboard from '../../public/home/bell-switchboard.jpg';
import s from './switchboard.module.css';

/**
 * The pain, named: you connect every handoff by hand, like an operator.
 * Content is visible without script; once mounted, `[data-reveal]` blocks
 * start lowered and rise in once as they enter the viewport.
 */
export function Switchboard() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.dataset.motion = 'on';
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
    root.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className={s.switchboard} aria-labelledby="switchboard-title">
      <div className={s.inner}>
        <div className={s.text}>
          <h2 id="switchboard-title" className={s.title} data-reveal>
            Right now, you are the switchboard.
          </h2>
          <div className={s.copy} data-reveal>
            <p className={s.lead}>Some days you work for your agents, not the other way around.</p>
            <p>You carry context between them all day. Then at standup you learn a teammate’s agent already fixed it.</p>
          </div>
        </div>
        <figure className={s.figure} data-reveal>
          <div className={s.photo}>
            <Image
              src={switchboard}
              alt="A long row of telephone operators in headsets plugging cords into a Bell System switchboard"
              sizes="(max-width: 900px) 100vw, 58vw"
              className={s.img}
            />
          </div>
        </figure>
      </div>
    </section>
  );
}
