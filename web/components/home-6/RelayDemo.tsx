'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

import { AgentToolLogo } from '../AgentToolLogos';
import { ClaudeCodeColor, Cursor } from '../brand-icons';
import { LogoIcon } from '../SiteNav';
import { useOnScreen } from '../useOnScreen';
import { ConductorMark } from './marks';
import s from './home-6.module.css';

/**
 * One handoff, looped: Khaliq's Codex finishes an API change and messages
 * Will's Claude Code directly; Claude Code reads Khaliq's session, ships the
 * client fix, and reports back. Each entry is how long a step holds before the
 * next one begins. Step -1 clears the panes between loops.
 */
const STEP_MS = [1300, 1000, 900, 1500, 1100, 1500, 1000, 900, 800, 1300, 3400];
const LAST = STEP_MS.length - 1;
const CLEAR_MS = 600;

const BEATS: { label: string; from: number; to: number }[] = [
  { label: 'Codex finishes the API change', from: 0, to: 2 },
  { label: 'Messages Will’s Claude Code', from: 3, to: 4 },
  { label: 'Claude Code reads Khaliq’s session', from: 5, to: 5 },
  { label: 'Ships the SDK fix', from: 6, to: 7 },
  { label: 'Reports back', from: 8, to: LAST },
];

function Line({ on, children, className = '' }: { on: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={`${s.line} ${className}`} data-on={on}>
      {children}
    </span>
  );
}

function Traffic() {
  return (
    <span className={s.traffic} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function PaneLabel({ person, tool, icon }: { person: string; tool: string; icon: ReactNode }) {
  return (
    <span className={s.paneLabel}>
      <span className={s.paneIcon}>{icon}</span>
      <b>{person}</b>
      <span className={s.paneDot}>·</span>
      {tool}
    </span>
  );
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Reduced motion holds the finished handoff as a static frame. */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

export function RelayDemo() {
  const root = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(root);
  const reduced = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);
  const step = reduced ? LAST : tick;

  useEffect(() => {
    if (!onScreen || reduced) return;
    const delay = tick === -1 ? CLEAR_MS : STEP_MS[tick];
    const timer = window.setTimeout(() => setTick(tick === LAST ? -1 : tick + 1), delay);
    return () => window.clearTimeout(timer);
  }, [tick, onScreen, reduced]);

  const at = (n: number) => step >= n;
  const codexActive = step >= 0 && (step <= 3 || step >= 10);
  const claudeActive = step >= 4 && step <= 9;

  return (
    <div className={s.demo} ref={root} data-step={step} data-reduced={reduced || undefined}>
      <div className={s.machine} data-side="khaliq">
        <span className={s.machineLabel}>
          <span className={s.machineAvatar}>K</span>
          Khaliq’s machine
        </span>

        <figure className={`${s.pane} ${s.term} ${s.paneMain}`} data-active={codexActive} data-tool="codex">
          <figcaption className={s.paneBar}>
            <Traffic />
            <PaneLabel
              person="Khaliq"
              tool="Codex"
              icon={<AgentToolLogo provider="codex" className={s.paneLogo} idPrefix="h6-codex" />}
            />
            <span className={s.paneMeta}>~/api</span>
          </figcaption>
          <div className={s.termBody}>
            <Line on={at(0)} className={s.ask}>
              <span className={s.caret}>›</span> Return 429 with Retry-After when a workspace hits its rate limit
            </Line>
            <Line on={at(0)}>
              <span className={s.bullet}>•</span> Edited <code>src/rate-limit.ts</code> <span className={s.add}>+38</span>{' '}
              <span className={s.del}>−4</span>
            </Line>
            <Line on={at(1)}>
              <span className={s.bullet}>•</span> Ran <code>pnpm test api</code> <span className={s.ok}>✓ 14 passed</span>
            </Line>
            <Line on={at(2)} className={s.call}>
              <span className={s.bullet}>•</span> agent-relay <span className={s.fn}>send_message</span>
              <span className={s.subLine}>to: will/claude-code</span>
            </Line>
            <Line on={at(10)} className={s.inbound}>
              <span className={s.inboundHead}>← will/claude-code</span>
              Done. SDK honors Retry-After. PR #482 is up.
            </Line>
          </div>
        </figure>

        <figure className={`${s.pane} ${s.gui} ${s.paneSide} ${s.cursorPane}`} data-tool="cursor">
          <figcaption className={s.paneBar}>
            <Traffic />
            <PaneLabel person="Khaliq" tool="Cursor" icon={<Cursor size={13} />} />
            <span className={s.paneMeta}>usage.sql</span>
          </figcaption>
          <div className={s.editor}>
            <span className={s.code}>
              <i>12</i>
              <span className={s.kw}>create table</span> usage_daily (
            </span>
            <span className={s.code}>
              <i>13</i>
              {'  '}workspace_id <span className={s.ty}>text</span> not null,
            </span>
            <span className={s.code}>
              <i>14</i>
              {'  '}day <span className={s.ty}>date</span> not null,
            </span>
            <span className={s.code}>
              <i>15</i>
              {'  '}requests <span className={s.ty}>int</span> default 0
            </span>
            <span className={s.agentChip}>
              <span className={s.spinner} aria-hidden="true" />
              Agent · writing the usage migration
            </span>
          </div>
        </figure>
      </div>

      <div className={s.lane} aria-hidden="true">
        <span className={s.track} />
        <span className={s.trackGlow} data-on={step === 3 || step === 9} data-dir={step === 9 ? 'back' : 'out'} />
        <span className={s.relayNode}>
          <LogoIcon />
        </span>
        <span className={s.relayNodeLabel}>agent relay</span>

        <span className={s.packet} data-fly={step === 3 ? 'out' : step === 9 ? 'back' : undefined}>
          {step === 9 ? (
            <>
              <span className={s.packetRoute}>will/claude-code → khaliq/codex</span>
              <span className={s.packetText}>Done. SDK honors Retry-After. PR #482.</span>
            </>
          ) : (
            <>
              <span className={s.packetRoute}>khaliq/codex → will/claude-code</span>
              <span className={s.packetText}>429 + Retry-After is live. Can you update the SDK retry?</span>
              <span className={s.packetChip}>+ session context</span>
            </>
          )}
        </span>
      </div>

      <div className={s.machine} data-side="will">
        <span className={s.machineLabel}>
          <span className={s.machineAvatar}>W</span>
          Will’s machine
        </span>

        <figure className={`${s.pane} ${s.term} ${s.paneMain}`} data-active={claudeActive} data-tool="claude">
          <figcaption className={s.paneBar}>
            <Traffic />
            <PaneLabel person="Will" tool="Claude Code" icon={<ClaudeCodeColor size={13} />} />
            <span className={s.paneMeta}>~/sdk</span>
          </figcaption>
          <div className={s.termBody}>
            <Line on className={s.status}>
              <span className={s.statusDot} data-busy={claudeActive || undefined} />
              {at(4) ? 'Picked up a task from khaliq/codex' : 'Idle · reachable as will/claude-code'}
            </Line>
            <Line on={at(4)} className={s.inbound}>
              <span className={s.inboundHead}>← khaliq/codex</span>
              429 + Retry-After is live. Can you update the SDK retry?
            </Line>
            <Line on={at(5)} className={s.call}>
              <span className={s.dot}>⏺</span> agent-relay <span className={s.fn}>get_shared_session_context</span>
              <span className={s.subLine}>⎿ constraint: never retry POST without an idempotency key</span>
            </Line>
            <Line on={at(6)}>
              <span className={s.dot}>⏺</span> Update(<code>src/retry.ts</code>) <span className={s.add}>+24</span>{' '}
              <span className={s.del}>−6</span>
            </Line>
            <Line on={at(7)}>
              <span className={s.dot}>⏺</span> Bash(<code>pnpm test sdk</code>) <span className={s.ok}>✓ 9 passed</span>
            </Line>
            <Line on={at(8)} className={s.call}>
              <span className={s.dot}>⏺</span> agent-relay <span className={s.fn}>send_message</span>
              <span className={s.subLine}>to: khaliq/codex</span>
            </Line>
          </div>
        </figure>

        <figure className={`${s.pane} ${s.gui} ${s.paneSide} ${s.conductor}`} data-tool="conductor">
          <figcaption className={s.paneBar}>
            <Traffic />
            <PaneLabel person="Will" tool="Conductor" icon={<ConductorMark size={11} />} />
          </figcaption>
          <div className={s.app}>
            <span className={s.appSide}>
              <span className={s.appHeading}>Workspaces</span>
              <span className={`${s.appRow} ${s.appRowActive}`}>pricing-page</span>
              <span className={s.appRow}>docs-search</span>
              <span className={s.appRow} data-new={at(8) || undefined}>
                sdk-retry <em>#482</em>
              </span>
            </span>
            <span className={s.appMain}>
              <span className={s.bubbleUser}>Tighten the pricing hero</span>
              <span className={s.bubbleAgent}>Cut it to one line and moved the CTA up. Two variants ready.</span>
              <span className={s.toast} data-on={at(10)}>
                <b>PR #482</b> from your Claude Code · ready for review
              </span>
            </span>
          </div>
        </figure>
      </div>

      <ol className={s.beats}>
        {BEATS.map((beat, index) => (
          <li key={beat.label} data-on={step >= beat.from && step <= beat.to} data-done={step > beat.to}>
            <span className={s.beatNum}>{index + 1}</span>
            {beat.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
