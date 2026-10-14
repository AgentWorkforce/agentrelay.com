import Link from 'next/link';
import type { ReactNode } from 'react';

import { AgentToolLogo } from '../AgentToolLogos';
import { ClaudeCodeColor, Codex, Cursor, OpenCode } from '../brand-icons';
import { SIGNUP_HREF } from '../home/HomeSections';
import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import { BeforeAfter } from './BeforeAfter';
import { MessengerStage } from './MessengerStage';
import { Scenes } from './Scenes';
import s from './home-1.module.css';

const WORKS_WITH: { label: string; logo: ReactNode }[] = [
  { label: 'Claude Code', logo: <ClaudeCodeColor size={18} /> },
  { label: 'Codex', logo: <Codex size={18} /> },
  { label: 'Cursor', logo: <Cursor size={18} /> },
  { label: 'Gemini', logo: <AgentToolLogo provider="gemini" idPrefix="h1-gemini" className={s.toolLogo} /> },
  { label: 'OpenCode', logo: <OpenCode size={18} /> },
  {
    label: 'Conductor',
    logo: (
      <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
        <rect x="1" y="1" width="14" height="14" rx="4" fill="currentColor" opacity="0.9" />
        <path d="M5 11V5h1.6l2.8 3.8V5H11v6H9.4L6.6 7.2V11z" fill="var(--h1-bg)" />
      </svg>
    ),
  },
];

const PRIMITIVES = [
  { name: 'Messaging', body: 'Agents send each other messages by name, across any harness.' },
  { name: 'Shared sessions', body: 'Search teammates’ sessions from any agent over MCP.' },
  { name: 'Durable workflows', body: 'Multi-agent runs that persist every step and survive restarts.' },
  { name: 'Shared filesystem', body: 'Agents on different machines read and write the same files.' },
  { name: 'A2A', body: 'Talk to agents that speak the Agent2Agent protocol.' },
];

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={s.btnArrow}>
      <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function HomeOne() {
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
        {/* ── Hero ── */}
        <section className={s.hero} aria-labelledby="h1-title">
          <div className={s.heroGrain} aria-hidden="true" />
          <div className={s.wrap}>
            <h1 id="h1-title" className={s.heroTitle}>
              <span className={s.heroLine}>Your agents talk</span>
              <span className={s.heroLine}>
                through <span className={s.heroYou}>you.</span>
              </span>
            </h1>
            <div className={s.heroFoot}>
              <p className={s.heroLede}>
                You copy what Claude Code found into Codex, then carry Codex’s answer to your teammate. Agent Relay lets
                them <strong>message each other directly</strong>, across tools, machines and teammates.
              </p>
              <div className={s.heroCtas}>
                <a className={s.btnPrimary} href={SIGNUP_HREF}>
                  Sign up for free <Arrow />
                </a>
                <a className={s.btnGhost} href="#out-of-the-middle">
                  See the difference
                </a>
              </div>
            </div>

            <MessengerStage />

            <ul className={s.worksWith} aria-label="Works with">
              <li className={s.worksWithLabel}>Works with any agent</li>
              {WORKS_WITH.map((tool) => (
                <li key={tool.label}>
                  {tool.logo}
                  {tool.label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Before / after ── */}
        <section id="out-of-the-middle" className={s.section} aria-labelledby="h1-ba">
          <div className={s.wrap}>
            <header className={s.sectionHead}>
              <p className={s.eyebrow}>Before / after</p>
              <h2 id="h1-ba" className={s.sectionTitle}>
                Take yourself out of the middle.
              </h2>
            </header>
            <BeforeAfter />
          </div>
        </section>

        {/* ── Scenes ── */}
        <section className={s.section} aria-labelledby="h1-scenes">
          <div className={s.wrap}>
            <header className={s.sectionHead}>
              <p className={s.eyebrow}>Sound familiar?</p>
              <h2 id="h1-scenes" className={s.sectionTitle}>
                You’ve lived every one of these.
              </h2>
            </header>
            <Scenes />
          </div>
        </section>

        {/* ── Developers ── */}
        <section className={`${s.section} ${s.devSection}`} aria-labelledby="h1-dev">
          <div className={`${s.wrap} ${s.devGrid}`}>
            <div className={s.devCopy}>
              <p className={s.eyebrow}>For developers</p>
              <h2 id="h1-dev" className={s.devTitle}>
                Build on the same primitives.
              </h2>
              <p className={s.devLede}>
                The desktop app is the easy way in. Underneath is an SDK and an MCP server named{' '}
                <code>agent-relay</code>.
              </p>
              <ul className={s.primitives}>
                {PRIMITIVES.map((p) => (
                  <li key={p.name}>
                    <strong>{p.name}</strong>
                    <span>{p.body}</span>
                  </li>
                ))}
              </ul>
              <Link className={s.textLink} href="/docs">
                Read the docs <Arrow />
              </Link>
            </div>
            <div className={s.devCode}>
              <div className={s.devCodeBar}>
                <span className={s.winDots} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>handoff.ts</span>
              </div>
              <pre>
                <code>
                  <i>import</i> {'{'} AgentRelay {'}'} <i>from</i> <em>&quot;@agent-relay/sdk&quot;</em>;{'\n\n'}
                  <i>const</i> relay = <i>new</i> <u>AgentRelay</u>({'{'} channels: [<em>&quot;release&quot;</em>] {'}'});
                  {'\n\n'}
                  <i>await</i> relay.<b>spawnAgent</b>({'{'}
                  {'\n'}  name: <em>&quot;Reviewer&quot;</em>,{'\n'}  cli: <em>&quot;codex&quot;</em>,{'\n'}  task:{' '}
                  <em>&quot;Review PRs other agents send you.&quot;</em>,{'\n'}
                  {'}'});{'\n\n'}
                  <i>const</i> will = relay.<b>human</b>({'{'} name: <em>&quot;Will&quot;</em> {'}'});{'\n'}
                  <i>await</i> will.<b>sendMessage</b>({'{'}
                  {'\n'}  to: <em>&quot;Reviewer&quot;</em>,{'\n'}  text: <em>&quot;#482 fixes the retry flake. Review?&quot;</em>,
                  {'\n'}
                  {'}'});
                </code>
              </pre>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className={s.cta} aria-labelledby="h1-cta">
          <div className={s.ctaWires} aria-hidden="true">
            <svg viewBox="0 0 1200 300" preserveAspectRatio="none">
              <path d="M-20 220 C 260 60, 520 300, 760 140 S 1100 60, 1220 120" />
              <path d="M-20 260 C 300 140, 560 320, 820 190 S 1120 120, 1220 170" />
            </svg>
          </div>
          <div className={s.wrap}>
            <h2 id="h1-cta" className={s.ctaTitle}>
              Stop carrying messages.
            </h2>
            <p className={s.ctaLede}>Let your agents talk. Get back to shipping.</p>
            <a className={`${s.btnPrimary} ${s.btnLarge}`} href={SIGNUP_HREF}>
              Sign up for free <Arrow />
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
