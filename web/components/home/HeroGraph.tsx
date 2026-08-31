'use client';

import { useEffect, useState } from 'react';

import { ClaudeLogo, CodexLogo, GeminiLogo, MessageRelayAnimation } from '../MessageRelayAnimation';
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
 * The three agents the miniature shows, taken straight from the desktop
 * canvas's own pool (`NODE_POOL` in MessageRelayAnimation) so the phone and
 * the desktop are showing the same cast — one per provider, and the two the
 * subtitle names (Claude, Codex) among them. The status lines are the
 * canvas's own strings, frozen at a moment where the relay is mid-hand-off.
 */
const MINI_AGENTS = [
  {
    name: 'Lead',
    model: 'Opus',
    saying: 'Spawning Coder...',
    Logo: ClaudeLogo,
    busy: true,
    slot: s.heroMiniHub,
  },
  {
    name: 'Planner',
    model: '2.5 Pro',
    saying: 'Standing by...',
    Logo: GeminiLogo,
    busy: false,
    slot: s.heroMiniLeft,
  },
  {
    name: 'Coder',
    model: 'Codex-1',
    saying: 'Writing patch...',
    Logo: CodexLogo,
    busy: true,
    slot: s.heroMiniRight,
  },
] as const;

/**
 * The phone stand-in for the hero's live graph: three of the same agents the
 * desktop canvas floats, drawn once as flat DOM. Phones used to get nothing
 * here at all, and then a ring of anonymous dots, which read as a wireframe
 * placeholder — the desktop graph is good because the nodes are *named agents
 * saying things*, so the miniature keeps that and drops the motion.
 */
function HeroGraphStill() {
  return (
    <div className={s.heroMini} aria-hidden="true">
      <svg
        className={s.heroMiniWires}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
      >
        {/* Card centres, as percentages of this box: the hub at (48, 14.5),
            the staggered pair at (23, 76.5) and (77, 85.5). One flat pass, no
            blurred understudy — a bloom behind the line is what made the
            desktop canvas look neon. non-scaling-stroke keeps the hairline
            even under the box's non-uniform scale. */}
        <g stroke="#74B8E2" strokeWidth="1" opacity="0.5">
          <line x1="48" y1="14.5" x2="23" y2="76.5" vectorEffect="non-scaling-stroke" />
          <line x1="48" y1="14.5" x2="77" y2="85.5" vectorEffect="non-scaling-stroke" />
          <line x1="23" y1="76.5" x2="77" y2="85.5" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>

      {MINI_AGENTS.map((agent) => (
        <div key={agent.name} className={`${s.heroMiniCard} ${agent.slot}`}>
          <div className={s.heroMiniHeader}>
            <span className={s.heroMiniIdentity}>
              <agent.Logo />
              <span className={s.heroMiniName}>{agent.name}</span>
            </span>
            <span className={s.heroMiniModel}>{agent.model}</span>
          </div>
          <div className={s.heroMiniStatus}>
            {agent.busy && <span className={s.heroMiniDot} />}
            <span className={agent.busy ? s.heroMiniSayingActive : s.heroMiniSaying}>
              {agent.saying}
            </span>
          </div>
        </div>
      ))}

      <span className={s.heroMiniToast}>#dev: PR ready</span>
    </div>
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
