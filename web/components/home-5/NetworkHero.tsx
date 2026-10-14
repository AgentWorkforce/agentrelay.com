import type { CSSProperties } from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';

import { RelayRibbons } from '../RelayRibbons';
import { SIGNUP_HREF } from '../home/HomeSections';
import { DepthStage } from './DepthStage';
import { ToolMark, type Tool } from './ToolMark';
import s from './home5.module.css';

/** Scene coordinates share the SVG viewBox (1440 × 900); nodes sit at the same points. */
type NetNode = {
  id: string;
  who: string;
  where: string;
  x: number;
  y: number;
  tools: Tool[];
  depth: 'far' | 'mid' | 'near';
};

const NODES: NetNode[] = [
  { id: 'maya', who: 'maya', where: 'macbook', x: 210, y: 300, tools: ['claude', 'codex'], depth: 'mid' },
  { id: 'sam', who: 'sam', where: 'linux', x: 1235, y: 280, tools: ['cursor', 'opencode'], depth: 'mid' },
  { id: 'you', who: 'you', where: 'macbook', x: 720, y: 760, tools: ['claude', 'codex', 'cursor'], depth: 'near' },
  { id: 'phone', who: 'you', where: 'phone', x: 1165, y: 705, tools: ['claude'], depth: 'near' },
  { id: 'lee', who: 'lee', where: 'macbook', x: 285, y: 715, tools: ['gemini', 'codex'], depth: 'near' },
  { id: 'priya', who: 'priya', where: 'macbook', x: 500, y: 178, tools: ['codex'], depth: 'far' },
  { id: 'jo', who: 'jo', where: 'linux', x: 985, y: 168, tools: ['claude'], depth: 'far' },
];

type Link = { d: string; tone: 'blue' | 'warm'; dur: number; delay: number; reverse?: boolean; faint?: boolean };

const LINKS: Link[] = [
  { d: 'M210 300 C 210 540, 520 780, 720 760', tone: 'blue', dur: 4.2, delay: 0 },
  { d: 'M1235 280 C 1250 540, 940 730, 720 760', tone: 'warm', dur: 4.6, delay: 1.4, reverse: true },
  { d: 'M210 300 C 470 40, 980 30, 1235 280', tone: 'blue', dur: 5.4, delay: 2.2 },
  { d: 'M285 715 Q 500 830 720 760', tone: 'warm', dur: 3.4, delay: 0.8 },
  { d: 'M720 760 Q 950 830 1165 705', tone: 'blue', dur: 3.6, delay: 2.9 },
  { d: 'M210 300 Q 150 520 285 715', tone: 'blue', dur: 3.8, delay: 3.6, reverse: true },
  { d: 'M1235 280 Q 1310 500 1165 705', tone: 'warm', dur: 3.9, delay: 0.4 },
  { d: 'M500 178 Q 330 190 210 300', tone: 'blue', dur: 4.4, delay: 1.9, faint: true },
  { d: 'M985 168 Q 1150 180 1235 280', tone: 'warm', dur: 4.8, delay: 3.1, faint: true },
  { d: 'M500 178 Q 740 120 985 168', tone: 'blue', dur: 5.2, delay: 0.6, faint: true, reverse: true },
];

type Chip = { x: number; y: number; from: Tool; route: string; text: string; delay: number };

const CHIPS: Chip[] = [
  { x: 400, y: 600, from: 'codex', route: 'maya → you', text: 'Tests green on retry.ts', delay: 0 },
  { x: 1255, y: 490, from: 'cursor', route: 'sam → your phone', text: 'Migration landed. Rebase?', delay: 4 },
  { x: 960, y: 838, from: 'claude', route: 'you → lee', text: 'Your turn: review #412', delay: 8 },
];

function pct(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

function NodeCard({ node }: { node: NetNode }) {
  return (
    <div
      className={`${s.node} ${s[`node_${node.depth}`]} ${node.id === 'you' ? s.nodeYou : ''}`}
      style={{ left: pct(node.x, 1440), top: pct(node.y, 900) } as CSSProperties}
    >
      <span className={s.nodeHalo} />
      <div className={s.nodeCard}>
        <div className={s.nodeHead}>
          <span className={s.liveDot} />
          <span className={s.nodeWho}>{node.who}</span>
          <span className={s.nodeWhere}>{node.where}</span>
        </div>
        <div className={s.nodeAgents}>
          {node.tools.map((tool) => (
            <span key={tool} className={s.agentChip}>
              <ToolMark tool={tool} id={`${node.id}-${tool}`} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function NetworkHero() {
  return (
    <section className={s.hero} aria-labelledby="h5-title">
      <DepthStage className={s.stage}>
        <div className={s.sky} aria-hidden="true">
          <span className={s.dust} />
          <span className={`${s.dust} ${s.dustNear}`} />
        </div>

        <div className={s.ribbonLayer} aria-hidden="true">
          <RelayRibbons className={s.ribbons} focus={[0.5, 0.12]} />
        </div>

        <div className={s.sceneLayer} aria-hidden="true">
          <div className={s.sceneParallax}>
            <div className={s.scene}>
              <svg className={s.links} viewBox="0 0 1440 900" fill="none">
                <defs>
                  <radialGradient id="h5-floor" cx="50%" cy="85%" r="60%">
                    <stop offset="0" stopColor="#74b8e2" stopOpacity="0.16" />
                    <stop offset="1" stopColor="#74b8e2" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <ellipse cx="720" cy="780" rx="760" ry="260" fill="url(#h5-floor)" />
                {LINKS.map((link) => (
                  <g key={link.d} className={`${s.link} ${link.faint ? s.linkFaint : ''} ${s[`tone_${link.tone}`]}`}>
                    <path className={s.linkBase} d={link.d} />
                    <path
                      className={s.linkGlow}
                      d={link.d}
                      pathLength={100}
                      style={
                        {
                          animationDuration: `${link.dur}s`,
                          animationDelay: `${link.delay}s`,
                          animationDirection: link.reverse ? 'reverse' : 'normal',
                        } as CSSProperties
                      }
                    />
                    <path
                      className={s.linkPulse}
                      d={link.d}
                      pathLength={100}
                      style={
                        {
                          animationDuration: `${link.dur}s`,
                          animationDelay: `${link.delay}s`,
                          animationDirection: link.reverse ? 'reverse' : 'normal',
                        } as CSSProperties
                      }
                    />
                  </g>
                ))}
              </svg>

              {NODES.map((node) => (
                <NodeCard key={node.id} node={node} />
              ))}

              {CHIPS.map((chip) => (
                <div
                  key={chip.text}
                  className={s.chip}
                  style={
                    {
                      left: pct(chip.x, 1440),
                      top: pct(chip.y, 900),
                      animationDelay: `${chip.delay}s`,
                    } as CSSProperties
                  }
                >
                  <span className={s.chipRoute}>
                    <ToolMark tool={chip.from} id={`chip-${chip.delay}`} />
                    {chip.route}
                  </span>
                  <span className={s.chipText}>{chip.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={s.heroCopy}>
          <p className={s.eyebrow}>
            <span className={s.eyebrowDot} />
            Agent Relay for teams on coding agents
          </p>
          <h1 id="h5-title" className={s.heroTitle}>
            Stop being the <span className={s.glowWord}>messenger.</span>
          </h1>
          <p className={s.heroLine}>
            Your team&rsquo;s coding agents talk to each other directly &mdash; across tools, machines, and teammates.
          </p>
          <div className={s.heroActions}>
            <a className={s.ctaPrimary} href={SIGNUP_HREF}>
              Sign up for free <ArrowRight aria-hidden="true" />
            </a>
            <a className={s.ctaGhost} href="#h5-machine">
              Fly through it <ArrowDown aria-hidden="true" />
            </a>
          </div>
        </div>
      </DepthStage>
    </section>
  );
}
