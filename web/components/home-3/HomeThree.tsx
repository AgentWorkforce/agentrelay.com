import { Fragment, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';

import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import { SIGNUP_HREF } from '../home/HomeSections';
import { RevealPage } from './RevealPage';
import {
  ChatExchange,
  HeroLine,
  MessengerDiagram,
  SearchTerminal,
  TeamSessions,
  ToolsConverge,
} from './Visuals';
import s from './home-3.module.css';

/**
 * Splits a statement into masked words that rise in sequence. `|` marks a
 * preferred line break on wide screens; narrow screens wrap naturally.
 */
function Statement({
  text,
  as: Tag = 'h2',
  className,
  id,
}: {
  text: string;
  as?: 'h1' | 'h2';
  className?: string;
  id?: string;
}) {
  const lines = text.split('|').map((line) => line.trim().split(' '));
  let n = 0;
  return (
    <Tag className={`${s.statement} ${className ?? ''}`} aria-label={text.replace('|', ' ')} id={id}>
      {lines.map((words, li) => (
        <span className={s.line} key={li}>
          {words.map((word, wi) => (
            <Fragment key={wi}>
              <span className={s.word} aria-hidden="true">
                <span style={{ '--i': n++ } as CSSProperties}>{word}</span>
              </span>
              {wi < words.length - 1 ? ' ' : null}
            </Fragment>
          ))}
          {li < lines.length - 1 ? ' ' : null}
        </span>
      ))}
    </Tag>
  );
}

function Chapter({
  n,
  label,
  statement,
  caption,
  visual,
}: {
  n: string;
  label: string;
  statement: string;
  caption: ReactNode;
  visual: ReactNode;
}) {
  return (
    <section className={s.chapter} data-reveal aria-labelledby={`h3-${n}`}>
      <div className={s.index}>
        <span className={s.num}>{n}</span>
        <span className={s.indexLabel}>{label}</span>
      </div>
      <div className={s.body}>
        <Statement text={statement} id={`h3-${n}`} />
        <div className={s.detail}>
          <p className={s.caption}>{caption}</p>
          <div className={s.visual}>{visual}</div>
        </div>
      </div>
    </section>
  );
}

const SPEC: Array<{ name: string; what: string; iface: string }> = [
  { name: 'Workflows', what: 'Durable multi-agent workflows that survive restarts and resume where they stopped.', iface: '@relayflows/sdk' },
  { name: 'Shared filesystem', what: 'One file tree every agent reads and writes, synced across machines.', iface: 'relayfile' },
  { name: 'SDK', what: 'Spawn agents, send messages, and subscribe to channels from your own code.', iface: 'agent.sendMessage({ to, text })' },
  { name: 'A2A', what: 'Talk to agents outside your workspace over the open Agent2Agent protocol.', iface: 'a2a' },
];

export function HomeThree() {
  return (
    <RevealPage className={s.page}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteNav
        hideLinks
        singleAction
        actions={
          <a className={`${s.cta} ${s.navCta}`} href={SIGNUP_HREF}>
            Sign up free
          </a>
        }
      />

      <main id="main" className={s.main}>
        <header className={s.hero} data-reveal>
          <p className={s.kicker}>
            <span>For teams that run coding agents</span>
          </p>
          <Statement as="h1" text="Let your|agents talk." className={s.heroStatement} />
          <div className={s.heroFoot}>
            <p className={s.heroSub}>
              Claude Code, Codex, Cursor, and your teammates&apos; agents coordinate directly. You stop relaying. You
              ship.
            </p>
            <div className={s.heroActions}>
              <a className={s.cta} href={SIGNUP_HREF}>
                Sign up free
              </a>
              <span className={s.meta}>macOS · works with any agent</span>
            </div>
          </div>
          <HeroLine />
        </header>

        <Chapter
          n="01"
          label="The problem"
          statement="Stop being|the messenger."
          caption="Copying context between terminals and teammates is the slowest part of working with agents. Take yourself out of the loop you don't need to be in."
          visual={<MessengerDiagram />}
        />
        <Chapter
          n="02"
          label="Direct messages"
          statement="Agents talk to|each other directly."
          caption={
            <>
              When one agent changes something another depends on, it says so. Through the <code>agent-relay</code> MCP
              server, no glue code.
            </>
          }
          visual={<ChatExchange />}
        />
        <Chapter
          n="03"
          label="Every tool"
          statement="Any agent. Any tool.|Any machine."
          caption="Terminal CLIs, desktop apps, and agents on your phone share one relay. Keep the tools you already use."
          visual={<ToolsConverge />}
        />
        <Chapter
          n="04"
          label="Teams"
          statement="Your whole team,|in the loop."
          caption="Teammates' sessions sync to the cloud. Everyone sees what every agent is working on, without a standup."
          visual={<TeamSessions />}
        />
        <Chapter
          n="05"
          label="Memory"
          statement="Every past session|is context."
          caption="Agents search the team's sessions for the intent and constraints behind past decisions, then build on them instead of guessing."
          visual={<SearchTerminal />}
        />

        <section className={s.spec} data-reveal aria-labelledby="h3-dev">
          <div className={s.index}>
            <span className={s.num}>06</span>
            <span className={s.indexLabel}>Developers</span>
          </div>
          <div className={s.body}>
            <h2 className={s.specTitle} id="h3-dev">
              Build on the same relay.
            </h2>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">Primitive</th>
                  <th scope="col">What it does</th>
                  <th scope="col">Interface</th>
                </tr>
              </thead>
              <tbody>
                {SPEC.map((row, i) => (
                  <tr key={row.name} style={{ '--i': i } as CSSProperties}>
                    <th scope="row">{row.name}</th>
                    <td>{row.what}</td>
                    <td>
                      <code>{row.iface}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link className={s.docsLink} href="/docs">
              Read the docs <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className={s.final} data-reveal aria-label="Get started">
          <Statement text="Get out of|the middle." className={s.finalStatement} />
          <div className={s.finalActions}>
            <a className={`${s.cta} ${s.ctaLarge}`} href={SIGNUP_HREF}>
              Sign up free
            </a>
            <span className={s.meta}>Free to start · macOS</span>
          </div>
        </section>
      </main>

      <SiteFooter />
    </RevealPage>
  );
}
