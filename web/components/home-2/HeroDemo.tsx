'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { LOOP_MS, STEPS, stepAt } from './script';
import { Workspace } from './Workspace';
import s from './home-2.module.css';

const TICK_MS = 100;

export function HeroDemo() {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [onScreen, setOnScreen] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce.matches) {
      setPlaying(false);
      setElapsed(STEPS[2].start + 3500);
    }
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !onScreen) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setElapsed((value) => (value + TICK_MS >= LOOP_MS ? 0 : value + TICK_MS));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, onScreen]);

  const current = stepAt(elapsed);

  return (
    <div className={s.demo} ref={rootRef}>
      <div className={s.demoGlow} aria-hidden="true" />
      <div
        aria-label="Simulated Agent Relay workspace: Claude Code, Codex, Conductor and a teammate's Cursor session coordinating one fix"
        role="img"
      >
        <Workspace elapsed={elapsed} />
      </div>

      <div className={s.scrubber}>
        <button
          aria-label={playing ? 'Pause demo' : 'Play demo'}
          className={s.playButton}
          onClick={() => setPlaying((value) => !value)}
          type="button"
        >
          {playing ? (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="4" y="3" width="2.6" height="10" rx="1" fill="currentColor" />
              <rect x="9.4" y="3" width="2.6" height="10" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.4-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5Z" fill="currentColor" />
            </svg>
          )}
        </button>
        <ol className={s.steps}>
          {STEPS.map((step, index) => {
            const end = STEPS[index + 1]?.start ?? LOOP_MS;
            const fill = index < current ? 1 : index === current ? (elapsed - step.start) / (end - step.start) : 0;
            return (
              <li key={step.id}>
                <button
                  aria-current={index === current ? 'step' : undefined}
                  className={s.stepButton}
                  onClick={() => setElapsed(step.start)}
                  type="button"
                >
                  <span className={s.stepTrack}>
                    <i style={{ '--fill': Math.min(1, Math.max(0, fill)) } as CSSProperties} />
                  </span>
                  <span className={s.stepLabel}>
                    <span className={s.stepNum}>{index + 1}</span>
                    {step.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <p className={s.caption} aria-live={playing ? 'off' : 'polite'} key={STEPS[current].id}>
        {STEPS[current].caption}
      </p>
    </div>
  );
}
