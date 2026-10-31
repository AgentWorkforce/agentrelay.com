'use client';

import { useEffect, useRef } from 'react';

import { TOOLS, type Tool } from './RotatingHeadline';
import s from './hero-logo-cloud.module.css';

/** Every agent from "Let X talk to Y", in ring order, big names spread apart. */
const RING: Tool[] = [
  'claude',
  'muse',
  'codex',
  'dots',
  'cursor',
  'hermes',
  'opencode',
  'capy',
  'grok',
  'paseo',
  'antigravity',
  'pi',
  'conductor',
  'grokbot',
  'devin',
  'openclaw',
  'custom',
];

/** One lap of the ring, in ms. */
const LAP = 150_000;
/** The ring leans this far, in radians, so it reads as an orbit seen at an angle. */
const LEAN = (-10 * Math.PI) / 180;
/** Bolt speed in px per ms, and how long each bolt is. */
const SPEED = 0.9;
const BOLT = 46;
const SVG_NS = 'http://www.w3.org/2000/svg';

type Point = { x: number; y: number };
type Bolt = { from: number; to: number; start: number; duration: number; lines: SVGLineElement[]; replying: boolean };

const lerp = (a: Point, b: Point, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * The hero's backdrop: every agent we connect, on tiles orbiting the headline
 * along a tilted ring. Tiles on the far side of the ring shrink and dim. They
 * fire laser bolts at each other as if chatting: a bolt chases its target
 * around the ring, the target glows when it lands, and about half the time it
 * answers. Paused while the hero is off screen; a still ring while reduced motion
 * is on; left out on phones, where the copy fills the width.
 */
export function HeroLogoCloud() {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;
    const slots = [...root.querySelectorAll<HTMLElement>('[data-slot]')];
    const tiles = slots.map((slot) => slot.firstElementChild as HTMLElement);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let width = 0;
    let height = 0;
    let spin = 0;
    let timer = 0;
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      if (!timer) layout(spin);
    });
    resize.observe(root);

    const positions: Point[] = slots.map(() => ({ x: 0, y: 0 }));

    /** Places every tile on the ring at `spin` radians. */
    const layout = (spin: number) => {
      if (!width) return;
      const rx = Math.min(width * 0.36, 560);
      const ry = height * 0.3;
      const cx = width / 2;
      const cy = height * 0.4;
      slots.forEach((slot, index) => {
        const angle = spin + (index / slots.length) * Math.PI * 2;
        const ex = rx * Math.cos(angle);
        const ey = ry * Math.sin(angle);
        const x = cx + ex * Math.cos(LEAN) - ey * Math.sin(LEAN);
        const y = cy + ex * Math.sin(LEAN) + ey * Math.cos(LEAN);
        // Near side (bottom of the ring) is 1, far side 0.
        const near = (Math.sin(angle) + 1) / 2;
        // Tiles fade as they pass behind the centred copy, so it stays clean.
        const aside = Math.min(1, Math.abs(x - cx) / (rx * 0.55));
        positions[index] = { x, y };
        slot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${0.72 + 0.28 * near})`;
        slot.style.opacity = String((0.35 + 0.65 * near) * (0.25 + 0.75 * aside));
        slot.style.zIndex = String(Math.round(near * 10));
      });
    };

    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(root);

    const bolts = new Set<Bolt>();

    const fire = (from: number, to: number, replying: boolean, now: number) => {
      const len = Math.hypot(positions[to].x - positions[from].x, positions[to].y - positions[from].y);
      // A soft glow under a thin bright core.
      const lines = [s.glow, s.core].map((className) => {
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('class', className);
        svg.appendChild(line);
        return line;
      });
      bolts.add({ from, to, start: now, duration: len / SPEED, lines, replying });
      tiles[from].animate([{ boxShadow: 'var(--fire)' }, { boxShadow: 'var(--rest)' }], { duration: 500, easing: 'ease-out' });
    };

    const land = (bolt: Bolt, now: number) => {
      bolt.lines.forEach((line) => line.remove());
      bolts.delete(bolt);
      tiles[bolt.to].animate([{ boxShadow: 'var(--hit)', scale: '1.08' }, { boxShadow: 'var(--rest)', scale: '1' }], {
        duration: 700,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      });
      if (!bolt.replying && Math.random() < 0.5) {
        const reply = now + 250 + Math.random() * 400;
        queue.push({ at: reply, from: bolt.to, to: bolt.from });
      }
    };

    const queue: { at: number; from: number; to: number }[] = [];
    let nextShot = 0;
    let last = 0;

    const frame = (now: number) => {
      const dt = now - last;
      last = now;
      // `width` is 0 while the ring is hidden on phones.
      if (visible && width && !document.hidden) {
        spin += (dt / LAP) * Math.PI * 2;
        layout(spin);

        if (now >= nextShot) {
          const from = Math.floor(Math.random() * slots.length);
          const to = (from + 1 + Math.floor(Math.random() * (slots.length - 1))) % slots.length;
          fire(from, to, false, now);
          nextShot = now + 900 + Math.random() * 1100;
        }
        for (let i = queue.length - 1; i >= 0; i--) {
          if (now >= queue[i].at) {
            fire(queue[i].from, queue[i].to, true, now);
            queue.splice(i, 1);
          }
        }

        // Each bolt re-aims every frame, so it lands on its target as both orbit.
        bolts.forEach((bolt) => {
          const progress = Math.min(1, (now - bolt.start) / bolt.duration);
          const a = positions[bolt.from];
          const b = positions[bolt.to];
          const len = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
          const head = lerp(a, b, ease(progress));
          const tail = lerp(a, b, Math.max(0, ease(progress) - BOLT / len));
          bolt.lines.forEach((line) => {
            line.setAttribute('x1', String(tail.x));
            line.setAttribute('y1', String(tail.y));
            line.setAttribute('x2', String(head.x));
            line.setAttribute('y2', String(head.y));
          });
          if (progress >= 1) land(bolt, now);
        });
      } else {
        // Keep pending shots from piling up while paused.
        nextShot = now + 1200;
      }
      timer = requestAnimationFrame(frame);
    };

    // Reduced motion freezes the ring where it is and clears any bolts, live as the setting changes.
    const start = () => {
      if (timer) return;
      last = performance.now();
      nextShot = last + 1200;
      timer = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(timer);
      timer = 0;
      bolts.forEach((bolt) => bolt.lines.forEach((line) => line.remove()));
      bolts.clear();
      queue.length = 0;
      layout(spin);
    };
    const onMotion = () => (motion.matches ? stop() : start());
    motion.addEventListener('change', onMotion);
    onMotion();

    return () => {
      motion.removeEventListener('change', onMotion);
      cancelAnimationFrame(timer);
      resize.disconnect();
      observer.disconnect();
      svg.replaceChildren();
    };
  }, []);

  return (
    <div className={s.cloud} ref={rootRef} aria-hidden="true">
      <svg className={s.beams} ref={svgRef} />
      {RING.map((tool) => (
        <span className={s.slot} data-slot="" key={tool}>
          <span className={s.tile}>{TOOLS[tool].logo}</span>
        </span>
      ))}
    </div>
  );
}
