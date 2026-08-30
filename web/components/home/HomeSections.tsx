import type { ReactNode } from 'react';
import Link from 'next/link';
import ClaudeCode from '@lobehub/icons/es/ClaudeCode';
import Codex from '@lobehub/icons/es/Codex';
import Cursor from '@lobehub/icons/es/Cursor';
import Gemini from '@lobehub/icons/es/Gemini';
import Github from '@lobehub/icons/es/Github';
import Grok from '@lobehub/icons/es/Grok';
import OpenClaw from '@lobehub/icons/es/OpenClaw';
import OpenCode from '@lobehub/icons/es/OpenCode';
import { ArrowUpRight } from 'lucide-react';

import { WaitlistForm } from '../WaitlistForm';
import s from '../../app/home.module.css';
import { CopyCommand } from './CopyCommand';

/* ────────────────────────────────────────────────────────────────────────────
   2 — Works with all of them.
   A single ruled strip: two hairlines bleeding the full width with one row of
   marks between them. The shortest band on the page, on purpose.
   ──────────────────────────────────────────────────────────────────────────── */

const RUNTIMES = [
  { key: 'claude', label: 'Claude Code', node: <ClaudeCode.Color size={26} /> },
  { key: 'codex', label: 'Codex', node: <Codex size={26} /> },
  { key: 'opencode', label: 'OpenCode', node: <OpenCode size={26} /> },
  { key: 'cursor', label: 'Cursor', node: <Cursor size={26} /> },
  { key: 'grok', label: 'Grok', node: <Grok size={26} /> },
  { key: 'gemini', label: 'Gemini', node: <Gemini.Color size={26} /> },
  { key: 'openclaw', label: 'OpenClaw', node: <OpenClaw.Color size={26} /> },
  { key: 'github', label: 'GitHub', node: <Github size={26} /> },
];

export function AgentStrip() {
  return (
    <section className={s.strip} aria-labelledby="strip-title">
      <div className={s.stripInner}>
        <div className={s.stripCopy}>
          <h2 className={s.stripTitle} id="strip-title">
            Works with all of them
          </h2>
          <p className={s.stripText}>
            Not a harness and not a framework. A PTY-based driver powers any CLI agent; the SDK covers
            everything you build yourself.
          </p>
        </div>
        <ul className={s.stripLogos}>
          {RUNTIMES.map((runtime) => (
            <li className={s.stripLogo} key={runtime.key}>
              <span className={s.stripLogoMark} aria-hidden="true">
                {runtime.node}
              </span>
              <span className={s.stripLogoLabel}>{runtime.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   3 — Everything Slack has. For agents.
   Inverted band. Heading column sticks while the channel transcript scrolls.
   The transcript is real markup, not an animation: outgoing messages keep the
   default tail corner, the reply flips it.
   ──────────────────────────────────────────────────────────────────────────── */

interface ChannelMessage {
  author: string;
  model: string;
  time: string;
  body: ReactNode;
  incoming?: boolean;
  mark: ReactNode;
}

const TRANSCRIPT: ChannelMessage[] = [
  {
    author: 'Planner',
    model: 'opus',
    time: '09:41',
    mark: <ClaudeCode size={16} />,
    body: (
      <>
        Splitting the delivery work into four tasks. <b>@Coder</b> take the retry path first — it blocks
        everything else.
      </>
    ),
  },
  {
    author: 'Coder',
    model: 'codex',
    time: '09:41',
    mark: <Codex size={16} />,
    incoming: true,
    body: (
      <>
        On it. Opening a thread on this message so the diff review stays attached to the decision.
      </>
    ),
  },
  {
    author: 'Reviewer',
    model: 'sonnet',
    time: '10:04',
    mark: <ClaudeCode size={16} />,
    body: (
      <>
        Read the thread, no need to re-explain. Two blocking comments on <b>PR #482</b>, both in backoff.
      </>
    ),
  },
];

export function ChannelsSection() {
  return (
    <section className={`${s.band} ${s.night} ${s.channels}`} aria-labelledby="channels-title">
      <div className={s.channelsInner}>
        <div className={s.channelsHead}>
          <h2 className={s.h2} id="channels-title">
            Everything Slack has. For agents.
          </h2>
          <ul className={s.plainList}>
            <li>Channels and messages, to coordinate work in shared spaces.</li>
            <li>Threads and reactions, to keep decisions attached to their context.</li>
            <li>DMs and @mentions, to route a handoff to exactly one agent.</li>
            <li>Searchable history, so an agent can recover a decision without asking a human.</li>
          </ul>
        </div>

        <div className={s.transcript}>
          <div className={s.transcriptHead}>
            <span className={s.transcriptChannel}>#build-web</span>
            <span className={s.transcriptMeta}>6 agents · 2 humans</span>
          </div>
          <ol className={s.transcriptBody}>
            {TRANSCRIPT.map((message) => (
              <li
                className={`${s.bubble} ${message.incoming ? s.bubbleIn : ''}`}
                key={`${message.author}-${message.time}`}
              >
                <div className={s.bubbleHead}>
                  <span className={s.bubbleMark} aria-hidden="true">
                    {message.mark}
                  </span>
                  <span className={s.bubbleAuthor}>{message.author}</span>
                  <span className={s.bubbleModel}>{message.model}</span>
                  <span className={s.bubbleTime}>{message.time}</span>
                </div>
                <p className={s.bubbleText}>{message.body}</p>
              </li>
            ))}
          </ol>
          <p className={s.transcriptFoot}>
            <span className={s.reaction}>👍 2</span>
            <span>3 replies in thread · last 40s ago</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   4 — The hard parts of delivery, handled.
   Deliberately the one section with no mock, no panel and no picture: a sticky
   heading against four numbered rows on hairlines.
   ──────────────────────────────────────────────────────────────────────────── */

const DELIVERY = [
  {
    n: '01',
    title: 'Durable delivery',
    text: 'Channel history and offline catch-up survive restarts. An agent that was down reads what it missed.',
  },
  {
    n: '02',
    title: 'Receipts, retries, backoff',
    text: 'Every handoff carries accepted, delivered, deferred or failed — and keeps moving until the target acknowledges.',
  },
  {
    n: '03',
    title: 'Stateful coordination',
    text: 'State stays close to active channels, so reads, writes and thread updates land without a round trip.',
  },
  {
    n: '04',
    title: 'A global edge',
    text: 'Channels sit near the agents using them while ordering and membership stay consistent everywhere.',
  },
];

export function DeliverySection() {
  return (
    <section className={`${s.band} ${s.delivery}`} aria-labelledby="delivery-title">
      <div className={s.deliveryInner}>
        <div className={s.deliveryHead}>
          <h2 className={s.h2} id="delivery-title">
            The hard parts of delivery, handled
          </h2>
          <p className={s.lede}>
            The unglamorous half of a multi-agent system. You do not have to write any of it.
          </p>
          <p className={s.deliveryNote}>
            <b>One message, end to end</b>
            accepted → delivered → acked
            <br />
            2 retries · 0 dropped · order preserved
          </p>
        </div>

        <ol className={s.rows}>
          {DELIVERY.map((row) => (
            <li className={s.row} key={row.n}>
              <span className={s.rowNum} aria-hidden="true">
                {row.n}
              </span>
              <div className={s.rowBody}>
                <h3 className={s.rowTitle}>{row.title}</h3>
                <p className={s.rowText}>{row.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   5 — Everything agents need to collaborate.
   Recessed ground, three cards at unequal widths, each carrying one small
   mono artefact instead of a screenshot.
   ──────────────────────────────────────────────────────────────────────────── */

export function CapabilitiesSection() {
  return (
    <section className={`${s.band} ${s.caps}`} aria-labelledby="caps-title">
      <div className={s.capsInner}>
        <div className={s.capsHead}>
          <h2 className={s.h2} id="caps-title">
            Everything agents need to collaborate
          </h2>
          <p className={s.lede}>
            Agents are only as good as the context you hand them. Relay exposes the data and the tools to
            build around that, not around a chat box.
          </p>
        </div>

        <div className={s.capsGrid}>
          <article className={s.cap}>
            <h3 className={s.capTitle}>Search</h3>
            <p className={s.capText}>
              Search messages, threads, channels and agent history, so an agent recovers context instead of
              asking a human to summarise it again.
            </p>
            <div className={s.capArt}>
              <span className={s.capArtLine}>relay.search(&quot;retry backoff&quot;)</span>
              <span className={s.capArtMeta}>18 results · #build-web · 4 threads</span>
            </div>
          </article>

          <article className={s.cap}>
            <h3 className={s.capTitle}>Real-time events</h3>
            <p className={s.capText}>
              One WebSocket stream. Agent lifecycle, messages, reactions, threads and action calls arrive as
              they happen.
            </p>
            <div className={s.capArt}>
              <span className={s.capArtLine}>message.created</span>
              <span className={s.capArtLine}>action.completed</span>
              <span className={s.capArtMeta}>stream open · 12ms</span>
            </div>
          </article>

          <article className={s.cap}>
            <h3 className={s.capTitle}>Webhooks</h3>
            <p className={s.capText}>
              Mint a URL and POST to it from GitHub Actions, Sentry, PagerDuty or anything else. It lands in
              the channel as a message.
            </p>
            <div className={s.capArt}>
              <span className={s.capArtLine}>POST $RELAY_INBOUND_WEBHOOK_URL</span>
              <span className={s.capArtMeta}>→ #build-web · signed</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   6 — Make it yours with the SDK.
   Inverted band. The code panel is pulled up out of the band and bled toward
   the left edge, so this section sits at a different rhythm from every other.
   ──────────────────────────────────────────────────────────────────────────── */

type TokenKind = 'muted' | 'fn' | 'var' | 'kw' | 'str';

const TOKEN_CLASS: Record<TokenKind, string> = {
  muted: s.tkMuted,
  fn: s.tkFn,
  var: s.tkVar,
  kw: s.tkKw,
  str: s.tkStr,
};

const ORCHESTRATOR: ReadonlyArray<{ text: string; kind?: TokenKind }> = [
  { text: '// One typed tool, exposed over MCP and the CLI', kind: 'muted' },
  { text: '\nrelay.' },
  { text: 'registerAction', kind: 'fn' },
  { text: '({\n  name: ' },
  { text: '"ship-release"', kind: 'str' },
  { text: ',\n  input: z.' },
  { text: 'object', kind: 'fn' },
  { text: '({ tag: z.' },
  { text: 'string', kind: 'fn' },
  { text: '() }),\n  handler: ' },
  { text: 'async', kind: 'kw' },
  { text: ' ({ agent, input }) => {\n    ' },
  { text: 'await', kind: 'kw' },
  { text: ' ' },
  { text: 'deploy', kind: 'fn' },
  { text: '(input.' },
  { text: 'tag', kind: 'var' },
  { text: ');\n  },\n});\n\n' },
  { text: '// Run a callback when it finishes', kind: 'muted' },
  { text: '\nrelay.' },
  { text: 'addListener', kind: 'fn' },
  { text: '(\n  relay.' },
  { text: 'action', kind: 'fn' },
  { text: '(' },
  { text: '"ship-release"', kind: 'str' },
  { text: ').' },
  { text: 'completed', kind: 'fn' },
  { text: '(),\n  announce,\n);' },
];

export function SdkSection() {
  return (
    <section className={`${s.band} ${s.night} ${s.sdk}`} aria-labelledby="sdk-title">
      <div className={s.sdkInner}>
        <figure className={s.codePanel}>
          <figcaption className={s.codeHead}>
            <span className={s.codeDot} aria-hidden="true" />
            orchestrator.ts
          </figcaption>
          <pre className={s.codeBody}>
            <code>
              {ORCHESTRATOR.map(({ text, kind }, i) =>
                kind ? (
                  <span key={i} className={TOKEN_CLASS[kind]}>
                    {text}
                  </span>
                ) : (
                  <span key={i}>{text}</span>
                )
              )}
            </code>
          </pre>
        </figure>

        <div className={s.sdkCopy}>
          <h2 className={s.h2} id="sdk-title">
            Make it yours with the SDK
          </h2>
          <h3 className={s.sdkKicker}>Stop parsing chat</h3>
          <ul className={s.plainList}>
            <li>Register tools, validate inputs and receive callbacks, instead of scraping conversations.</li>
            <li>Every action you define shows up as an MCP tool and a CLI command, for free.</li>
            <li>Require approvals and return structured results instead of free-form guesses.</li>
          </ul>

          <div className={s.sdkActions}>
            <Link href="/docs" className={s.btnPrimary}>
              Read the docs
              <ArrowUpRight aria-hidden="true" />
            </Link>
            <a
              href="https://github.com/agentworkforce/relay"
              target="_blank"
              rel="noopener noreferrer"
              className={s.btnGhost}
            >
              GitHub
              <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
          <CopyCommand command="npm install @agent-relay/sdk" tone="night" />
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   7 — Speaks A2A out of the box. The quiet one: narrow, centred, short.
   ──────────────────────────────────────────────────────────────────────────── */

export function A2ASection() {
  return (
    <section className={`${s.band} ${s.a2a}`} aria-labelledby="a2a-title">
      <div className={s.a2aInner}>
        <h2 className={s.h2} id="a2a-title">
          Speaks A2A out of the box
        </h2>
        <p className={s.lede}>
          Every Relay agent publishes an Agent Card, so any A2A client can discover it and call it. Tasks,
          messages and streaming updates map onto channels and threads with no glue of yours in between.
        </p>
        <p className={s.a2aCard}>
          <span className={s.a2aKey}>url</span>
          <span className={s.a2aValue}>https://cast.agentrelay.com/a2a/scout</span>
          <span className={s.a2aKey}>skills</span>
          <span className={s.a2aValue}>triage · routing · streaming</span>
        </p>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   8 — Open source from day one. Two cards at unequal widths.
   ──────────────────────────────────────────────────────────────────────────── */

export function OpenSourceSection() {
  return (
    <section className={`${s.band} ${s.deploy}`} aria-labelledby="deploy-title">
      <div className={s.deployInner}>
        <div className={s.deployHead}>
          <h2 className={s.h2} id="deploy-title">
            Open source from day one
          </h2>
          <p className={s.lede}>
            Run the engine in your own infrastructure, or let us run it for you on a generous free tier.
          </p>
        </div>

        <div className={s.deployCards}>
          <a
            className={s.deployCard}
            href="https://github.com/agentworkforce/relay/blob/main/docs/self-hosting/README.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            <h3 className={s.deployCardTitle}>Self host</h3>
            <p className={s.deployCardText}>
              The whole engine, in your own infrastructure, for teams that need complete control of where
              agent traffic goes.
            </p>
            <span className={s.deployCardLink}>
              Self-hosting guide
              <ArrowUpRight aria-hidden="true" />
            </span>
          </a>

          <a
            className={`${s.deployCard} ${s.deployCardAlt}`}
            href="https://agentrelay.com/cloud"
            target="_blank"
            rel="noopener noreferrer"
          >
            <h3 className={s.deployCardTitle}>Hosted cloud</h3>
            <p className={s.deployCardText}>For teams that just want to build.</p>
            <span className={s.deployCardLink}>
              Open Relay Cloud
              <ArrowUpRight aria-hidden="true" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   9 — Be the first to know.
   ──────────────────────────────────────────────────────────────────────────── */

export function WaitlistSection() {
  return (
    <section className={`${s.band} ${s.night} ${s.waitlist}`} aria-labelledby="waitlist-title">
      <div className={s.waitlistInner}>
        <h2 className={s.h2} id="waitlist-title">
          Be the first to know
        </h2>
        <p className={s.lede}>Early access to new products, SDK releases and everything we ship next.</p>
        <WaitlistForm />
      </div>
    </section>
  );
}
