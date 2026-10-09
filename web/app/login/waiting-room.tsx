import type { CSSProperties } from 'react';

import {
  AGENT_META,
  HeroTerminalCard,
  type TerminalCard,
  type TerminalStyle,
} from '../../components/home/HeroTerminalMarquee';
import s from './login.module.css';

type Waiting = {
  card: TerminalCard;
  /** Where the card's centre enters, in percent of the showcase. */
  x: number;
  y: number;
  /** Spin, in degrees, by the time the relay swallows it. */
  spin: number;
};

/** One card's trip from entry to the relay; must match `--pull` in the CSS. */
const PULL_SECONDS = 16;

// Fictional sessions, purely decorative; never workspace activity.
const WAITING: Waiting[] = [
  {
    x: 20,
    y: 15,
    spin: 14,
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
    x: 24,
    y: 84,
    spin: -12,
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
    x: 16,
    y: 38,
    spin: 8,
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
    x: 28,
    y: 63,
    spin: -16,
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
 * Agent sessions drifting in and getting pulled into the relay at the seam
 * beside the form, one after another. Hidden from assistive tech.
 */
export function WaitingRoom() {
  return (
    <div className={s.waitingRoom} aria-hidden="true">
      {WAITING.map(({ card, x, y, spin }, index) => {
        const terminalStyle: TerminalStyle = {
          '--term-cycle': AGENT_META[card.agent].cycle,
          '--term-phase': `${-index * 1.7}s`,
        };
        return (
          <div
            key={card.repo}
            className={s.waiting}
            style={
              {
                '--x': x,
                '--y': y,
                '--spin': `${spin}deg`,
                '--pull-delay': `${(index * -PULL_SECONDS) / WAITING.length}s`,
              } as CSSProperties
            }
          >
            <div className={s.waitingCard}>
              <HeroTerminalCard
                card={card}
                idPrefix={`login-waiting-${index}`}
                style={terminalStyle}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
