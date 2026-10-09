'use client';

import { useEffect, useState, type CSSProperties } from 'react';

import {
  AGENT_META,
  HeroTerminalCard,
  type TerminalCard,
  type TerminalStyle,
} from '../../components/home/HeroTerminalMarquee';
import { RELAY_RUSH_EVENT, type RelayRushEvent } from './relay-events';
import s from './login.module.css';

type Waiting = {
  card: TerminalCard;
  /** What the agent wants from you, worn as a tag above its terminal. */
  tag: string;
  /** Top-left corner on the stage, in px. */
  x: number;
  y: number;
  tilt: number;
};

// Fictional sessions, purely decorative; never workspace activity.
const WAITING: Waiting[] = [
  {
    tag: 'needs a human · 2m',
    x: 24,
    y: 40,
    tilt: -3,
    card: {
      agent: 'claude',
      repo: 'agentrelay/web',
      size: 'md',
      lines: [
        { tone: 'prompt', text: '$ claude "ship the auth refresh"' },
        { tone: 'tool', text: '⎿ ran 41 tests - 41 passed' },
        { tone: 'relay', text: '→ waiting on @you for PR #412' },
      ],
    },
  },
  {
    tag: 'pinged @you',
    x: 360,
    y: 196,
    tilt: 2.5,
    card: {
      agent: 'codex',
      repo: 'relay/router',
      size: 'lg',
      lines: [
        { tone: 'prompt', text: '$ codex "trace the dropped socket"' },
        { tone: 'tool', text: '⎿ found reconnect gap at 30s' },
        { tone: 'relay', text: '→ asked @you: patch or roll back?' },
      ],
    },
  },
  {
    tag: 'saved you a seat',
    x: 56,
    y: 420,
    tilt: 2,
    card: {
      agent: 'opencode',
      repo: 'relay/sdk',
      size: 'sm',
      lines: [
        { tone: 'prompt', text: '$ opencode "draft the release notes"' },
        { tone: 'ok', text: '✓ notes ready for v9.4' },
        { tone: 'relay', text: '→ holding for your review' },
      ],
    },
  },
  {
    tag: 'standing by',
    x: 392,
    y: 600,
    tilt: -2.5,
    card: {
      agent: 'grok',
      repo: 'relay/docs',
      size: 'md',
      lines: [
        { tone: 'prompt', text: '$ grok "refresh the quickstart"' },
        { tone: 'tool', text: '⎿ 4 files changed' },
        { tone: 'relay', text: '→ @you, ship it?' },
      ],
    },
  },
];

/**
 * Agent sessions waiting on the person signing in. Once sign-in starts their
 * tags flip to show you've joined. Hidden from assistive tech.
 */
export function WaitingRoom() {
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const onRush = (event: Event) => setJoined((event as RelayRushEvent).detail);
    window.addEventListener(RELAY_RUSH_EVENT, onRush);
    return () => window.removeEventListener(RELAY_RUSH_EVENT, onRush);
  }, []);

  return (
    <div className={s.waitingRoom} aria-hidden="true">
      <div className={s.waitingStage}>
        {WAITING.map(({ card, tag, x, y, tilt }, index) => {
          const terminalStyle: TerminalStyle = {
            '--term-cycle': AGENT_META[card.agent].cycle,
            '--term-phase': `${-index * 1.7}s`,
          };
          return (
            <div
              key={card.repo}
              className={s.waiting}
              data-joined={joined || undefined}
              style={
                {
                  left: x,
                  top: y,
                  '--tilt': `${tilt}deg`,
                  '--float-delay': `${index * -1.9}s`,
                } as CSSProperties
              }
            >
              <span className={s.waitingTag}>{joined ? '✓ @you joined' : tag}</span>
              <HeroTerminalCard
                card={card}
                idPrefix={`login-waiting-${index}`}
                style={terminalStyle}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
