'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

import { AgentToolLogo } from '../../components/AgentToolLogos';
import {
  AGENT_META,
  HeroTerminalCard,
  ROW_ONE,
  ROW_THREE,
  ROW_TWO,
  type TerminalCard,
} from '../../components/home/HeroTerminalMarquee';
import s from './not-found.module.css';

type Depth = 'far' | 'mid' | 'near';

type Drifter = {
  card: TerminalCard;
  /** Where the lane crosses the viewport, as a percentage of each axis. */
  x: number;
  y: number;
  /** Direction of travel. Every lane is diagonal, none agree with each other. */
  angle: number;
  /** Seconds for one full crossing, and how far into it the card starts. */
  duration: number;
  delay: number;
  depth: Depth;
  /** What the agent muttered on its way past. */
  tag: string;
  /** Travel in reverse, because some agents are sure it was the other way. */
  reverse?: boolean;
  /** Overrides the card's resting tilt, which otherwise leans into its lane. */
  tilt?: number;
};

type Spark = {
  /** Launch point on the card, in px from the card's top-left. */
  ox: number;
  oy: number;
  /** Where it flies to, relative to the launch point. */
  sx: number;
  sy: number;
  spin: number;
  size: number;
  delay: number;
  duration: number;
};

type Burst = { id: number; x: number; y: number };

const CARDS = [...ROW_ONE, ...ROW_TWO, ...ROW_THREE];

const card = (repo: string, agent: TerminalCard['agent']) =>
  CARDS.find((candidate) => candidate.repo === repo && candidate.agent === agent) ?? CARDS[0];

// Ordered so that the first six still read well on a phone, where the rest
// are hidden.
const DRIFTERS: Drifter[] = [
  {
    card: card('agentrelay/web', 'claude'),
    x: 18,
    y: 22,
    angle: 24,
    duration: 46,
    delay: -9,
    depth: 'near',
    tag: '? /ship-it was right here',
  },
  {
    card: card('relay/router', 'codex'),
    x: 80,
    y: 74,
    angle: -32,
    duration: 52,
    delay: -30,
    depth: 'near',
    tag: '↺ rerouting · attempt 14',
    reverse: true,
  },
  {
    card: card('relay/docs', 'grok'),
    x: 84,
    y: 18,
    angle: 148,
    duration: 58,
    delay: -21,
    depth: 'mid',
    tag: 'which channel was it',
  },
  {
    card: card('relay/infra', 'claude'),
    x: 14,
    y: 80,
    angle: -22,
    duration: 50,
    delay: -40,
    depth: 'mid',
    tag: '404 · retry 3/∞',
  },
  {
    card: card('relay/sdk', 'opencode'),
    x: 58,
    y: 8,
    angle: 38,
    duration: 64,
    delay: -12,
    depth: 'far',
    tag: 'asked #general. no reply',
  },
  {
    card: card('relay/tests', 'claude'),
    x: 44,
    y: 94,
    angle: -48,
    duration: 60,
    delay: -44,
    depth: 'far',
    tag: 'pretty sure it was left',
    reverse: true,
  },
  {
    card: card('relay/billing', 'codex'),
    x: 4,
    y: 48,
    angle: 62,
    duration: 70,
    delay: -5,
    depth: 'far',
    tag: '⌁ signal lost',
  },
  {
    card: card('relay/web', 'grok'),
    x: 96,
    y: 44,
    angle: -118,
    duration: 56,
    delay: -33,
    depth: 'mid',
    tag: '→ DM to 404: hello?',
  },
  {
    card: card('relay/cli', 'opencode'),
    x: 30,
    y: 58,
    angle: 16,
    duration: 74,
    delay: -60,
    depth: 'far',
    tag: 'reading the map upside down',
    tilt: 172,
  },
  {
    card: card('relay/api', 'claude'),
    x: 70,
    y: 40,
    angle: -14,
    duration: 68,
    delay: -52,
    depth: 'far',
    tag: 'handoff acked by nobody',
    reverse: true,
  },
];

// Claude Code sparks fling off every card. The launch points sit near the
// title bar, where each terminal shows its agent mark.
const SPARKS: Spark[] = [
  {
    ox: 44,
    oy: 14,
    sx: -120,
    sy: -150,
    spin: 540,
    size: 22,
    delay: 0,
    duration: 3.4,
  },
  {
    ox: 210,
    oy: 12,
    sx: 160,
    sy: -110,
    spin: -620,
    size: 16,
    delay: 1.1,
    duration: 3.1,
  },
  {
    ox: 260,
    oy: 150,
    sx: 180,
    sy: 120,
    spin: 720,
    size: 26,
    delay: 2.2,
    duration: 3.8,
  },
  {
    ox: 30,
    oy: 140,
    sx: -170,
    sy: 90,
    spin: -480,
    size: 14,
    delay: 2.9,
    duration: 2.9,
  },
];

const BURST_ICONS = 12;
const BURST_LIFETIME_MS = 1400;

type DrifterStyle = CSSProperties & Record<`--${string}`, string | number>;

/** Lean each card a little toward where it is heading, without flipping it. */
function restingTilt(drifter: Drifter) {
  if (drifter.tilt !== undefined) return drifter.tilt;
  const heading = ((((drifter.angle + 90) % 180) + 180) % 180) - 90;
  return Math.max(-18, Math.min(18, heading * 0.5));
}

function drifterStyle(drifter: Drifter, index: number): DrifterStyle {
  return {
    '--tilt': `${restingTilt(drifter)}deg`,
    '--x': `${drifter.x}%`,
    '--y': `${drifter.y}%`,
    '--angle': `${drifter.angle}deg`,
    '--duration': `${drifter.duration}s`,
    '--delay': `${drifter.delay}s`,
    '--wobble-duration': `${5.2 + (index % 4) * 0.9}s`,
    '--wobble-delay': `${-index * 1.3}s`,
  };
}

function sparkStyle(spark: Spark, index: number): DrifterStyle {
  return {
    '--ox': `${spark.ox}px`,
    '--oy': `${spark.oy}px`,
    '--sx': `${spark.sx}px`,
    '--sy': `${spark.sy}px`,
    '--spin': `${spark.spin}deg`,
    '--size': `${spark.size}px`,
    '--spark-delay': `${-(spark.delay + index * 0.47)}s`,
    '--spark-duration': `${spark.duration}s`,
  };
}

/**
 * The 404 backdrop: the homepage's agent terminals, cut loose from their
 * marquee rows and drifting diagonally across the page in every direction.
 * They stop, back up, and carry on, shedding spinning Claude Code marks as
 * they go. Clicking the empty page sends out a burst of more marks.
 *
 * Pure decoration, so it is aria-hidden and holds nothing focusable.
 */
export function LostField() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextBurst = useRef(0);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      if (motion.matches || event.pointerType === 'touch') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const px = event.clientX / window.innerWidth - 0.5;
        const py = event.clientY / window.innerHeight - 0.5;
        field.style.setProperty('--px', px.toFixed(3));
        field.style.setProperty('--py', py.toFixed(3));
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  const burst = useCallback((event: PointerEvent) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = event.target as Element | null;
    if (target?.closest('a, button, [data-no-burst]')) return;

    const id = nextBurst.current++;
    setBursts((current) => [...current.slice(-5), { id, x: event.clientX, y: event.clientY }]);
    window.setTimeout(() => {
      setBursts((current) => current.filter((item) => item.id !== id));
    }, BURST_LIFETIME_MS);
  }, []);

  useEffect(() => {
    window.addEventListener('pointerdown', burst);
    return () => window.removeEventListener('pointerdown', burst);
  }, [burst]);

  return (
    <>
      <div aria-hidden="true" className={s.field} ref={fieldRef}>
        {DRIFTERS.map((drifter, index) => {
          const meta = AGENT_META[drifter.card.agent];

          return (
            <div
              className={`${s.lane} ${s[drifter.depth]}`}
              data-reverse={drifter.reverse ? '' : undefined}
              key={`${drifter.card.repo}-${drifter.card.agent}`}
              style={drifterStyle(drifter, index)}
            >
              <div className={s.heading}>
                <div className={s.travel}>
                  <div className={s.wobble}>
                    <span className={s.lostTag}>{drifter.tag}</span>
                    <HeroTerminalCard
                      card={drifter.card}
                      className={s.lostCard}
                      idPrefix={`lost-${index}`}
                      style={{
                        '--term-cycle': meta.cycle,
                        '--term-phase': `${-index * 0.91}s`,
                      }}
                    />
                    {SPARKS.map((spark, sparkIndex) => (
                      <span className={s.spark} key={sparkIndex} style={sparkStyle(spark, index)}>
                        <AgentToolLogo className={s.sparkIcon} idPrefix="" provider="claude" />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div aria-hidden="true" className={s.bursts}>
        {bursts.map((item) => (
          <span className={s.burst} key={item.id} style={{ left: item.x, top: item.y }}>
            {Array.from({ length: BURST_ICONS }, (_, iconIndex) => {
              const angle = (360 / BURST_ICONS) * iconIndex + (item.id % 3) * 11;
              const distance = 90 + ((iconIndex * 37) % 70);
              return (
                <span
                  className={s.burstIcon}
                  key={iconIndex}
                  style={
                    {
                      '--bx': `${Math.cos((angle * Math.PI) / 180) * distance}px`,
                      '--by': `${Math.sin((angle * Math.PI) / 180) * distance}px`,
                      '--bspin': `${(iconIndex % 2 ? 1 : -1) * (360 + iconIndex * 40)}deg`,
                    } as DrifterStyle
                  }
                >
                  <AgentToolLogo className={s.sparkIcon} idPrefix="" provider="claude" />
                </span>
              );
            })}
          </span>
        ))}
      </div>
    </>
  );
}
