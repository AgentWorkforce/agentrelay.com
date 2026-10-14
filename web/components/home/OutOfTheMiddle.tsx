import type { CSSProperties, ReactNode } from 'react';

import { ClaudeCodeColor, Codex } from '../brand-icons';
import s from './out-of-the-middle.module.css';

/**
 * Before/after of the same three agents. Both diagrams share one geometry so
 * the only thing that changes is the routing: through you, or direct.
 */

type Point = { x: number; y: number };

const VIEW = { w: 400, h: 260 };
const CLAUDE: Point = { x: 92, y: 52 };
const CODEX: Point = { x: 308, y: 52 };
const MAYA: Point = { x: 200, y: 212 };
const YOU: Point = { x: 200, y: 122 };

const NODES: { at: Point; label: string; icon: ReactNode }[] = [
  { at: CLAUDE, label: 'Claude Code', icon: <ClaudeCodeColor size={14} /> },
  { at: CODEX, label: 'Codex', icon: <Codex size={14} /> },
  { at: MAYA, label: 'Maya’s agent', icon: <span className={s.initial}>M</span> },
];

function pos(p: Point): CSSProperties {
  return { left: `${(p.x / VIEW.w) * 100}%`, top: `${(p.y / VIEW.h) * 100}%` };
}

function Nodes() {
  return NODES.map((node) => (
    <span className={s.node} key={node.label} style={pos(node.at)}>
      {node.icon}
      {node.label}
    </span>
  ));
}

const line = (...points: Point[]) => `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')}`;

/** A gentle outward bow between two agents, so the three wires read as a ring. */
function bow(a: Point, b: Point, bend = 22) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const cx = (a.x + b.x) / 2 + (dy / len) * bend;
  const cy = (a.y + b.y) / 2 - (dx / len) * bend;
  return `M ${a.x} ${a.y} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`;
}

/** Copy, carry, paste: one hop at a time, every hop through you. */
const HOP = 2.4;
const HOPS = [line(CLAUDE, YOU, CODEX), line(CODEX, YOU, MAYA), line(MAYA, YOU, CLAUDE)];

function SerialPacket({ path, index }: { path: string; index: number }) {
  const cycle = HOP * HOPS.length;
  const start = (index * HOP + 0.2) / cycle;
  const end = (index * HOP + HOP - 0.3) / cycle;
  const times = `0;${start.toFixed(3)};${end.toFixed(3)};1`;
  return (
    <circle className={s.carry} r="4" opacity="0">
      <animateMotion path={path} dur={`${cycle}s`} repeatCount="indefinite" calcMode="linear" keyPoints="0;0;1;1" keyTimes={times} />
      <animate
        attributeName="opacity"
        dur={`${cycle}s`}
        repeatCount="indefinite"
        values="0;0;1;1;0;0"
        keyTimes={`0;${start.toFixed(3)};${(start + 0.02).toFixed(3)};${(end - 0.02).toFixed(3)};${end.toFixed(3)};1`}
      />
    </circle>
  );
}

function Before() {
  return (
    <svg className={s.wires} viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} aria-hidden="true">
      {[CLAUDE, CODEX, MAYA].map((p) => (
        <line className={s.spoke} key={`${p.x}-${p.y}`} x1={p.x} y1={p.y} x2={YOU.x} y2={YOU.y} />
      ))}
      <g className={s.packets}>
        {HOPS.map((path, index) => (
          <SerialPacket index={index} key={path} path={path} />
        ))}
      </g>
    </svg>
  );
}

/** Every pair talks at once, both directions. */
const EDGES: [Point, Point][] = [
  [CLAUDE, CODEX],
  [CODEX, MAYA],
  [MAYA, CLAUDE],
];

function After() {
  return (
    <svg className={s.wires} viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} aria-hidden="true">
      {EDGES.map(([a, b]) => (
        <path className={s.wire} d={bow(a, b)} key={`${a.x}-${b.x}`} />
      ))}
      <g className={s.packets}>
        {EDGES.flatMap(([a, b], index) => [
          { path: bow(a, b), begin: index * 0.7 },
          { path: bow(b, a, -22), begin: index * 0.7 + 1.1 },
        ]).map(({ path, begin }) => (
          <g key={path}>
            <circle className={s.glow} r="7" opacity="0">
              <animateMotion path={path} begin={`${begin}s`} dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" begin={`${begin}s`} dur="2.2s" repeatCount="indefinite" values="0;0.5;0.5;0" keyTimes="0;0.15;0.85;1" />
            </circle>
            <circle className={s.message} r="3" opacity="0">
              <animateMotion path={path} begin={`${begin}s`} dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" begin={`${begin}s`} dur="2.2s" repeatCount="indefinite" values="0;1;1;0" keyTimes="0;0.15;0.85;1" />
            </circle>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function OutOfTheMiddle() {
  return (
    <div className={s.split}>
      <figure className={s.side} data-side="before">
        <figcaption className={s.label}>Today</figcaption>
        <div className={s.stage}>
          <Before />
          <Nodes />
          <span className={s.you} style={pos(YOU)}>
            you
            <kbd>⌘C ⌘V</kbd>
          </span>
        </div>
        <p className={s.caption}>You copy, paste, and re-explain.</p>
      </figure>

      <figure className={s.side} data-side="after">
        <figcaption className={s.label}>With Agent Relay</figcaption>
        <div className={s.stage}>
          <After />
          <Nodes />
          <span className={s.youAway} style={pos({ x: 352, y: 212 })}>
            you
          </span>
        </div>
        <p className={s.caption}>Agents message each other. You review.</p>
      </figure>
    </div>
  );
}
