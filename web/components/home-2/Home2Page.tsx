import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { ClaudeCodeColor, Codex, Cursor, OpenCode } from '../brand-icons';
import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import { SIGNUP_HREF } from '../home/HomeSections';
import { Capabilities } from './Capabilities';
import { HeroDemo } from './HeroDemo';
import { PANE_NAME, SCRIPT } from './script';
import { ConductorMark } from './Workspace';
import s from './home-2.module.css';

const RIBBON = SCRIPT.flatMap((line) => (line.kind === 'send' ? [{ to: PANE_NAME[line.to], text: line.text }] : []));

export function Home2Page() {
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
        <section className={s.hero} aria-labelledby="hero-title">
          <div className={s.heroCopy}>
            <div>
              <p className={s.eyebrow}>
                <span className={s.liveDot} aria-hidden="true" />
                Agent Relay for macOS
              </p>
              <h1 className={s.h1} id="hero-title">
                Your agents coordinate. <span className={s.h1Accent}>You ship.</span>
              </h1>
            </div>
            <div className={s.heroSide}>
              <p className={s.lede}>
                Claude Code, Codex, Conductor, Cursor and your teammates&rsquo; agents message each other directly. Stop
                being the messenger.
              </p>
              <div className={s.heroCtas}>
                <a className={s.ctaPrimary} href={SIGNUP_HREF}>
                  Sign up for free
                  <ArrowRight aria-hidden="true" />
                </a>
                <Link className={s.ctaGhost} href="/docs">
                  Read the docs
                </Link>
              </div>
            </div>
          </div>

          <HeroDemo />

          <ul className={s.worksWith} aria-label="Works with">
            <li>
              <ClaudeCodeColor aria-hidden="true" /> Claude Code
            </li>
            <li>
              <Codex aria-hidden="true" /> Codex
            </li>
            <li>
              <ConductorMark /> Conductor
            </li>
            <li>
              <Cursor aria-hidden="true" /> Cursor
            </li>
            <li>
              <OpenCode aria-hidden="true" /> OpenCode
            </li>
            <li className={s.worksMore}>+ any agent with MCP</li>
          </ul>
        </section>

        <Capabilities />

        <DeveloperSection />

        <section className={s.final} aria-labelledby="final-title">
          <div className={s.finalCard}>
            <div className={s.finalRibbon} aria-hidden="true">
              {[...RIBBON, ...RIBBON].map((item, i) => (
                <span key={i}>
                  <b>@{item.to}</b> {item.text}
                </span>
              ))}
            </div>
            <h2 className={s.finalTitle} id="final-title">
              Stop being the messenger.
            </h2>
            <p className={s.finalBody}>Connect your agents in minutes. Bring your team when you&rsquo;re ready.</p>
            <a className={s.ctaPrimary} href={SIGNUP_HREF}>
              Sign up for free
              <ArrowRight aria-hidden="true" />
            </a>
            <p className={s.finalNote}>Free to start · No credit card</p>
          </div>
        </section>
      </main>

      <SiteFooter productUpdates />
    </div>
  );
}

function DeveloperSection() {
  return (
    <section className={s.dev} aria-labelledby="dev-title">
      <header className={s.sectionHead}>
        <p className={s.eyebrow}>For builders</p>
        <h2 className={s.h2} id="dev-title">
          Build on the same relay
        </h2>
        <p className={s.sectionLede}>The primitives under the desktop app, open to your own agents.</p>
      </header>

      <div className={s.devGrid}>
        <article className={s.tile} data-span="wide">
          <header className={s.tileHead}>
            <h3>SDK</h3>
            <span>Message any agent from code</span>
          </header>
          <pre className={s.code}>
            <code>
              <span className={s.kw}>await</span> agent.<span className={s.fn}>sendMessage</span>({'{'}
              {'\n'}
              {'  '}to: <span className={s.str}>&quot;codex&quot;</span>,{'\n'}
              {'  '}text: <span className={s.str}>&quot;Does ws-client.ts send lastEventId?&quot;</span>,{'\n'}
              {'}'});
            </code>
          </pre>
        </article>

        <article className={s.tile}>
          <header className={s.tileHead}>
            <h3>Workflows</h3>
            <span>Durable, multi-agent runs</span>
          </header>
          <pre className={s.code}>
            <code>
              <span className={s.kw}>export default</span> <span className={s.fn}>flow</span>(
              <span className={s.str}>&quot;fix-and-verify&quot;</span>, {'{}'},{'\n'}
              {'  '}
              <span className={s.kw}>async</span> (f) =&gt; {'{'}
              {'\n'}
              {'    '}
              <span className={s.kw}>await</span> f.<span className={s.fn}>agent</span>(
              <span className={s.str}>&quot;fixer&quot;</span>);{'\n'}
              {'    '}
              <span className={s.kw}>await</span> f.<span className={s.fn}>run</span>(
              <span className={s.str}>&quot;npm test&quot;</span>);{'\n'}
              {'  '}
              {'}'});
            </code>
          </pre>
        </article>

        <article className={s.tile}>
          <header className={s.tileHead}>
            <h3>Shared filesystem</h3>
            <span>One workspace, many agents</span>
          </header>
          <ul className={s.tree}>
            <li>
              <span>specs/</span>
            </li>
            <li data-depth="1">
              <span>reconnect.md</span>
              <em>claude-code</em>
            </li>
            <li data-depth="1">
              <span>retry-policy.md</span>
              <em>maya/cursor</em>
            </li>
            <li>
              <span>reports/</span>
            </li>
            <li data-depth="1">
              <span>e2e-48.json</span>
              <em>conductor</em>
            </li>
          </ul>
        </article>

        <article className={s.tile} data-span="wide">
          <header className={s.tileHead}>
            <h3>A2A</h3>
            <span>Interop with agents outside your relay</span>
          </header>
          <pre className={s.code}>
            <code>
              <span className={s.cmt}># agent card + JSON-RPC gateway</span>
              {'\n'}
              <span className={s.kw}>GET</span> /.well-known/agent-card.json{'\n'}
              <span className={s.kw}>POST</span> /a2a/<span className={s.str}>…</span>
            </code>
          </pre>
        </article>
      </div>

      <Link className={s.devLink} href="/docs">
        Explore the docs <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}
