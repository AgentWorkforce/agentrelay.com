'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

import { TOOLS, type Tool } from './RotatingHeadline';
import s from './hero-logo-cloud.module.css';

/**
 * Where each tile sits, as a share of the hero, kept clear of the centred copy.
 * `wide` tiles only show once there is room beside the headline.
 */
const TILES: { tool: Tool; x: number; y: number; tilt: number; wide?: boolean }[] = [
  { tool: 'claude', x: 7, y: 26, tilt: -7 },
  { tool: 'conductor', x: 25, y: 7, tilt: 5 },
  { tool: 'cursor', x: 17, y: 46, tilt: 4, wide: true },
  { tool: 'devin', x: 5, y: 62, tilt: -4 },
  { tool: 'paseo', x: 22, y: 72, tilt: 6, wide: true },
  { tool: 'muse', x: 12, y: 9, tilt: 3, wide: true },
  { tool: 'hermes', x: 3, y: 44, tilt: 5, wide: true },
  { tool: 'dots', x: 11, y: 84, tilt: -5, wide: true },
  { tool: 'pi', x: 31, y: 58, tilt: 4, wide: true },
  { tool: 'codex', x: 93, y: 26, tilt: 6 },
  { tool: 'antigravity', x: 75, y: 7, tilt: -4 },
  { tool: 'opencode', x: 83, y: 46, tilt: -5, wide: true },
  { tool: 'grok', x: 95, y: 62, tilt: 4 },
  { tool: 'openclaw', x: 78, y: 72, tilt: -6, wide: true },
  { tool: 'capy', x: 88, y: 9, tilt: -3, wide: true },
  { tool: 'grokbot', x: 97, y: 44, tilt: -5, wide: true },
  { tool: 'custom', x: 89, y: 84, tilt: 5, wide: true },
];

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Bolt speed in px per ms, and how long each bolt is. */
const SPEED = 0.9;
const BOLT = 46;

/**
 * The hero's backdrop: every agent we connect, floating on its own tile and
 * firing faint laser bolts at the others, as if they were chatting. A bolt
 * flies from tile to tile, the target glows when it lands, and about half the
 * time it answers. Quiet while the hero is off screen; still under reduced motion.
 */
export function HeroLogoCloud() {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(root);

    const tiles = () => [...root.querySelectorAll<HTMLElement>('[data-tile]')].filter((el) => el.offsetWidth > 0);

    const centre = (el: HTMLElement, box: DOMRect) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
    };

    const fire = (from: HTMLElement, to: HTMLElement, replying: boolean) => {
      const box = root.getBoundingClientRect();
      const a = centre(from, box);
      const b = centre(to, box);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const duration = len / SPEED;

      // A soft glow under a thin bright core, both riding the same dash.
      const beams = [s.glow, s.core].map((className) => {
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', String(a.x));
        line.setAttribute('y1', String(a.y));
        line.setAttribute('x2', String(b.x));
        line.setAttribute('y2', String(b.y));
        line.setAttribute('class', className);
        line.style.strokeDasharray = `${BOLT} ${len + BOLT}`;
        svg.appendChild(line);
        return line.animate([{ strokeDashoffset: BOLT }, { strokeDashoffset: -len }], {
          duration,
          easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
        });
      });

      from.animate([{ boxShadow: 'var(--fire)' }, { boxShadow: 'var(--rest)' }], { duration: 500, easing: 'ease-out' });

      beams[0].finished
        .then(() => {
          beams.forEach((beam) => (beam.effect as KeyframeEffect).target?.remove());
          to.animate([{ boxShadow: 'var(--hit)', scale: '1.06' }, { boxShadow: 'var(--rest)', scale: '1' }], {
            duration: 700,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          });
          if (!replying && Math.random() < 0.5) later(() => fire(to, from, true), 250 + Math.random() * 400);
        })
        .catch(() => {});
    };

    const tick = () => {
      const all = tiles();
      if (visible && !document.hidden && all.length > 1) {
        const from = all[Math.floor(Math.random() * all.length)];
        const others = all.filter((el) => el !== from);
        fire(from, others[Math.floor(Math.random() * others.length)], false);
      }
      later(tick, 900 + Math.random() * 1100);
    };
    later(tick, 1200);

    return () => {
      observer.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
      svg.replaceChildren();
    };
  }, []);

  return (
    <div className={s.cloud} ref={rootRef} aria-hidden="true">
      <svg className={s.beams} ref={svgRef} />
      {TILES.map(({ tool, x, y, tilt, wide }, index) => (
        <span
          className={s.slot}
          data-wide={wide ? '' : undefined}
          key={tool}
          style={{ '--x': `${x}%`, '--y': `${y}%`, '--tilt': `${tilt}deg`, '--i': index } as CSSProperties}
        >
          <span className={s.tile} data-tile="">
            {TOOLS[tool].logo}
          </span>
        </span>
      ))}
    </div>
  );
}
