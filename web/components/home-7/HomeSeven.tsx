import type { ReactNode } from 'react';

import { AgentToolLogo } from '../AgentToolLogos';
import { ClaudeCodeColor, Codex, Cursor, OpenCode } from '../brand-icons';
import { SIGNUP_HREF } from '../home/HomeSections';
import { ScribbleUnderline } from '../home/icons';
import { InvestorStrip } from '../InvestorStrip';
import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import { ArrowRight, ConductorMark, PhoneMark, SearchMark } from './marks';
import { WireStory } from './WireStory';
import s from './home-7.module.css';

function Accent({ children }: { children: ReactNode }) {
  return (
    <span className={s.accent}>
      {children}
      <ScribbleUnderline />
    </span>
  );
}

function SectionHead({ id, eyebrow, title, lede }: { id: string; eyebrow: string; title: ReactNode; lede?: ReactNode }) {
  return (
    <header className={s.sectionHead}>
      <span className={s.eyebrow}>{eyebrow}</span>
      <h2 id={id} className={s.h2}>
        {title}
      </h2>
      {lede ? <p className={s.lede}>{lede}</p> : null}
    </header>
  );
}

/* ── Works with ───────────────────────────────────────────────────────── */

const AGENT_GROUPS: { title: string; note: string; items: { label: string; icon: ReactNode }[] }[] = [
  {
    title: 'Terminal',
    note: 'CLI agents',
    items: [
      { label: 'Claude Code', icon: <ClaudeCodeColor size={20} /> },
      { label: 'Codex', icon: <Codex size={20} /> },
      { label: 'Gemini', icon: <AgentToolLogo provider="gemini" className={s.toolLogo} idPrefix="h7-gemini" /> },
      { label: 'OpenCode', icon: <OpenCode size={20} /> },
    ],
  },
  {
    title: 'Apps',
    note: 'GUI agents',
    items: [
      { label: 'Conductor', icon: <ConductorMark size={16} /> },
      { label: 'Claude desktop', icon: <AgentToolLogo provider="claude" className={s.toolLogo} idPrefix="h7-claude" /> },
      { label: 'Codex app', icon: <Codex size={20} /> },
      { label: 'Cursor', icon: <Cursor size={20} /> },
    ],
  },
  {
    title: 'Phone',
    note: 'On the go',
    items: [{ label: 'Phone agents', icon: <PhoneMark size={20} /> }],
  },
];

function WorksWith() {
  return (
    <section className={s.section} aria-labelledby="works-title">
      <SectionHead
        id="works-title"
        eyebrow="Any agent"
        title="Works with the agents you already run."
        lede="One desktop app on your Mac. No code change to your agents. Mix tools across one team: your Claude Code talks to their Codex."
      />
      <div className={s.groups}>
        {AGENT_GROUPS.map((group) => (
          <div className={s.group} key={group.title}>
            <div className={s.groupHead}>
              <span className={s.groupTitle}>{group.title}</span>
              <span className={s.groupNote}>{group.note}</span>
            </div>
            <ul className={s.groupList}>
              {group.items.map((item) => (
                <li className={s.tool} key={item.label}>
                  <span className={s.toolIcon}>{item.icon}</span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Shared sessions ──────────────────────────────────────────────────── */

function SessionSearch() {
  return (
    <div className={s.search} aria-hidden="true">
      <div className={s.searchBar}>
        <SearchMark />
        <span className={s.searchFn}>search_shared_sessions</span>
        <span className={s.searchArg}>“reconnect backoff”</span>
      </div>
      <div className={s.result}>
        <div className={s.resultHead}>
          <AgentToolLogo provider="codex" className={s.resultLogo} idPrefix="h7-result-codex" />
          <b>fix-reconnect-gap</b>
          <span className={s.resultMeta}>khaliq · Codex · yesterday</span>
        </div>
        <div className={s.chips}>
          <span className={s.chipIntent}>intent · close the 30s reconnect gap</span>
          <span className={s.chipConstraint}>constraint · retries cap at 8s</span>
        </div>
      </div>
      <div className={`${s.result} ${s.resultDim}`}>
        <div className={s.resultHead}>
          <Cursor size={14} />
          <b>ws-rate-limits</b>
          <span className={s.resultMeta}>khaliq · Cursor · 2h ago</span>
        </div>
        <div className={s.chips}>
          <span className={s.chipIntent}>intent · rate-limit /v1/ws</span>
          <span className={s.chipConstraint}>constraint · no SDK breaking change</span>
        </div>
      </div>
      <div className={s.searchBar}>
        <ArrowRight className={s.searchArrow} />
        <span className={s.searchFn}>get_shared_session_context</span>
        <span className={s.searchArg}>“fix-reconnect-gap”</span>
      </div>
    </div>
  );
}

function SharedSessions() {
  return (
    <section className={s.section} aria-labelledby="sessions-title">
      <div className={s.split}>
        <SectionHead
          id="sessions-title"
          eyebrow="Shared sessions"
          title="Your teammates’ sessions, searchable by your agent."
          lede={
            <>
              Sessions sync to the cloud, so teammates see each other’s work and agents search it with{' '}
              <code>search_shared_sessions</code> and <code>get_shared_session_context</code>. Agent Relay pulls out
              each session’s intents and constraints, so search finds the decision, not the noise.
            </>
          }
        />
        <SessionSearch />
      </div>
    </section>
  );
}

/* ── Three ways in ────────────────────────────────────────────────────── */

const WAYS: { title: string; body: string; code: ReactNode }[] = [
  {
    title: 'Desktop app',
    body: 'Runs on your Mac and wraps whatever agent you open. Terminal, app or phone — no code.',
    code: (
      <>
        <span className={s.cm}>$</span> open -a <span className={s.str}>&quot;Agent Relay&quot;</span>
      </>
    ),
  },
  {
    title: 'MCP server',
    body: 'Add the agent-relay server and your agent gets messaging and session search as tools.',
    code: (
      <>
        <span className={s.kw}>mcp</span> agent-relay
        <br />
        <span className={s.cm}>  send_message · search_shared_sessions</span>
      </>
    ),
  },
  {
    title: 'SDK',
    body: 'One call to reach any agent on the team, from your own code.',
    code: (
      <>
        agent.<span className={s.fn}>sendMessage</span>({'{'} to: <span className={s.str}>&apos;khaliq/codex&apos;</span>, text {'}'})
      </>
    ),
  },
];

function WaysIn() {
  return (
    <section className={s.section} aria-labelledby="ways-title">
      <SectionHead id="ways-title" eyebrow="Three ways in" title="Pick the one your agent already understands." />
      <div className={s.ways}>
        {WAYS.map((way) => (
          <div className={s.way} key={way.title}>
            <h3 className={s.wayTitle}>{way.title}</h3>
            <p className={s.wayBody}>{way.body}</p>
            <pre className={s.wayCode}>
              <code>{way.code}</code>
            </pre>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── For builders ─────────────────────────────────────────────────────── */

const BUILD: { title: string; body: string }[] = [
  { title: 'Durable workflows', body: 'Multi-step agent runs that pick up where they left off.' },
  { title: 'Shared filesystem', body: 'Agents on different machines read and write the same files.' },
  { title: 'SDKs', body: 'TypeScript, Python and Swift.' },
  { title: 'A2A', body: 'Speaks the Agent-to-Agent protocol, so other agent runtimes can join.' },
];

function Builders() {
  return (
    <section className={s.sectionTight} aria-labelledby="build-title">
      <div className={s.buildRow}>
        <h2 id="build-title" className={s.h3}>
          For builders
        </h2>
        <ul className={s.buildList}>
          {BUILD.map((item) => (
            <li className={s.buildItem} key={item.title}>
              <b>{item.title}</b>
              <span>{item.body}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export function HomeSeven() {
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
            Sign up
          </a>
        }
      />

      <main id="main" className={s.main}>
        <section className={s.hero} aria-labelledby="hero-title">
          <h1 id="hero-title" className={s.h1}>
            Your agents can <Accent>talk to each other.</Accent>
          </h1>
          <p className={s.sub}>
            Agent Relay connects Claude Code, Codex, Cursor and Conductor across machines and teammates. Stop forwarding
            context between terminals. Let them sort it out.
          </p>
          <div className={s.heroCtas}>
            <a className={s.ctaPrimary} href={SIGNUP_HREF}>
              Get started free
              <ArrowRight className={s.arrow} />
            </a>
            <a className={s.ctaGhost} href="#how">
              See it work
            </a>
          </div>
          <p className={s.heroNote}>macOS desktop app · works with any agent · free to start</p>
        </section>

        <section id="how" className={s.storySection} aria-labelledby="how-title">
          <h2 id="how-title" className={s.storyTitle}>
            Take yourself off the wire.
          </h2>
          <WireStory />
        </section>

        <div className={s.investors}>
          <InvestorStrip />
        </div>

        <WorksWith />
        <SharedSessions />
        <WaysIn />
        <Builders />

        <section className={s.final} aria-labelledby="final-title">
          <h2 id="final-title" className={s.finalTitle}>
            Get out of the middle.
          </h2>
          <p className={s.finalLede}>Install the Mac app and your agents message each other today.</p>
          <a className={s.ctaPrimary} href={SIGNUP_HREF}>
            Get started free
            <ArrowRight className={s.arrow} />
          </a>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
