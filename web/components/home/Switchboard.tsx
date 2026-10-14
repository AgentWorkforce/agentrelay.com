'use client';

import Image from 'next/image';
import { useEffect, useRef, type CSSProperties } from 'react';

import switchboard from '../../public/home/bell-switchboard.jpg';
import s from './switchboard.module.css';

/**
 * The pain, named: you connect every handoff by hand, like an operator.
 *
 * Once the pane's bottom meets the viewport it pins, and the next screen of
 * scroll breaks it: cracks spread from an impact point, then the pane falls
 * apart in shards while the next section rises behind it. Scroll position
 * drives `--p` (0 → 1) on the stage; every crack and shard reads it, so the
 * break plays backwards when scrolling up. Reduced motion skips the break.
 */

type Point = readonly [number, number];

/** Where the glass is struck, in % of the pane. */
const IMPACT: Point = [46, 42];

/** Rays from the impact to the pane's edge, as positions along its perimeter
    (0–1 top, 1–2 right, 2–3 bottom, 3–4 left), and how far out each ray's
    inner ring of cracks sits. */
const RAYS = [0.12, 0.5, 0.88, 1.35, 1.8, 2.25, 2.7, 3.15, 3.6];
const RING = [0.32, 0.4, 0.3, 0.38, 0.34, 0.42, 0.3, 0.36, 0.4];
const CORNERS: [number, Point][] = [
  [1, [100, 0]],
  [2, [100, 100]],
  [3, [0, 100]],
  [4, [0, 0]],
];

function perimeter(t: number): Point {
  const u = t % 4;
  if (u < 1) return [u * 100, 0];
  if (u < 2) return [100, (u - 1) * 100];
  if (u < 3) return [(3 - u) * 100, 100];
  return [0, (4 - u) * 100];
}

const lerp = (a: Point, b: Point, k: number): Point => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

const EDGE = RAYS.map(perimeter);
const RINGS = EDGE.map((edge, i) => lerp(IMPACT, edge, RING[i]));

type Shard = { points: Point[]; style: CSSProperties };

/** Fixed 0–1 values per shard for spin and fall order. Fixed, not computed,
    so server and client render byte-identical styles. */
const SPIN = [0.62, 0.18, 0.91, 0.37, 0.74, 0.05, 0.53, 0.86, 0.29, 0.67, 0.12, 0.98, 0.44, 0.71, 0.23, 0.58, 0.81, 0.34];
const ORDER = [0.48, 0.2, 0.66, 0.08, 0.35, 0.92, 0.15, 0.57, 0.74, 0.27, 0.83, 0.04, 0.61, 0.39, 0.97, 0.12, 0.52, 0.7];

const round = (n: number) => n.toFixed(2);

function shard(points: Point[], index: number): Shard {
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const dx = cx - IMPACT[0];
  const dy = cy - IMPACT[1];
  const len = Math.hypot(dx, dy) || 1;
  return {
    points,
    style: {
      '--sx': round((dx / len) * 10),
      '--sy': round((dy / len) * 10),
      '--dx': round(dx * 3.2),
      '--r': round((index % 2 ? 1 : -1) * (6 + SPIN[index] * 16)),
      '--d': round(0.34 + ORDER[index] * 0.32),
      transformOrigin: `${round(cx)}% ${round(cy)}%`,
    } as CSSProperties,
  };
}

const SHARDS: Shard[] = RAYS.flatMap((t, i) => {
  const next = (i + 1) % RAYS.length;
  const tNext = next === 0 ? RAYS[0] + 4 : RAYS[next];
  const corners = CORNERS.filter(([c]) => c > t && c < tNext).map(([, p]) => p);
  return [
    shard([IMPACT, RINGS[i], RINGS[next]], i * 2),
    shard([RINGS[i], EDGE[i], ...corners, EDGE[next], RINGS[next]], i * 2 + 1),
  ];
});

const polygon = (points: Point[]) => `polygon(${points.map(([x, y]) => `${round(x)}% ${round(y)}%`).join(', ')})`;

const CRACKS = [
  ...RINGS.map((ring, i) => `M ${IMPACT[0]} ${IMPACT[1]} L ${round(ring[0])} ${round(ring[1])} L ${round(EDGE[i][0])} ${round(EDGE[i][1])}`),
  `M ${RINGS.map(([x, y]) => `${round(x)} ${round(y)}`).join(' L ')} Z`,
];

function Body({ reveal }: { reveal: boolean }) {
  const r = reveal ? { 'data-reveal': '' } : {};
  return (
    <div className={s.inner}>
      <div className={s.text}>
        <h2 id={reveal ? 'switchboard-title' : undefined} className={s.title} {...r}>
          Right now, you are the switchboard.
        </h2>
        <div className={s.copy} {...r}>
          <p className={s.lead}>Some days you work for your agents, not the other way around.</p>
          <p>You carry context between them all day. Then at standup you learn a teammate’s agent already fixed it.</p>
        </div>
      </div>
      <figure className={s.figure} {...r}>
        <div className={s.photo}>
          <Image
            src={switchboard}
            alt={reveal ? 'A long row of telephone operators in headsets plugging cords into a Bell System switchboard' : ''}
            sizes="(max-width: 900px) 100vw, 58vw"
            className={s.img}
          />
        </div>
      </figure>
    </div>
  );
}

/** `glass` rises over the hero's marquee; `white` is a plain stark-white screen. */
export function Switchboard({ tone = 'glass' }: { tone?: 'glass' | 'white' }) {
  const paneRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = paneRef.current;
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

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const update = () => {
      const vh = window.innerHeight;
      const stick = Math.min(0, vh - stage.offsetHeight);
      stage.style.setProperty('--stage-stick', `${stick}px`);
      const p = Math.min(1, Math.max(0, (stick - track.getBoundingClientRect().top) / vh));
      stage.style.setProperty('--p', p.toFixed(4));
      stage.toggleAttribute('data-broken', p > 0.25);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className={s.breakTrack} ref={trackRef}>
      <div className={s.stage} data-tone={tone} ref={stageRef}>
        <section ref={paneRef} className={s.switchboard} aria-labelledby="switchboard-title">
          <Body reveal />
        </section>

        <svg className={s.cracks} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {CRACKS.map((d) => (
            <path d={d} key={d} pathLength={1} />
          ))}
        </svg>

        <div className={s.shards} aria-hidden="true">
          {SHARDS.map((piece, index) => (
            <div className={s.shard} key={index} style={{ ...piece.style, clipPath: polygon(piece.points) }}>
              <div className={s.shardGlass}>
                <Body reveal={false} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
