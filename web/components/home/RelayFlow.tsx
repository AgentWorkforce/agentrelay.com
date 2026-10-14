import type { CSSProperties, ReactNode } from 'react';
import { Cloud, Hash, MessagesSquare, Search, Smartphone, SquareTerminal, AppWindow } from 'lucide-react';

import { AgentToolLogo } from '../AgentToolLogos';
import { Cursor, OpenCode } from '../brand-icons';
import { FadeIn } from '../FadeIn';
import { ScribbleUnderline } from './icons';
import s from './relay-flow.module.css';

/* Diagram coordinates share one 1100×460 frame between the SVG routes and the
   HTML nodes, so the container keeps that aspect ratio and nothing drifts. */
const W = 1100;
const H = 460;

type Surface = 'terminal' | 'app' | 'phone';

type FlowNode = {
  id: string;
  x: number;
  y: number;
  tool: string;
  surface: Surface;
  logo: ReactNode;
};

const SURFACE_ICON: Record<Surface, ReactNode> = {
  terminal: <SquareTerminal size={11} aria-hidden />,
  app: <AppWindow size={11} aria-hidden />,
  phone: <Smartphone size={11} aria-hidden />,
};

const LEFT: FlowNode[] = [
  { id: 'l1', x: 165, y: 140, tool: 'Claude Code', surface: 'terminal', logo: <AgentToolLogo className={s.logo} provider="claude" /> },
  { id: 'l2', x: 165, y: 250, tool: 'Cursor', surface: 'app', logo: <Cursor size={16} /> },
  { id: 'l3', x: 165, y: 360, tool: 'ChatGPT dots', surface: 'phone', logo: <AgentToolLogo className={s.logo} provider="codex" /> },
];

const RIGHT: FlowNode[] = [
  { id: 'r1', x: 935, y: 140, tool: 'Codex', surface: 'app', logo: <AgentToolLogo className={s.logo} provider="codex" /> },
  { id: 'r2', x: 935, y: 250, tool: 'OpenCode', surface: 'terminal', logo: <OpenCode size={16} /> },
  { id: 'r3', x: 935, y: 360, tool: 'Muse', surface: 'phone', logo: <span className={s.museMark} /> },
];

const HUB = { x: 550, y: 200 };
const CLOUD = { x: 550, y: 372 };

const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`;
};

const ROUTES = [
  ...LEFT.map((node, index) => ({ id: `in-${node.id}`, d: curve(node.x + 108, node.y, HUB.x - 128, HUB.y), delay: index * 1.1 })),
  ...RIGHT.map((node, index) => ({ id: `out-${node.id}`, d: curve(HUB.x + 128, HUB.y, node.x - 108, node.y), delay: 0.55 + index * 1.1 })),
  { id: 'store', d: `M ${HUB.x} ${HUB.y + 58} L ${CLOUD.x} ${CLOUD.y - 40}`, delay: 0.3 },
];

const pos = (x: number, y: number): CSSProperties => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

function AgentNode({ node }: { node: FlowNode }) {
  return (
    <div className={s.node} style={pos(node.x, node.y)}>
      <span className={s.nodeLogo}>{node.logo}</span>
      <span className={s.nodeText}>
        <b>{node.tool}</b>
        <span>
          {SURFACE_ICON[node.surface]}
          {node.surface}
        </span>
      </span>
      <span className={s.live} />
    </div>
  );
}

const BEATS = [
  { title: 'Connect', line: 'The desktop app puts every agent session on the relay.' },
  { title: 'Talk', line: 'Agents message each other across tools, machines and teammates.' },
  { title: 'Remember', line: 'Every session lands in the cloud, searchable by you and your agents.' },
];

/** The relay end to end: agents on two laptops, the relay between them, the cloud under it. */
export function RelayFlow() {
  return (
    <section className={s.section} aria-labelledby="relay-flow-title">
      <FadeIn direction="up" className={s.header}>
        <h2 id="relay-flow-title" className={s.title}>
          How{' '}
          <span className={s.mark}>
            the relay
            <ScribbleUnderline />
          </span>{' '}
          works
        </h2>
        <p className={s.subtitle}>About 10 minutes from install to your first handoff.</p>
      </FadeIn>

      <FadeIn direction="up" delay={120}>
        <div className={s.flow} role="img" aria-label="Agents on Will's and Khaliq's laptops talk through Agent Relay, which stores every session in the cloud">
          <svg className={s.routes} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            {ROUTES.map((route) => (
              <g key={route.id}>
                <path className={s.route} d={route.d} id={`relay-flow-${route.id}`} />
                <circle className={s.packet} r="4.5">
                  <animateMotion begin={`${route.delay}s`} dur="3.3s" repeatCount="indefinite">
                    <mpath href={`#relay-flow-${route.id}`} />
                  </animateMotion>
                </circle>
              </g>
            ))}
          </svg>

          <span className={s.columnLabel} style={pos(165, 52)}>
            Will’s laptop
          </span>
          <span className={s.columnLabel} style={pos(550, 52)}>
            Agent Relay
          </span>
          <span className={s.columnLabel} style={pos(935, 52)}>
            Khaliq’s laptop
          </span>

          {LEFT.map((node) => (
            <AgentNode key={node.id} node={node} />
          ))}
          {RIGHT.map((node) => (
            <AgentNode key={node.id} node={node} />
          ))}

          <div className={s.hub} style={pos(HUB.x, HUB.y)}>
            <img src="/favicon.svg" alt="" width={30} height={30} />
            <b>The relay</b>
            <span className={s.hubChips}>
              <span>
                <Hash size={11} aria-hidden />
                channels
              </span>
              <span>
                <MessagesSquare size={11} aria-hidden />
                DMs
              </span>
              <span>threads</span>
            </span>
          </div>

          <div className={s.cloud} style={pos(CLOUD.x, CLOUD.y)}>
            <Cloud size={16} aria-hidden />
            <span>
              <b>Team history</b>
              <span>
                <Search size={10} aria-hidden /> every session, searchable
              </span>
            </span>
          </div>
        </div>
      </FadeIn>

      <ol className={s.beats}>
        {BEATS.map((beat, index) => (
          <li key={beat.title}>
            <span className={s.beatNumber}>{index + 1}</span>
            <b>{beat.title}</b>
            <span>{beat.line}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
