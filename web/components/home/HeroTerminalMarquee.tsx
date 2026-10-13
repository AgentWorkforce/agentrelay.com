import Image from 'next/image';
import type { CSSProperties } from 'react';

import { AgentToolLogo, type AgentTool } from '../AgentToolLogos';
import { Grok } from '../brand-icons';
import { APP_META, HeroAppWindow, type AppWindowCard } from './HeroAppWindow';
import s from '../../app/landing.module.css';

type TerminalAgent = Extract<AgentTool, 'claude' | 'codex' | 'opencode'> | 'grok' | 'hermes';

type LineTone = 'prompt' | 'tool' | 'ok' | 'relay';

type TerminalLine = {
  tone: LineTone;
  text: string;
};

export type TerminalCard = {
  /** Which agent's terminal this is; drives the name and mark in the title bar. */
  agent: TerminalAgent;
  /** Repository context shown inside the terminal session. */
  repo: string;
  /** Three or four lines: a prompt, what the agent did, where it went. */
  lines: TerminalLine[];
  /** Card width step. The rows read as sessions, not as a grid, so widths vary. */
  size: 'sm' | 'md' | 'lg';
};

export type TerminalStyle = CSSProperties & {
  '--line-delay'?: string;
  '--term-cycle'?: string;
  '--term-phase'?: string;
};

type RelayRoute = {
  d: string;
  delay: string;
  duration: string;
  id: string;
  origin: { x: number; y: number };
  target: { x: number; y: number };
};

export const AGENT_META: Record<
  TerminalAgent,
  {
    activityGlyph: string;
    branchPrefix: string;
    cycle: string;
    label: string;
    mode: string;
    prompt: string;
    session: string;
    state: string;
  }
> = {
  claude: {
    activityGlyph: '✻',
    branchPrefix: 'claude',
    cycle: '7.8s',
    label: 'Claude Code',
    mode: 'trusted',
    prompt: '❯',
    session: 'Claude Max',
    state: 'Thinking',
  },
  codex: {
    activityGlyph: '◌',
    branchPrefix: 'codex',
    cycle: '7.2s',
    label: 'OpenAI Codex',
    mode: 'workspace-write',
    prompt: '›',
    session: 'Codex session',
    state: 'Running',
  },
  grok: {
    activityGlyph: '◆',
    branchPrefix: 'grok',
    cycle: '7.5s',
    label: 'Grok',
    mode: 'auto',
    prompt: '>',
    session: 'Grok Code',
    state: 'Working',
  },
  hermes: {
    activityGlyph: '⚕',
    branchPrefix: 'hermes',
    cycle: '7.6s',
    label: 'Hermes Agent',
    mode: 'local',
    prompt: '❯',
    session: 'Hermes Agent',
    state: 'Thinking',
  },
  opencode: {
    activityGlyph: '▣',
    branchPrefix: 'opencode',
    cycle: '6.9s',
    label: 'OpenCode',
    mode: 'build',
    prompt: '>',
    session: 'OpenCode build',
    state: 'Editing',
  },
};

const TONE_CLASS: Record<LineTone, string> = {
  prompt: s.heroTermPrompt,
  tool: s.heroTermTool,
  ok: s.heroTermOk,
  relay: s.heroTermRelay,
};

const LINE_MARKER: Record<LineTone, string> = {
  prompt: '❯',
  tool: '└',
  ok: '✓',
  relay: '↗',
};

function terminalLineCopy(line: TerminalLine) {
  if (line.tone === 'prompt') {
    return line.text.match(/^\$ \S+ "(.+)"$/)?.[1] ?? line.text.replace(/^\$ /, '');
  }

  return line.text.replace(/^(?:⎿|✓|↑|→)\s*/, '');
}

const RELAY_ROUTES: RelayRoute[] = [
  {
    id: 'hero-relay-route-one',
    d: 'M 318 62 C 410 62 438 202 552 202',
    duration: '10.6s',
    delay: '-1.4s',
    origin: { x: 318, y: 62 },
    target: { x: 552, y: 202 },
  },
  {
    id: 'hero-relay-route-two',
    d: 'M 654 202 C 758 202 782 344 904 344',
    duration: '12.2s',
    delay: '-6.8s',
    origin: { x: 654, y: 202 },
    target: { x: 904, y: 344 },
  },
  {
    id: 'hero-relay-route-three',
    d: 'M 956 344 C 1078 344 1080 62 1206 62',
    duration: '11.3s',
    delay: '-4.1s',
    origin: { x: 956, y: 344 },
    target: { x: 1206, y: 62 },
  },
  {
    id: 'hero-relay-route-four',
    d: 'M 1184 62 C 1088 62 1030 202 872 202',
    duration: '13.1s',
    delay: '-9.3s',
    origin: { x: 1184, y: 62 },
    target: { x: 872, y: 202 },
  },
  {
    id: 'hero-relay-route-five',
    d: 'M 338 344 C 450 344 476 62 624 62',
    duration: '11.8s',
    delay: '-11.1s',
    origin: { x: 338, y: 344 },
    target: { x: 624, y: 62 },
  },
];

/**
 * Three rows of Claude Code, Codex, Grok, OpenCode and Hermes terminal
 * sessions, with Conductor, Claude, Codex, Devin and Paseo desktop app windows
 * mixed into the band. Each title bar
 * names the agent, while repository and activity context stay in the terminal.
 * The animated lines show the prompt, what the tool did, and where the result
 * went, which for Agent Relay means a channel, a DM or a PR.
 *
 * The cards are illustrative chrome, so the whole band is aria-hidden and holds
 * nothing focusable; the hero's real content is the column above it.
 */
export const ROW_ONE: TerminalCard[] = [
  {
    agent: 'claude',
    repo: 'agentrelay/web',
    size: 'md',
    lines: [
      { tone: 'prompt', text: '$ claude "fix the flaky retry test"' },
      { tone: 'tool', text: '⎿ ran 26 tests - 26 passed' },
      { tone: 'relay', text: '↑ pushed fix-retry → PR #482' },
    ],
  },
  {
    agent: 'codex',
    repo: 'relay/router',
    size: 'lg',
    lines: [
      { tone: 'prompt', text: '$ codex "trace the dropped socket"' },
      { tone: 'tool', text: '⎿ found reconnect gap at 30s' },
      { tone: 'relay', text: '→ relayed to #build-router' },
    ],
  },
  {
    agent: 'opencode',
    repo: 'relay/sdk',
    size: 'sm',
    lines: [
      { tone: 'prompt', text: '$ opencode "threads for py sdk"' },
      { tone: 'tool', text: '⎿ wrote sdk/python/threads.py' },
      { tone: 'ok', text: '✓ typecheck clean' },
    ],
  },
  {
    agent: 'grok',
    repo: 'relay/docs',
    size: 'md',
    lines: [
      { tone: 'prompt', text: '$ grok "refresh the quickstart"' },
      { tone: 'tool', text: '⎿ edited docs/quickstart.mdx' },
      { tone: 'relay', text: '→ DM to Reviewer: ready for a pass' },
    ],
  },
  {
    agent: 'claude',
    repo: 'relay/tests',
    size: 'sm',
    lines: [
      { tone: 'prompt', text: '$ claude "unflake the ws suite"' },
      { tone: 'tool', text: '⎿ retried 3× - stable' },
      { tone: 'relay', text: '→ note left in #build-router' },
    ],
  },
];

export const ROW_TWO: TerminalCard[] = [
  {
    agent: 'grok',
    repo: 'relay/web',
    size: 'lg',
    lines: [
      { tone: 'prompt', text: '$ grok "port nav to the new tokens"' },
      { tone: 'tool', text: '⎿ 4 files changed, 61 insertions' },
      { tone: 'relay', text: '↑ opened PR #491 · asked Reviewer' },
    ],
  },
  {
    agent: 'claude',
    repo: 'relay/api',
    size: 'sm',
    lines: [
      { tone: 'tool', text: '⎿ relay.send_message(#build-web)' },
      { tone: 'tool', text: '⎿ Reviewer joined the thread' },
      { tone: 'ok', text: '✓ handoff acked in 1.2s' },
    ],
  },
  {
    agent: 'codex',
    repo: 'relay/billing',
    size: 'md',
    lines: [
      { tone: 'prompt', text: '$ codex "add the usage export"' },
      { tone: 'tool', text: '⎿ ran migration 0042' },
      { tone: 'ok', text: '✓ backfilled 1,204 rows' },
    ],
  },
  {
    agent: 'opencode',
    repo: 'relay/cli',
    size: 'md',
    lines: [
      { tone: 'prompt', text: '$ opencode "make relay login retry"' },
      { tone: 'tool', text: '⎿ patched cli/auth.ts' },
      { tone: 'relay', text: '→ posted the diff in #build-cli' },
    ],
  },
];

export const ROW_THREE: TerminalCard[] = [
  {
    agent: 'grok',
    repo: 'relay/search',
    size: 'md',
    lines: [
      { tone: 'prompt', text: '$ grok "index the thread history"' },
      { tone: 'tool', text: '⎿ reindexed 84,102 messages' },
      { tone: 'relay', text: '→ summary in #build-search' },
    ],
  },
  {
    agent: 'claude',
    repo: 'relay/infra',
    size: 'sm',
    lines: [
      { tone: 'tool', text: '⎿ waiting on Planner in #ship-it' },
      { tone: 'relay', text: '→ Planner: "go after the freeze"' },
      { tone: 'ok', text: '✓ resumed after 41m idle' },
    ],
  },
  {
    agent: 'claude',
    repo: 'agentrelay/web',
    size: 'lg',
    lines: [
      { tone: 'prompt', text: '$ claude "review PR #482"' },
      { tone: 'tool', text: '⎿ read 6 files · left 3 notes' },
      { tone: 'relay', text: '→ DM to Coder: one nit, then merge' },
    ],
  },
  {
    agent: 'codex',
    repo: 'relay/router',
    size: 'md',
    lines: [
      { tone: 'tool', text: '⎿ picked up task from #build-router' },
      { tone: 'prompt', text: '$ codex "add backpressure to fanout"' },
      { tone: 'ok', text: '✓ p99 480ms → 120ms' },
    ],
  },
  {
    agent: 'opencode',
    repo: 'relay/web',
    size: 'lg',
    lines: [
      { tone: 'prompt', text: '$ opencode "wire up the pricing table"' },
      { tone: 'tool', text: '⎿ 2 components, 1 story' },
      { tone: 'relay', text: '↑ PR #494 → handed to Reviewer' },
    ],
  },
];

const APP_CONDUCTOR: AppWindowCard = {
  kind: 'app',
  app: 'conductor',
  repo: 'relay/router',
  title: 'Fix reconnect gap',
  ask: 'Close the 30s reconnect gap Codex found',
  reply: 'Retry now backs off from 250ms and resumes the cursor.',
  relay: '#build-router · Reviewer approved',
  sessions: ['fix-reconnect-gap', 'usage-export', 'pricing-table'],
};

const APP_CLAUDE: AppWindowCard = {
  kind: 'app',
  app: 'claude',
  repo: 'relay/billing',
  title: 'Double-charge in checkout',
  ask: 'Customers see duplicate charges. Find and fix it?',
  reply: 'Two POST /charges fire before the first lands. Adding an idempotency key.',
  relay: 'DM to Coder: ship it with the backfill',
  sessions: ['Double-charge in checkout', 'Weekly dependency audit', 'Tests for payments'],
};

const APP_CODEX: AppWindowCard = {
  kind: 'app',
  app: 'codex',
  repo: 'relay/sdk',
  title: 'Swift threads',
  ask: 'Port py threads to the Swift SDK',
  reply: 'Added Thread.reply and streaming. Parity with py and ts.',
  relay: 'Posted to #sdk-parity · 3 agents acked',
  sessions: ['Swift threads', 'Pull latest main', 'Fix corner radii', 'Accessibility pass'],
};

const APP_CODEX_TESTS: AppWindowCard = {
  kind: 'app',
  app: 'codex',
  repo: 'relay/tests',
  title: 'Unflake the ws suite',
  ask: 'The ws suite flakes on CI. Make it stable?',
  reply: 'Awaited the socket close before teardown. 50 runs, 0 failures.',
  relay: 'Note left in #build-router',
  sessions: ['Unflake the ws suite', 'Bump the engine', 'Retry budget', 'Docs links'],
};

const HERMES_GATEWAY: TerminalCard = {
  agent: 'hermes',
  repo: 'relay/gateway',
  size: 'md',
  lines: [
    { tone: 'prompt', text: '$ hermes "rotate the webhook secrets"' },
    { tone: 'tool', text: '⎿ terminal: wrangler secret put · 1.8s' },
    { tone: 'relay', text: '→ posted rollout plan in #ops' },
  ],
};

const APP_DEVIN: AppWindowCard = {
  kind: 'app',
  app: 'devin',
  repo: 'relay/auth',
  title: 'Add enterprise SSO',
  ask: 'Add SAML SSO for enterprise workspaces',
  reply: 'SSO is wired into org settings. Tested sign-in end to end.',
  relay: 'PR #503 open · asked Reviewer in #build-auth',
  sessions: ['Add enterprise SSO', 'Multi-region failover', 'Upgrade Node', 'API latency spike'],
};

const APP_PASEO: AppWindowCard = {
  kind: 'app',
  app: 'paseo',
  repo: 'relay/web',
  title: 'Docs search',
  ask: 'Add search to the docs sidebar',
  reply: 'Search indexes every page at build time. Cmd-K opens it.',
  relay: 'Handed to Claude Code for review via #build-web',
  sessions: ['Docs search', 'Page titles', 'Commit safe area', 'Editor typing lag'],
};

type MarqueeCard = TerminalCard | AppWindowCard;

const APP_CONDUCTOR_PRICING: AppWindowCard = {
  kind: 'app',
  app: 'conductor',
  repo: 'relay/web',
  title: 'Pricing table',
  ask: 'Wire the pricing table to the plans API',
  reply: 'Plans load from the API and fall back to cached prices.',
  relay: '#build-web · handed to Reviewer',
  sessions: ['pricing-table', 'nav-tokens', 'docs-search'],
};

const APP_CLAUDE_AUDIT: AppWindowCard = {
  kind: 'app',
  app: 'claude',
  repo: 'relay/infra',
  title: 'Weekly dependency audit',
  ask: 'Run the weekly dependency audit',
  reply: 'Two advisories, both patch bumps. Opened one PR for both.',
  relay: 'Waiting on Planner in #ship-it',
  sessions: ['Weekly dependency audit', 'Rotate staging keys', 'Cron drift'],
};

const APP_DEVIN_FAILOVER: AppWindowCard = {
  kind: 'app',
  app: 'devin',
  repo: 'relay/api',
  title: 'Multi-region failover',
  ask: 'Fail over to the EU region when US is down',
  reply: 'Health checks flip traffic in under 20s. Drill passed.',
  relay: 'DM to Hermes: update the runbook',
  sessions: ['Multi-region failover', 'Add enterprise SSO', 'API latency spike'],
};

/**
 * Each row alternates terminal and app, three of each, so the alternation
 * holds across the loop seam and no two neighbours are the same tool.
 */
const MARQUEE_ROW_ONE: MarqueeCard[] = [
  ROW_ONE[0],
  APP_CONDUCTOR,
  ROW_ONE[1],
  APP_PASEO,
  ROW_ONE[2],
  APP_DEVIN,
];

const MARQUEE_ROW_TWO: MarqueeCard[] = [
  ROW_TWO[0],
  APP_CLAUDE,
  ROW_TWO[2],
  APP_DEVIN_FAILOVER,
  ROW_TWO[3],
  APP_CODEX_TESTS,
];

const MARQUEE_ROW_THREE: MarqueeCard[] = [
  ROW_THREE[0],
  APP_CODEX,
  ROW_THREE[2],
  APP_CONDUCTOR_PRICING,
  HERMES_GATEWAY,
  APP_CLAUDE_AUDIT,
];

const SIZE_CLASS = {
  sm: s.heroTermSm,
  md: s.heroTermMd,
  lg: s.heroTermLg,
} as const;

function TerminalAgentLogo({ agent, idPrefix }: { agent: TerminalAgent; idPrefix: string }) {
  if (agent === 'grok') return <Grok className={s.heroTermMark} />;
  if (agent === 'hermes') return <span className={s.heroHermesMark}>⚕</span>;

  return <AgentToolLogo className={s.heroTermMark} idPrefix={idPrefix} provider={agent} />;
}

function RelayNetwork() {
  return (
    <svg
      className={s.heroRelayNetwork}
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 1280 410"
    >
      {RELAY_ROUTES.map((route) => (
        <g key={route.id}>
          <path className={s.heroRelayRoute} d={route.d} id={route.id} />
          <circle
            className={s.heroRelayOrigin}
            cx={route.origin.x}
            cy={route.origin.y}
            opacity="0"
            r="7"
          >
            <animate
              attributeName="opacity"
              begin={route.delay}
              dur={route.duration}
              keyTimes="0;0.14;0.16;0.2;1"
              repeatCount="indefinite"
              values="0;0;0.68;0;0"
            />
          </circle>
          <g className={s.heroRelayPacket} opacity="0">
            <path className={s.heroRelayPacketTail} d="M -19 0 H -5" />
            <circle className={s.heroRelayPacketHalo} r="7" />
            <circle className={s.heroRelayPacketCore} r="3.1" />
            <animateMotion
              begin={route.delay}
              calcMode="linear"
              dur={route.duration}
              keyPoints="0;0;1;1"
              keyTimes="0;0.16;0.42;1"
              repeatCount="indefinite"
              rotate="auto"
            >
              <mpath href={`#${route.id}`} />
            </animateMotion>
            <animate
              attributeName="opacity"
              begin={route.delay}
              dur={route.duration}
              keyTimes="0;0.15;0.17;0.39;0.42;1"
              repeatCount="indefinite"
              values="0;0;1;1;0;0"
            />
          </g>
          <circle
            className={s.heroRelayArrival}
            cx={route.target.x}
            cy={route.target.y}
            opacity="0"
            r="9"
          >
            <animate
              attributeName="opacity"
              begin={route.delay}
              dur={route.duration}
              keyTimes="0;0.4;0.42;0.48;1"
              repeatCount="indefinite"
              values="0;0;0.78;0;0"
            />
          </circle>
        </g>
      ))}
    </svg>
  );
}

function GrokTerminalBody({ card }: { card: TerminalCard }) {
  const meta = AGENT_META[card.agent];
  const prompt = card.lines.find((line) => line.tone === 'prompt') ?? card.lines[0];
  const activity = card.lines.find((line) => line.tone === 'tool') ?? card.lines[1];
  const result = card.lines.find((line) => line.tone === 'relay' || line.tone === 'ok');

  return (
    <div className={`${s.heroTermBody} ${s.heroGrokBody}`}>
      <div className={s.heroGrokContext}>
        <span className={s.heroGrokBranch}>⌁</span>
        <span className={s.heroGrokPath}>
          {meta.branchPrefix}/{card.repo.replace('/', '-')} ~/{card.repo}
        </span>
        <span className={s.heroGrokContextMode}>{meta.mode}</span>
      </div>
      <div
        className={`${s.heroGrokPrompt} ${s.heroGrokCycleLine}`}
        style={{ '--line-delay': '0s' } as TerminalStyle}
      >
        <span>❯</span>
        <span>{terminalLineCopy(prompt)}</span>
      </div>
      <div className={s.heroGrokEvents}>
        <span className={s.heroGrokCycleLine} style={{ '--line-delay': '0.5s' } as TerminalStyle}>
          ◆ user_prompt_submit
        </span>
        <span className={s.heroGrokCycleLine} style={{ '--line-delay': '0.9s' } as TerminalStyle}>
          ◆ Thought for 3.2s
        </span>
        <span
          className={`${s.heroGrokReply} ${s.heroGrokCycleLine}`}
          style={{ '--line-delay': '1.3s' } as TerminalStyle}
        >
          {terminalLineCopy(activity)}
        </span>
      </div>
      <div className={s.heroGrokFooter}>
        <span className={s.heroGrokProgress}>
          <span className={s.heroGrokProgressGlyph}>∴</span>
          Preparing tools (3)…
        </span>
        {result ? <span className={s.heroGrokResult}>{terminalLineCopy(result)}</span> : null}
      </div>
      <div className={s.heroGrokComposer}>
        <span className={s.heroTermPromptGlyph}>❯</span>
        <span className={s.heroTermCursor} />
        <span className={s.heroGrokModel}>Grok Code (high)</span>
      </div>
    </div>
  );
}

function HermesTerminalBody({ card }: { card: TerminalCard }) {
  const prompt = card.lines.find((line) => line.tone === 'prompt') ?? card.lines[0];
  const activity = card.lines.find((line) => line.tone === 'tool') ?? card.lines[1];
  const result = card.lines.find((line) => line.tone === 'relay' || line.tone === 'ok');

  return (
    <div className={`${s.heroTermBody} ${s.heroHermesBody}`}>
      <div className={s.heroHermesBanner}>
        <strong>⚕ HERMES AGENT</strong>
        <span>Hermes 4 · Nous Portal · ~/{card.repo}</span>
      </div>
      <div className={s.heroTermTranscript}>
        <span
          className={`${s.heroTermLine} ${s.heroTermPrompt}`}
          style={{ '--line-delay': '0s' } as TerminalStyle}
        >
          <span className={s.heroTermLineMarker}>❯</span>
          <span className={s.heroTermLineCopy}>{terminalLineCopy(prompt)}</span>
        </span>
        <span
          className={`${s.heroTermLine} ${s.heroHermesTool}`}
          style={{ '--line-delay': '0.58s' } as TerminalStyle}
        >
          <span className={s.heroTermLineMarker}>┊</span>
          <span className={s.heroTermLineCopy}>{terminalLineCopy(activity)}</span>
        </span>
        {result ? (
          <span
            className={`${s.heroTermLine} ${TONE_CLASS[result.tone]}`}
            style={{ '--line-delay': '1.16s' } as TerminalStyle}
          >
            <span className={s.heroTermLineMarker}>{LINE_MARKER[result.tone]}</span>
            <span className={s.heroTermLineCopy}>{terminalLineCopy(result)}</span>
          </span>
        ) : null}
      </div>
      <div className={s.heroTermComposer}>
        <span className={s.heroTermLivePrompt}>
          <span className={s.heroTermPromptGlyph}>❯</span>
          <span className={s.heroTermCursor} />
        </span>
        <span className={`${s.heroTermState} ${s.heroHermesState}`}>
          <span className={s.heroTermActivityGlyph}>⚕</span>
          pondering…
        </span>
      </div>
    </div>
  );
}

function OpenCodeLoader() {
  return (
    <span className={s.heroOpenCodeLoader}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((segment) => (
        <span className={s.heroOpenCodeLoaderDot} key={segment} />
      ))}
    </span>
  );
}

function OpenCodeTerminalBody({ card }: { card: TerminalCard }) {
  const prompt = card.lines.find((line) => line.tone === 'prompt') ?? card.lines[0];
  const activity = card.lines.find((line) => line.tone === 'tool') ?? card.lines[1];
  const result = card.lines.find((line) => line.tone === 'relay' || line.tone === 'ok');

  return (
    <div className={`${s.heroTermBody} ${s.heroOpenCodeBody}`}>
      <div
        className={`${s.heroOpenCodePrompt} ${s.heroOpenCodeCycleLine}`}
        style={{ '--line-delay': '0s' } as TerminalStyle}
      >
        {terminalLineCopy(prompt)}
      </div>
      <div className={s.heroOpenCodeActivity}>
        <span
          className={`${s.heroOpenCodeThought} ${s.heroOpenCodeCycleLine}`}
          style={{ '--line-delay': '0.42s' } as TerminalStyle}
        >
          + Thought: 683ms
        </span>
        <span
          className={s.heroOpenCodeCycleLine}
          style={{ '--line-delay': '0.84s' } as TerminalStyle}
        >
          * {terminalLineCopy(activity)}
        </span>
        <span
          className={`${s.heroOpenCodeResult} ${s.heroOpenCodeCycleLine}`}
          style={{ '--line-delay': '1.2s' } as TerminalStyle}
        >
          ~ {result ? terminalLineCopy(result) : 'Finding files…'}
        </span>
      </div>
      <div className={s.heroOpenCodeMode}>
        <span>▣</span>
        <strong>Build</strong>
        <span>OpenCode</span>
      </div>
      <div className={s.heroOpenCodeComposer}>
        <span className={s.heroTermCursor} />
        <span className={s.heroOpenCodeComposerMode}>Build</span>
        <span>OpenCode session</span>
      </div>
      <div className={s.heroOpenCodeLoaderRow}>
        <OpenCodeLoader />
        <span>esc interrupt</span>
        <span className={s.heroOpenCodeShortcut}>tab agents</span>
      </div>
    </div>
  );
}

function CodexTerminalBody({ card }: { card: TerminalCard }) {
  const prompt = card.lines.find((line) => line.tone === 'prompt') ?? card.lines[0];
  const activity = card.lines.find((line) => line.tone === 'tool') ?? card.lines[1];
  const result = card.lines.find((line) => line.tone === 'relay' || line.tone === 'ok');

  return (
    <div className={`${s.heroTermBody} ${s.heroCodexBody}`}>
      <div className={s.heroCodexScrollViewport}>
        <div className={s.heroCodexScrollTrack}>
          <div className={s.heroCodexScrollSequence}>
            <div className={s.heroCodexIdentity}>
              <strong className={s.heroCodexIdentityTitle}>
                <span>&gt;_</span> OpenAI Codex
              </strong>
              <span className={s.heroCodexIdentityRow}>
                <span className={s.heroCodexIdentityLabel}>model:</span>
                <span>coding model</span>
                <b>high</b>
                <b>fast</b>
              </span>
              <span className={s.heroCodexIdentityRow}>
                <span className={s.heroCodexIdentityLabel}>directory:</span>
                <span className={s.heroCodexIdentityPath}>~/{card.repo}</span>
              </span>
            </div>
            <div className={`${s.heroCodexPrompt} ${s.heroCodexAddedLine}`}>
              <span>›</span>
              <span>{terminalLineCopy(prompt)}</span>
            </div>
            <div className={`${s.heroCodexReply} ${s.heroCodexAddedLine}`}>
              <span>•</span>
              <span>I’ll inspect the project, then make the smallest safe change.</span>
            </div>
            <div className={`${s.heroCodexRun} ${s.heroCodexAddedLine}`}>
              <span className={s.heroCodexRunMarker}>•</span>
              <span className={s.heroCodexRunCopy}>
                <strong>Ran</strong> {terminalLineCopy(activity)}
              </span>
              {result ? (
                <span className={s.heroCodexRunResult}>└ {terminalLineCopy(result)}</span>
              ) : null}
            </div>
            <div className={`${s.heroCodexWorking} ${s.heroCodexAddedLine}`}>
              <span className={s.heroCodexWorkingMarker}>•</span>
              <strong>Working</strong>
              <span>esc to interrupt</span>
            </div>
          </div>
        </div>
      </div>
      <div className={s.heroCodexComposer}>
        <span>›</span>
        <span className={s.heroTermCursor} />
        <span className={s.heroCodexComposerHint}>Ask Codex to do anything</span>
      </div>
      <div className={s.heroCodexFooter}>
        <span>coding model</span>
        <strong>high</strong>
        <strong>fast</strong>
        <span className={s.heroCodexFooterPath}>~/{card.repo}</span>
      </div>
    </div>
  );
}

function ClaudeTerminalBody({ card }: { card: TerminalCard }) {
  const meta = AGENT_META.claude;

  return (
    <div className={`${s.heroTermBody} ${s.heroClaudeBody}`}>
      <div className={s.heroClaudeScrollViewport}>
        <div className={s.heroClaudeScrollTrack}>
          <div className={s.heroClaudeScrollSequence}>
            <div className={s.heroClaudeIdentity}>
              <span className={s.heroClaudeMascot} aria-hidden="true" />
              <div className={s.heroClaudeIdentityCopy}>
                <strong className={s.heroClaudeIdentityTitle}>
                  Claude Code <span>v2.1.251</span>
                </strong>
                <span className={s.heroClaudeModel}>Fable 5 with xhigh effort · Claude Max</span>
                <span className={s.heroClaudePath}>~/{card.repo}</span>
              </div>
            </div>
            <div className={s.heroTermTranscript}>
              {card.lines.map((line) => (
                <span
                  className={`${s.heroTermLine} ${s.heroClaudeAddedLine} ${TONE_CLASS[line.tone]}`}
                  key={line.text}
                >
                  <span className={s.heroTermLineMarker}>{LINE_MARKER[line.tone]}</span>
                  <span className={s.heroTermLineCopy}>{terminalLineCopy(line)}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className={s.heroTermComposer}>
        <span className={s.heroTermLivePrompt}>
          <span className={s.heroTermPromptGlyph}>{meta.prompt}</span>
          <span className={s.heroTermCursor} />
        </span>
        <span className={s.heroTermState}>
          <span className={s.heroTermActivityGlyph}>{meta.activityGlyph}</span>
          {meta.state}
        </span>
      </div>
    </div>
  );
}

/**
 * One agent session card: title bar plus the agent-specific animated body.
 * Exported so other pages (the 404) can scatter the same terminals around.
 */
export function HeroTerminalCard({
  avatar,
  card,
  className,
  idPrefix,
  showAvatar = false,
  style,
}: {
  avatar?: { src: string; name: string };
  card: TerminalCard;
  className?: string;
  idPrefix: string;
  showAvatar?: boolean;
  style?: TerminalStyle;
}) {
  const meta = AGENT_META[card.agent];

  return (
    <article
      className={`${s.heroTerm} ${SIZE_CLASS[card.size]}${className ? ` ${className}` : ''}`}
      data-agent={card.agent}
      style={style}
    >
      <header className={s.heroTermBar}>
        <span className={s.heroTermTraffic}>
          <span />
          <span />
          <span />
        </span>
        <span className={s.heroTermTitle}>
          <TerminalAgentLogo agent={card.agent} idPrefix={idPrefix} />
          {meta.label}
        </span>
        {showAvatar && avatar && (
          <Image
            className={s.heroTermAvatar}
            src={avatar.src}
            alt={avatar.name}
            width={24}
            height={24}
            loading="eager"
            unoptimized
          />
        )}
      </header>

      {card.agent === 'grok' ? (
        <GrokTerminalBody card={card} />
      ) : card.agent === 'hermes' ? (
        <HermesTerminalBody card={card} />
      ) : card.agent === 'opencode' ? (
        <OpenCodeTerminalBody card={card} />
      ) : card.agent === 'codex' ? (
        <CodexTerminalBody card={card} />
      ) : card.agent === 'claude' ? (
        <ClaudeTerminalBody card={card} />
      ) : (
        <div className={s.heroTermBody}>
          <div className={s.heroTermSession}>
            <span className={s.heroTermSessionName}>{meta.session}</span>
            <span className={s.heroTermMode}>{meta.mode}</span>
            <span className={s.heroTermRepo}>~/{card.repo}</span>
          </div>
          <div className={s.heroTermTranscript}>
            {card.lines.map((line, lineIndex) => (
              <span
                className={`${s.heroTermLine} ${TONE_CLASS[line.tone]}`}
                key={line.text}
                style={{ '--line-delay': `${lineIndex * 0.58}s` } as TerminalStyle}
              >
                <span className={s.heroTermLineMarker}>{LINE_MARKER[line.tone]}</span>
                <span className={s.heroTermLineCopy}>{terminalLineCopy(line)}</span>
              </span>
            ))}
          </div>
          <div className={s.heroTermComposer}>
            <span className={s.heroTermLivePrompt}>
              <span className={s.heroTermPromptGlyph}>{meta.prompt}</span>
              <span className={s.heroTermCursor} />
            </span>
            <span className={s.heroTermState}>
              <span className={s.heroTermActivityGlyph}>{meta.activityGlyph}</span>
              {meta.state}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

// Display-sized copies (scripts/generate-web-images.mjs): the originals are
// 150–800 KB each and production serves /_next/image sources untouched.
const TEAM_AVATARS = [
  { src: '/authors/will-128.webp', name: 'Will Washburn' },
  { src: '/authors/khaliq-128.webp', name: 'Khaliq Gant' },
  { src: '/authors/mary-128.webp', name: 'Mary' },
  { src: '/authors/ingrid-128.webp', name: 'Ingrid' },
];

function TerminalRow({
  cards,
  rowClass,
  rowKey,
  showAvatars,
}: {
  cards: MarqueeCard[];
  rowClass: string;
  rowKey: string;
  showAvatars: boolean;
}) {
  // Four identical copies keep at least three full sequences beyond the loop
  // boundary. That prevents wide viewports from outrunning shorter rows while
  // the track slides exactly one copy's width (translateX(-25%)).
  const copies = ['a', 'b', 'c', 'd'];
  const rowPhase = rowKey === 'one' ? 0 : rowKey === 'two' ? 2.2 : 4.4;

  return (
    <div className={s.heroMarqueeRow}>
      <div className={`${s.heroMarqueeTrack} ${rowClass}`}>
        {copies.map((copy, copyIndex) =>
          cards.map((card, index) => {
            const phase = -(rowPhase + index * 0.83 + copyIndex * 0.37);

            if ('kind' in card) {
              return (
                <HeroAppWindow
                  card={card}
                  idPrefix={`hero-mq-${rowKey}-${copy}-${index}`}
                  key={`${rowKey}-${copy}-${index}`}
                  style={{ '--term-cycle': APP_META[card.app].cycle, '--term-phase': `${phase}s` }}
                />
              );
            }

            const meta = AGENT_META[card.agent];
            const avatar = TEAM_AVATARS[index % TEAM_AVATARS.length];
            const terminalStyle: TerminalStyle = {
              '--term-cycle': meta.cycle,
              '--term-phase': `${phase}s`,
            };

            return (
              <HeroTerminalCard
                card={card}
                idPrefix={`hero-mq-${rowKey}-${copy}-${index}`}
                key={`${rowKey}-${copy}-${index}`}
                showAvatar={showAvatars}
                avatar={avatar}
                style={terminalStyle}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

export function HeroTerminalMarquee({ showAvatars = false }: { showAvatars?: boolean }) {
  return (
    <div aria-hidden="true" className={s.heroMarquee} data-marquee-band="">
      <RelayNetwork />
      <TerminalRow
        showAvatars={showAvatars}
        cards={MARQUEE_ROW_ONE}
        rowClass={s.heroMarqueeTrackOne}
        rowKey="one"
      />
      <TerminalRow
        showAvatars={showAvatars}
        cards={MARQUEE_ROW_TWO}
        rowClass={s.heroMarqueeTrackTwo}
        rowKey="two"
      />
      <TerminalRow
        showAvatars={showAvatars}
        cards={MARQUEE_ROW_THREE}
        rowClass={s.heroMarqueeTrackThree}
        rowKey="three"
      />
    </div>
  );
}
