'use client';

import { useEffect, useState } from 'react';

import { MessageRelayAnimation } from '../MessageRelayAnimation';
import s from '../../app/landing.module.css';

// Matches the mobile breakpoint in landing.module.css where .heroRight swaps
// the live canvas for the static constellation below.
const MOBILE_QUERY = '(max-width: 600px)';

type MediaQueryListWithLegacyListeners = MediaQueryList & {
  addListener?: (listener: () => void) => void;
  removeListener?: (listener: () => void) => void;
};

function subscribeToMediaQuery(mql: MediaQueryList, listener: () => void) {
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }

  const legacyMql = mql as MediaQueryListWithLegacyListeners;
  legacyMql.addListener?.(listener);
  return () => legacyMql.removeListener?.(listener);
}

/**
 * The phone stand-in for the hero's live graph: the same constellation of
 * agents wired together, drawn once as flat SVG. Phones used to get nothing
 * here at all, which left the hero's one idea invisible on the majority of
 * visits; this keeps the idea without mounting a canvas or a rAF loop.
 */
function HeroGraphStill() {
  const nodes = [
    { x: 152, y: 108, r: 7, label: 'Lead' },
    { x: 60, y: 52, r: 5, label: 'Planner' },
    { x: 248, y: 60, r: 5, label: 'Coder' },
    { x: 44, y: 176, r: 5, label: 'Reviewer' },
    { x: 258, y: 172, r: 5, label: 'Ops' },
    { x: 156, y: 218, r: 4.5, label: 'Tester' },
  ];
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [1, 2],
    [3, 5],
    [5, 4],
  ];

  return (
    <svg className={s.heroStill} viewBox="0 0 312 256" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="heroStillWash" cx="0.5" cy="0.45" r="0.62">
          <stop offset="0" stopColor="#74B8E2" stopOpacity="0.2" />
          <stop offset="1" stopColor="#74B8E2" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="312" height="256" fill="url(#heroStillWash)" />

      {/* One flat pass, no blurred understudy: the edge reads on its own and a
          bloom behind it is what made the desktop canvas look neon. */}
      <g stroke="#74B8E2" strokeWidth="1" opacity="0.42">
        {edges.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} />
        ))}
      </g>

      {nodes.map((n) => (
        <g key={n.label}>
          <circle cx={n.x} cy={n.y} r={n.r * 2.2} fill="#74B8E2" opacity="0.07" />
          <circle cx={n.x} cy={n.y} r={n.r} fill="#0d2638" stroke="#74B8E2" strokeWidth="1.3" />
          <circle cx={n.x} cy={n.y} r={n.r * 0.42} fill="#9FD4F5" />
        </g>
      ))}
    </svg>
  );
}

/**
 * Renders the hero's animated node graph only above the mobile breakpoint.
 *
 * The graph is a canvas animation with a continuous requestAnimationFrame loop,
 * so on mobile we avoid mounting it entirely (rather than just hiding it with
 * CSS) to keep the page lightweight on phones — the still above stands in.
 */
export function HeroGraph() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsDesktop(!mql.matches);

    update();
    return subscribeToMediaQuery(mql, update);
  }, []);

  if (!isDesktop) {
    return <HeroGraphStill />;
  }

  return <MessageRelayAnimation />;
}
