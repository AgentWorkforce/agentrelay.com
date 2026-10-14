'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';

import { ClaudeCodeColor, Codex } from '../brand-icons';
import { useInView, useReducedMotion } from './hooks';
import s from './home-1.module.css';

/**
 * The hero story, played on a loop: a cursor (you) ferries context between
 * Claude Code, Codex and a teammate's Conductor by copy-paste, then steps out
 * and the agents message each other directly over relay wires.
 */

type LineId = 'claudeOut' | 'codexIn' | 'codexOut' | 'condIn' | 'condOut' | 'claudeIn';
type CursorTarget = LineId | 'enter' | 'exit';
type PortId = 'claudeA' | 'claudeB' | 'codexA' | 'codexB' | 'condA' | 'condB';

type Phase = { dur: number; cursor: CursorTarget };

const PHASES: Phase[] = [
  { dur: 700, cursor: 'enter' }, // 0  reset
  { dur: 1000, cursor: 'claudeOut' }, // 1  reach Claude's finding
  { dur: 700, cursor: 'claudeOut' }, // 2  select it
  { dur: 1150, cursor: 'codexIn' }, // 3  carry the copy to Codex
  { dur: 800, cursor: 'codexIn' }, // 4  paste
  { dur: 1000, cursor: 'codexOut' }, // 5  Codex answers
  { dur: 700, cursor: 'codexOut' }, // 6  select
  { dur: 1150, cursor: 'condIn' }, // 7  carry to the teammate
  { dur: 800, cursor: 'condIn' }, // 8  paste
  { dur: 1000, cursor: 'condOut' }, // 9  teammate asks back
  { dur: 700, cursor: 'condOut' }, // 10 select
  { dur: 1150, cursor: 'claudeIn' }, // 11 carry back to Claude
  { dur: 1000, cursor: 'claudeIn' }, // 12 paste
  { dur: 1300, cursor: 'exit' }, // 13 you step out
  { dur: 900, cursor: 'exit' }, // 14 wires draw
  { dur: 7200, cursor: 'exit' }, // 15 agents talk
  { dur: 800, cursor: 'exit' }, // 16 fade to reset
];

const RELAY_PHASE = 15;
const SELECTED: Partial<Record<LineId, number[]>> = {
  claudeOut: [2, 3],
  codexOut: [6, 7],
  condOut: [10, 11],
};
const SHOWN_FROM: Record<LineId, number> = {
  claudeOut: 0,
  codexIn: 4,
  codexOut: 5,
  condIn: 8,
  condOut: 9,
  claudeIn: 12,
};
const CHIP: Record<number, string> = {
  3: 'retry budget resets on reconnect…',
  7: 'Patched. PR #482 is up…',
  11: 'Is the retry fix landing today?',
};
const CLICK_PHASES = new Set([2, 4, 6, 8, 10, 12]);

const WIRES: [PortId, PortId][] = [
  ['claudeB', 'codexA'],
  ['codexB', 'condA'],
  ['condB', 'claudeA'],
];

type Point = { x: number; y: number };

function cx(...names: (string | false | undefined)[]) {
  return names.filter(Boolean).join(' ');
}

function centerOf(el: Element, origin: DOMRect): Point {
  const r = el.getBoundingClientRect();
  return { x: r.left - origin.left + r.width / 2, y: r.top - origin.top + r.height / 2 };
}

/** Outward unit normal for a port: the window edge it sits closest to. */
function normalOf(port: Element): Point {
  const win = port.closest('[data-window]');
  if (!win) return { x: 0, y: 0 };
  const w = win.getBoundingClientRect();
  const p = port.getBoundingClientRect();
  const px = p.left + p.width / 2;
  const py = p.top + p.height / 2;
  const d = [
    { n: { x: -1, y: 0 }, v: Math.abs(px - w.left) },
    { n: { x: 1, y: 0 }, v: Math.abs(w.right - px) },
    { n: { x: 0, y: -1 }, v: Math.abs(py - w.top) },
    { n: { x: 0, y: 1 }, v: Math.abs(w.bottom - py) },
  ].sort((a, b) => a.v - b.v);
  return d[0].n;
}

function Line({
  children,
  shown = true,
  selected = false,
  pasted = false,
  tone,
  lineRef,
}: {
  children: ReactNode;
  shown?: boolean;
  selected?: boolean;
  pasted?: boolean;
  tone?: 'dim' | 'ok' | 'ask';
  lineRef?: Ref<HTMLParagraphElement>;
}) {
  return (
    <p
      ref={lineRef}
      className={cx(
        s.tline,
        shown && s.tlineShown,
        selected && s.tlineSelected,
        pasted && s.tlinePasted,
        tone === 'dim' && s.tlineDim,
        tone === 'ok' && s.tlineOk,
        tone === 'ask' && s.tlineAsk,
      )}
    >
      <span className={s.tlineText}>{children}</span>
      {pasted ? <span className={s.pasteTag}>⌘V</span> : null}
    </p>
  );
}

function RelayLine({ children, d, dir }: { children: ReactNode; d: number; dir?: 'in' | 'out' }) {
  return (
    <p className={cx(s.rline, dir === 'in' && s.rlineIn, dir === 'out' && s.rlineOut)} style={{ '--d': `${d}ms` } as CSSProperties}>
      {children}
    </p>
  );
}

function ConductorGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <rect x="1" y="1" width="14" height="14" rx="4" fill="#e9e4da" />
      <path d="M5 11V5h1.6l2.8 3.8V5H11v6H9.4L6.6 7.2V11z" fill="#1d1a16" />
    </svg>
  );
}

function AgentWindow({
  id,
  title,
  meta,
  icon,
  children,
  portRefs,
}: {
  id: 'claude' | 'codex' | 'cond';
  title: string;
  meta: string;
  icon: ReactNode;
  children: ReactNode;
  portRefs: [Ref<HTMLSpanElement>, Ref<HTMLSpanElement>];
}) {
  const winClass = id === 'claude' ? s.winClaude : id === 'codex' ? s.winCodex : s.winCond;
  const portAClass = id === 'claude' ? s.portClaudeA : id === 'codex' ? s.portCodexA : s.portCondA;
  const portBClass = id === 'claude' ? s.portClaudeB : id === 'codex' ? s.portCodexB : s.portCondB;
  return (
    <div className={cx(s.win, winClass)} data-window={id}>
      <div className={s.winBar}>
        <span className={s.winDots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={s.winTitle}>
          {icon}
          {title}
        </span>
        <span className={s.winMeta}>{meta}</span>
      </div>
      <div className={s.winBody}>{children}</div>
      <span ref={portRefs[0]} className={cx(s.port, portAClass)} aria-hidden="true" />
      <span ref={portRefs[1]} className={cx(s.port, portBClass)} aria-hidden="true" />
    </div>
  );
}

export function MessengerStage() {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, '0px');
  const [phase, setPhase] = useState(0);
  const [layout, setLayout] = useState(0);
  const [cursor, setCursor] = useState<Point>({ x: 0, y: 0 });
  const [wires, setWires] = useState<string[]>([]);

  const lineRefs = useRef<Partial<Record<LineId, HTMLParagraphElement | null>>>({});
  const portRefs = useRef<Partial<Record<PortId, HTMLSpanElement | null>>>({});
  const setLine = (id: LineId) => (el: HTMLParagraphElement | null) => {
    lineRefs.current[id] = el;
  };
  const setPort = (id: PortId) => (el: HTMLSpanElement | null) => {
    portRefs.current[id] = el;
  };

  const shownPhase = reduced ? RELAY_PHASE : phase;

  // Advance the story while it is on screen.
  useEffect(() => {
    if (reduced || !inView) return;
    const t = window.setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), PHASES[phase].dur);
    return () => window.clearTimeout(t);
  }, [phase, inView, reduced]);

  // Re-measure on resize.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setLayout((n) => n + 1));
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // Wires between window ports.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const origin = stage.getBoundingClientRect();
    const next: string[] = [];
    for (const [from, to] of WIRES) {
      const a = portRefs.current[from];
      const b = portRefs.current[to];
      if (!a || !b) continue;
      const p0 = centerOf(a, origin);
      const p3 = centerOf(b, origin);
      const n0 = normalOf(a);
      const n3 = normalOf(b);
      const dist = Math.hypot(p3.x - p0.x, p3.y - p0.y);
      const k = Math.min(120, Math.max(36, dist * 0.42));
      const clampX = (x: number) => Math.min(origin.width - 6, Math.max(6, x));
      const c1 = { x: clampX(p0.x + n0.x * k), y: p0.y + n0.y * k };
      const c2 = { x: clampX(p3.x + n3.x * k), y: p3.y + n3.y * k };
      next.push(
        `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`,
      );
    }
    setWires(next);
  }, [layout]);

  // Cursor position for the current phase.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const origin = stage.getBoundingClientRect();
    const target = PHASES[phase].cursor;
    if (target === 'enter') {
      setCursor({ x: origin.width * 0.18, y: origin.height + 40 });
      return;
    }
    if (target === 'exit') {
      setCursor({ x: origin.width * 0.52, y: origin.height + 70 });
      return;
    }
    const el = lineRefs.current[target];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const textWidth = (el.firstElementChild as HTMLElement | null)?.getBoundingClientRect().width ?? r.width;
    setCursor({
      x: r.left - origin.left + Math.min(textWidth, r.width) * 0.72,
      y: r.top - origin.top + r.height * 0.55,
    });
  }, [phase, layout]);

  const relay = shownPhase >= RELAY_PHASE - 1 && shownPhase < PHASES.length - 1;
  const talking = shownPhase === RELAY_PHASE;
  const fading = shownPhase === PHASES.length - 1 || shownPhase === 0;
  const shown = (id: LineId) => shownPhase >= SHOWN_FROM[id] && !relay;
  const selected = (id: LineId) => SELECTED[id]?.includes(shownPhase) ?? false;
  const pastes = shownPhase >= 12 ? 3 : shownPhase >= 8 ? 2 : shownPhase >= 4 ? 1 : 0;
  const chip = CHIP[shownPhase];
  const cursorHidden = reduced || shownPhase === 0 || shownPhase >= 14;

  return (
    <div className={s.stageWrap}>
      <div
        ref={stageRef}
        className={cx(s.stage, relay && s.stageRelay, talking && s.stageTalking, fading && s.stageFading)}
        role="img"
        aria-label="Animation: a cursor copies context between Claude Code, Codex and a teammate's Conductor by hand. Then the cursor leaves and the three agents message each other directly through Agent Relay."
      >
        <svg className={s.wires} aria-hidden="true">
          <defs>
            <linearGradient id="h1-wire" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="var(--h1-accent)" stopOpacity="0.95" />
              <stop offset="1" stopColor="var(--h1-accent)" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          {wires.map((d, i) => (
            <g key={i}>
              <path d={d} className={s.wireGhost} />
              <path d={d} className={s.wire} pathLength={1} style={{ '--i': i } as CSSProperties} />
            </g>
          ))}
        </svg>

        <AgentWindow
          id="claude"
          title="Claude Code"
          meta="you · relay/router"
          icon={<ClaudeCodeColor size={14} />}
          portRefs={[setPort('claudeA'), setPort('claudeB')]}
        >
          <div className={s.layerManual}>
            <Line tone="dim">› why does the retry test flake?</Line>
            <Line lineRef={setLine('claudeOut')} shown={shown('claudeOut')} selected={selected('claudeOut')}>
              ● Found it: retry budget resets on reconnect. Fix in src/retry.ts:42
            </Line>
            <Line lineRef={setLine('claudeIn')} shown={shown('claudeIn')} pasted tone="ask">
              › Maya asks: “Is the retry fix landing today?”
            </Line>
          </div>
          <div className={s.layerRelay}>
            <RelayLine d={0}>● Found it: retry budget resets on reconnect.</RelayLine>
            <RelayLine d={300} dir="out">
              → codex <span>patch src/retry.ts:42</span>
            </RelayLine>
            <RelayLine d={3300} dir="in">
              ← maya’s conductor <span>landing today?</span>
            </RelayLine>
            <RelayLine d={4200} dir="out">
              → maya’s conductor <span>yes, #482 is in review</span>
            </RelayLine>
          </div>
        </AgentWindow>

        <AgentWindow
          id="codex"
          title="Codex"
          meta="you · relay/router"
          icon={<Codex size={14} />}
          portRefs={[setPort('codexA'), setPort('codexB')]}
        >
          <div className={s.layerManual}>
            <Line tone="dim">› waiting for context…</Line>
            <Line lineRef={setLine('codexIn')} shown={shown('codexIn')} pasted>
              › retry budget resets on reconnect. Fix in src/retry.ts:42
            </Line>
            <Line lineRef={setLine('codexOut')} shown={shown('codexOut')} selected={selected('codexOut')} tone="ok">
              • Patched. Tests green. PR #482 is up.
            </Line>
          </div>
          <div className={s.layerRelay}>
            <RelayLine d={900} dir="in">
              ← claude code <span>patch src/retry.ts:42</span>
            </RelayLine>
            <RelayLine d={1500}>• Patched. Tests green. PR #482 is up.</RelayLine>
            <RelayLine d={1900} dir="out">
              → maya’s conductor <span>#482 fixes the flake</span>
            </RelayLine>
          </div>
        </AgentWindow>

        <AgentWindow
          id="cond"
          title="Conductor"
          meta="maya · usage-export"
          icon={<ConductorGlyph />}
          portRefs={[setPort('condA'), setPort('condB')]}
        >
          <div className={s.layerManual}>
            <Line tone="dim">Blocked on the retry flake in relay/router.</Line>
            <Line lineRef={setLine('condIn')} shown={shown('condIn')} pasted>
              Will says: PR #482 fixes the retry flake.
            </Line>
            <Line lineRef={setLine('condOut')} shown={shown('condOut')} selected={selected('condOut')} tone="ask">
              Is the retry fix landing today? Export depends on it.
            </Line>
          </div>
          <div className={s.layerRelay}>
            <RelayLine d={2500} dir="in">
              ← codex <span>#482 fixes the flake</span>
            </RelayLine>
            <RelayLine d={2900} dir="out">
              → claude code <span>landing today?</span>
            </RelayLine>
            <RelayLine d={4900} dir="in">
              ← claude code <span>yes, #482 is in review</span>
            </RelayLine>
            <RelayLine d={5400}>• Rebased usage-export on #482. Unblocked.</RelayLine>
          </div>
        </AgentWindow>

        {talking && !reduced
          ? wires.flatMap((d, i) => [
              <span
                key={`f${i}-${layout}`}
                className={s.packet}
                style={{ offsetPath: `path('${d}')`, '--delay': `${i * 0.95 + 0.4}s` } as CSSProperties}
                aria-hidden="true"
              />,
              <span
                key={`r${i}-${layout}`}
                className={cx(s.packet, s.packetBack)}
                style={{ offsetPath: `path('${d}')`, '--delay': `${i * 0.95 + 3.2}s` } as CSSProperties}
                aria-hidden="true"
              />,
            ])
          : null}

        <div
          className={cx(s.cursor, cursorHidden && s.cursorHidden, CLICK_PHASES.has(shownPhase) && s.cursorClick)}
          style={{ transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)` }}
          aria-hidden="true"
        >
          <span key={shownPhase} className={s.cursorRipple} />
          <svg viewBox="0 0 20 24" width="20" height="24" className={s.cursorArrow}>
            <path d="M2 1.5v18.2l4.9-4.6 3.1 7.1 3.1-1.4-3-6.9h6.6z" />
          </svg>
          <span className={cx(s.cursorChip, chip && s.cursorChipOn)}>
            <kbd>⌘C</kbd>
            {chip ?? CHIP[3]}
          </span>
          <span className={s.cursorName}>you</span>
        </div>
      </div>

      <div className={cx(s.status, relay && s.statusRelay)} aria-hidden="true">
        <div className={s.statusManual}>
          <span className={s.statusDot} />
          <strong>You are the messenger.</strong>
          <span className={s.statusSteps}>copy · switch · paste · re-explain</span>
          <span className={s.statusCount}>
            pastes <b key={pastes}>{pastes}</b>
          </span>
        </div>
        <div className={s.statusRelayRow}>
          <span className={s.statusDot} />
          <strong>Agents message each other.</strong>
          <span className={s.statusSteps}>via agent relay · across tools and teammates</span>
          <span className={s.statusCount}>
            pastes <b>0</b>
          </span>
        </div>
      </div>
    </div>
  );
}
