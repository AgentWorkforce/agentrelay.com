'use client';

import { useRef, type ReactNode } from 'react';

import { ClaudeCodeColor, Codex } from '../brand-icons';
import { useInView, useReducedMotion } from './hooks';
import s from './home-1.module.css';

type Node = { x: number; y: number; label: string; icon: ReactNode };

const CLAUDE: Node = { x: 92, y: 62, label: 'Claude Code', icon: <ClaudeCodeColor size={16} y={-8} /> };
const CODEX: Node = { x: 388, y: 62, label: 'Codex', icon: <Codex size={16} y={-8} color="#e9eef4" /> };
const TEAM: Node = {
  x: 240,
  y: 286,
  label: 'Maya’s agent',
  icon: (
    <g transform="translate(0 -8)">
      <rect width="16" height="16" rx="5" fill="#e9e4da" />
      <text x="8" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1d1a16">
        M
      </text>
    </g>
  ),
};

function AgentNode({ node, dim = false }: { node: Node; dim?: boolean }) {
  const w = node.label.length * 7.2 + 46;
  return (
    <g transform={`translate(${node.x} ${node.y})`} className={dim ? s.baNodeDim : s.baNode}>
      <rect x={-w / 2} y={-17} width={w} height={34} rx={11} className={s.baNodeBox} />
      <g transform={`translate(${-w / 2 + 12} 0)`}>{node.icon}</g>
      <text x={-w / 2 + 34} y={4.5} className={s.baNodeText}>
        {node.label}
      </text>
    </g>
  );
}

function Packet({ path, begin, dur, label, accent }: { path: string; begin: number; dur: number; label: string; accent?: boolean }) {
  const w = label.length * 6.4 + 14;
  return (
    <g className={accent ? s.baPacketAccent : s.baPacket} opacity="0">
      <rect x={-w / 2} y={-9} width={w} height={18} rx={6} />
      <text x={0} y={3.6} textAnchor="middle">
        {label}
      </text>
      <animateMotion path={path} begin={`${begin}s`} dur={`${dur}s`} repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
      <animate
        attributeName="opacity"
        values="0;1;1;0"
        keyTimes="0;0.12;0.86;1"
        begin={`${begin}s`}
        dur={`${dur}s`}
        repeatCount="indefinite"
      />
    </g>
  );
}

function BeforeDiagram({ animate }: { animate: boolean }) {
  const you = { x: 240, y: 172 };
  const hop = (a: Node, b: Node) =>
    `M ${a.x} ${a.y + 17} Q ${(a.x + you.x) / 2} ${you.y - 6} ${you.x} ${you.y} Q ${(b.x + you.x) / 2} ${you.y + 6} ${b.x} ${b.y - 17}`;
  const hops = [hop(CLAUDE, CODEX), hop(CODEX, TEAM), hop(TEAM, CLAUDE)];
  return (
    <svg viewBox="0 0 480 330" className={s.baSvg} aria-hidden="true">
      {[CLAUDE, CODEX, TEAM].map((n) => (
        <line key={n.label} x1={n.x} y1={n.y} x2={you.x} y2={you.y} className={s.baSpoke} />
      ))}
      {animate
        ? hops.map((d, i) => (
            <g key={d}>
              <Packet path={d} begin={i * 1.6} dur={4.8} label="⌘C" />
              <Packet path={d} begin={i * 1.6 + 2.4} dur={4.8} label="⌘V" />
            </g>
          ))
        : null}
      <g transform={`translate(${you.x} ${you.y})`}>
        <circle r="52" className={s.baYouHalo} />
        <circle r="36" className={s.baYou} />
        <text y="5" textAnchor="middle" className={s.baYouText}>
          you
        </text>
      </g>
      <AgentNode node={CLAUDE} />
      <AgentNode node={CODEX} />
      <AgentNode node={TEAM} />
    </svg>
  );
}

function AfterDiagram({ animate }: { animate: boolean }) {
  const edge = (a: Node, b: Node, bend: number) => {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const cx = mx + (-dy / len) * bend;
    const cy = my + (dx / len) * bend;
    return `M ${a.x} ${a.y} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`;
  };
  const edges = [edge(CLAUDE, CODEX, -26), edge(CODEX, TEAM, -26), edge(TEAM, CLAUDE, -26)];
  const back = [edge(CODEX, CLAUDE, 26), edge(TEAM, CODEX, 26), edge(CLAUDE, TEAM, 26)];
  return (
    <svg viewBox="0 0 480 330" className={s.baSvg} aria-hidden="true">
      {edges.map((d, i) => (
        <path key={d} d={d} className={s.baWire} pathLength={1} style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
      {animate
        ? [...edges, ...back].map((d, i) => (
            <Packet key={`${d}-${i}`} path={d} begin={(i % 3) * 1.1 + (i >= 3 ? 1.9 : 0)} dur={3.3} label="msg" accent />
          ))
        : null}
      <g transform="translate(408 286)" className={s.baYouAway}>
        <circle r="18" />
        <text y="4" textAnchor="middle">
          you
        </text>
        <text x="0" y="36" textAnchor="middle" className={s.baYouAwayNote}>
          reviewing #482
        </text>
      </g>
      <AgentNode node={CLAUDE} />
      <AgentNode node={CODEX} />
      <AgentNode node={TEAM} />
    </svg>
  );
}

export function BeforeAfter() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, '200px 0px');
  const reduced = useReducedMotion();
  const animate = inView && !reduced;

  return (
    <div ref={ref} className={s.baGrid}>
      <article className={s.baPanel}>
        <header className={s.baHead}>
          <span className={s.baTag}>Today</span>
          <h3>Everything routes through you.</h3>
        </header>
        <BeforeDiagram animate={animate} />
        <ol className={s.baList}>
          <li>Copy the answer out of one terminal.</li>
          <li>Paste it into another. Re-explain the repo.</li>
          <li>Do it again when your teammate asks.</li>
        </ol>
      </article>

      <div className={s.baArrow} aria-hidden="true">
        <svg viewBox="0 0 48 48" width="48" height="48">
          <path d="M10 24h26M28 15l9 9-9 9" />
        </svg>
      </div>

      <article className={`${s.baPanel} ${s.baPanelAfter}`}>
        <header className={s.baHead}>
          <span className={`${s.baTag} ${s.baTagAccent}`}>With Agent Relay</span>
          <h3>Agents talk directly.</h3>
        </header>
        <AfterDiagram animate={animate} />
        <ol className={s.baList}>
          <li>Agents message each other by name.</li>
          <li>Context travels with the message.</li>
          <li>You review the result.</li>
        </ol>
      </article>
    </div>
  );
}
