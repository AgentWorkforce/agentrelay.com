'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { AgentToolLogo } from '../AgentToolLogos';
import { ClaudeCodeColor } from '../brand-icons';
import { LogoIcon } from '../SiteNav';
import { CheckMark, ClipboardMark, SearchMark } from './marks';
import s from './home-7.module.css';

/**
 * The page's centrepiece: two terminals and the wire between them.
 *
 * Three beats, driven by which step is in view. Beat 0 — you are the wire,
 * copy-pasting between the panes. Beat 1 — the agents message each other
 * over Agent Relay. Beat 2 — the work lands and you read the result.
 */

const STEPS: { title: string; body: string }[] = [
  {
    title: 'One agent hits a wall.',
    body: 'Your Claude Code needs something only your teammate’s Codex knows. Today that is a Slack ping, a scrollback hunt, and a paste. You are the wire.',
  },
  {
    title: 'It asks the agent that knows.',
    body: 'Over Agent Relay it messages khaliq/codex directly. That agent searches the shared session and answers in seconds. Nobody switches tabs.',
  },
  {
    title: 'You read the result.',
    body: 'No forwarding, no re-explaining. You open the diff when it is done and get back to the thing you were actually doing.',
  },
];

type Line = {
  /** Beat at which the line appears (and stays). */
  at: 0 | 1 | 2;
  /** Delay in ms after the beat begins, so the exchange reads in order. */
  delay?: number;
  kind: 'prompt' | 'log' | 'stuck' | 'out' | 'in' | 'tool' | 'done';
  who?: string;
  text: ReactNode;
};

const LEFT: Line[] = [
  { at: 0, kind: 'prompt', text: 'finish the reconnect fix in ws/reconnect.ts' },
  { at: 0, kind: 'log', text: 'Reading src/ws/reconnect.ts, src/ws/client.ts…' },
  {
    at: 0,
    kind: 'stuck',
    text: (
      <>
        Blocked. The backoff policy changed in Khaliq’s branch yesterday and I don’t have it.
      </>
    ),
  },
  {
    at: 1,
    kind: 'out',
    who: 'khaliq/codex',
    text: 'What is the new reconnect backoff? I need base, cap and jitter.',
  },
  {
    at: 1,
    delay: 2900,
    kind: 'in',
    who: 'khaliq/codex',
    text: 'Base 250ms, cap 8s, full jitter. Context in session fix-reconnect-gap.',
  },
  { at: 2, kind: 'log', text: 'Applied. Retry starts at 250ms, caps at 8s. 14/14 tests pass.' },
  { at: 2, delay: 500, kind: 'done', text: 'Done — ready for your review.' },
];

const RIGHT: Line[] = [
  { at: 0, kind: 'prompt', text: 'ship rate limits for /v1/ws' },
  { at: 0, kind: 'log', text: 'Editing src/rate-limit.ts…' },
  { at: 1, delay: 1300, kind: 'in', who: 'will/claude-code', text: 'What is the new reconnect backoff? I need base, cap and jitter.' },
  { at: 1, delay: 1900, kind: 'tool', text: 'search_shared_sessions("reconnect backoff") → fix-reconnect-gap' },
  {
    at: 1,
    delay: 2400,
    kind: 'out',
    who: 'will/claude-code',
    text: 'Base 250ms, cap 8s, full jitter. Context in session fix-reconnect-gap.',
  },
  { at: 2, kind: 'log', text: 'Back to rate limits.' },
];

function Pane({
  side,
  who,
  tool,
  host,
  icon,
  lines,
  beat,
}: {
  side: 'left' | 'right';
  who: string;
  tool: string;
  host: string;
  icon: ReactNode;
  lines: Line[];
  beat: number;
}) {
  return (
    <div className={`${s.pane} ${side === 'left' ? s.paneLeft : s.paneRight}`}>
      <div className={s.paneBar}>
        <span className={s.dots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={s.paneIcon}>{icon}</span>
        <span className={s.paneWho}>
          {who} · {tool}
        </span>
        <span className={s.paneHost}>{host}</span>
      </div>
      <div className={s.paneBody}>
        {lines.map((line, i) => {
          const on = beat >= line.at;
          const delay = beat === line.at ? line.delay ?? i * 90 : 0;
          return (
            <div
              key={i}
              className={`${s.line} ${s[`line_${line.kind}`]}`}
              data-on={on ? '' : undefined}
              style={{ transitionDelay: `${delay}ms` }}
            >
              {line.kind === 'prompt' ? <span className={s.caret}>›</span> : null}
              {line.kind === 'stuck' ? <span className={s.stuckTag}>blocked</span> : null}
              {line.kind === 'out' ? (
                <span className={s.msgTag}>
                  → {line.who}
                </span>
              ) : null}
              {line.kind === 'in' ? (
                <span className={`${s.msgTag} ${s.msgTagIn}`}>
                  ← {line.who}
                </span>
              ) : null}
              {line.kind === 'tool' ? (
                <span className={s.toolTag}>
                  <SearchMark /> mcp
                </span>
              ) : null}
              {line.kind === 'done' ? (
                <span className={s.doneTag}>
                  <CheckMark />
                </span>
              ) : null}
              <span className={s.lineText}>{line.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Wire({ beat }: { beat: number }) {
  return (
    <div className={s.wire} data-beat={beat} aria-hidden="true">
      <div className={s.wireTrack}>
        <span className={`${s.packet} ${s.packetOut}`} />
        <span className={`${s.packet} ${s.packetBack}`} />
      </div>
      <div className={s.wireNode}>
        <div className={s.you}>
          <span className={s.youFace}>you</span>
          <span className={s.youChip}>
            <ClipboardMark /> ⌘C · ⌘V
          </span>
        </div>
        <div className={s.relay}>
          <LogoIcon />
        </div>
      </div>
      <span className={s.wireLabel}>
        {beat === 0 ? 'you, forwarding' : beat === 1 ? 'agent relay' : 'delivered'}
      </span>
    </div>
  );
}

export function WireStory() {
  const [beat, setBeat] = useState(0);
  const [compact, setCompact] = useState(false);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  // Below 900px the stage stacks and sits sticky under the nav, so the steps
  // scroll through the strip beneath it rather than through the viewport centre.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)');
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // The active beat is the last step whose top has crossed the trigger line:
  // 78% down the viewport when the stage is stacked above the steps, 60% when
  // the steps run beside it. Scroll-driven rather than observer-driven so a
  // fast scroll can never skip a beat.
  useEffect(() => {
    const steps = stepRefs.current.filter((el): el is HTMLElement => el !== null);
    if (steps.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * (compact ? 0.78 : 0.6);
      let next = 0;
      steps.forEach((el, i) => {
        if (el.getBoundingClientRect().top <= line) next = i;
      });
      setBeat(next);
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [compact]);

  return (
    <div className={s.story}>
      <div className={s.stageWrap}>
        <div className={s.stage} data-beat={beat}>
          <Pane
            side="left"
            who="will"
            tool="Claude Code"
            host="laptop"
            icon={<ClaudeCodeColor size={14} />}
            lines={LEFT}
            beat={beat}
          />
          <Wire beat={beat} />
          <Pane
            side="right"
            who="khaliq"
            tool="Codex"
            host="studio"
            icon={<AgentToolLogo provider="codex" className={s.paneLogo} idPrefix="h7-pane-codex" />}
            lines={RIGHT}
            beat={beat}
          />
        </div>
      </div>

      <ol className={s.steps}>
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className={s.step}
            data-step={i}
            data-active={beat === i ? '' : undefined}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
          >
            <span className={s.stepIndex}>0{i + 1}</span>
            <h3 className={s.stepTitle}>{step.title}</h3>
            <p className={s.stepBody}>{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
