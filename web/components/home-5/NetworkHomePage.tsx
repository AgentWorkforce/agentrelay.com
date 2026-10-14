import type { CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';

import { InvestorStrip } from '../InvestorStrip';
import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import { SIGNUP_HREF } from '../home/HomeSections';
import { Chapters } from './Chapters';
import { NetworkHero } from './NetworkHero';
import { ToolMark, type Tool } from './ToolMark';
import s from './home5.module.css';

const BUILD = [
  {
    name: 'SDK',
    line: 'Message any agent from your own code.',
    code: (
      <code>
        agent.<span className={s.fn}>sendMessage</span>({'{'} to: <span className={s.str}>&apos;codex&apos;</span>, text {'}'})
      </code>
    ),
  },
  {
    name: 'Workflows',
    line: 'Durable multi-agent workflows you define once and rerun.',
    code: (
      <code>
        plan <span className={s.dim}>→</span> build <span className={s.dim}>→</span> review <span className={s.dim}>→</span> ship
      </code>
    ),
  },
  {
    name: 'Shared filesystem',
    line: 'One set of files every agent reads and writes.',
    code: (
      <code>
        /team/specs/<span className={s.str}>retry.md</span>
      </code>
    ),
  },
  {
    name: 'A2A',
    line: 'Interoperate with agents that speak the A2A protocol.',
    code: (
      <code>
        <span className={s.fn}>a2a</span> <span className={s.dim}>⇄</span> agent-relay
      </code>
    ),
  },
];

function BuildSection() {
  return (
    <section className={s.build} aria-labelledby="h5-build-title">
      <div className={s.buildHead}>
        <p className={s.kicker}>
          <span className={s.kickerIndex}>dev</span>
          Under the hood
        </p>
        <h2 id="h5-build-title" className={s.buildTitle}>
          Build on the relay.
        </h2>
        <p className={s.chapterLine}>The primitives behind it are yours to program.</p>
      </div>
      <div className={s.buildGrid}>
        {BUILD.map((item) => (
          <div key={item.name} className={s.buildCell}>
            <h3>{item.name}</h3>
            <p>{item.line}</p>
            <div className={s.buildCode}>{item.code}</div>
          </div>
        ))}
      </div>
      <a className={s.buildLink} href="/docs">
        Read the docs <ArrowRight aria-hidden="true" />
      </a>
    </section>
  );
}

const CONSTELLATION: { tool: Tool; x: number; y: number }[] = [
  { tool: 'claude', x: 12, y: 22 },
  { tool: 'codex', x: 88, y: 18 },
  { tool: 'cursor', x: 6, y: 70 },
  { tool: 'opencode', x: 94, y: 74 },
  { tool: 'gemini', x: 50, y: 0 },
];

function FinalCta() {
  return (
    <section className={s.final} aria-labelledby="h5-final-title">
      <div className={s.finalStage}>
        <div className={s.orbit} aria-hidden="true">
          <span className={s.orbitCore} />
          <svg className={s.orbitLinks} viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
            {CONSTELLATION.map((star, i) => (
              <g key={star.tool} className={`${s.link} ${i % 2 ? s.tone_warm : s.tone_blue}`}>
                <path className={s.linkBase} d={`M${star.x} ${star.y} L 50 50`} vectorEffect="non-scaling-stroke" />
                <path
                  className={s.linkPulse}
                  d={`M${star.x} ${star.y} L 50 50`}
                  pathLength={100}
                  vectorEffect="non-scaling-stroke"
                  style={{ animationDuration: '3.4s', animationDelay: `${i * 0.7}s` } as CSSProperties}
                />
              </g>
            ))}
          </svg>
          {CONSTELLATION.map((star, i) => (
            <span
              key={star.tool}
              className={s.orbitChip}
              style={{ left: `${star.x}%`, top: `${star.y}%`, animationDelay: `${i * -1.3}s` } as CSSProperties}
            >
              <ToolMark tool={star.tool} id={`orbit-${star.tool}`} />
            </span>
          ))}
        </div>
        <div className={s.finalCopy}>
          <h2 id="h5-final-title" className={s.finalTitle}>
            Let your agents <span className={s.glowWord}>talk.</span>
          </h2>
          <p className={s.chapterLine}>They coordinate. You ship.</p>
          <a className={s.ctaPrimary} href={SIGNUP_HREF}>
            Sign up for free <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </div>
      <div className={s.investors}>
        <InvestorStrip />
      </div>
    </section>
  );
}

export function NetworkHomePage() {
  return (
    <div className={s.page}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteNav
        hideLinks
        singleAction
        actions={
          <a className={s.navCta} href={SIGNUP_HREF}>
            Sign up for free
          </a>
        }
      />
      <main id="main">
        <NetworkHero />
        <Chapters />
        <BuildSection />
        <FinalCta />
      </main>
      <SiteFooter productUpdates />
    </div>
  );
}
