import type { CSSProperties } from 'react';

import Grok from '@lobehub/icons/es/Grok';

import { AgentToolLogo, type AgentTool } from '../AgentToolLogos';
import s from '../../app/landing.module.css';

type TerminalAgent = Extract<AgentTool, 'claude' | 'codex' | 'opencode'> | 'grok';

type LineTone = 'prompt' | 'tool' | 'ok' | 'relay';

type TerminalLine = {
  tone: LineTone;
  text: string;
};

type TerminalCard = {
  /** Which agent's terminal this is; drives the name and mark in the title bar. */
  agent: TerminalAgent;
  /** Repository context shown inside the terminal session. */
  repo: string;
  /** Three or four lines: a prompt, what the agent did, where it went. */
  lines: TerminalLine[];
  /** Card width step. The rows read as sessions, not as a grid, so widths vary. */
  size: 'sm' | 'md' | 'lg';
};

type TerminalStyle = CSSProperties & {
  '--line-delay'?: string;
  '--term-cycle'?: string;
  '--term-phase'?: string;
};

type RelayPath = {
  d: string;
  delay: string;
  duration: string;
  id: string;
};

const AGENT_META: Record<
  TerminalAgent,
  { cycle: string; label: string; mode: string; prompt: string; state: string }
> = {
  claude: {
    cycle: '7.8s',
    label: 'Claude Code',
    mode: 'trusted',
    prompt: '❯',
    state: 'Thinking',
  },
  codex: {
    cycle: '7.2s',
    label: 'OpenAI Codex',
    mode: 'workspace-write',
    prompt: '›',
    state: 'Running',
  },
  grok: {
    cycle: '7.5s',
    label: 'Grok',
    mode: 'auto',
    prompt: '>',
    state: 'Working',
  },
  opencode: {
    cycle: '6.9s',
    label: 'OpenCode',
    mode: 'build',
    prompt: '>',
    state: 'Editing',
  },
};

const TONE_CLASS: Record<LineTone, string> = {
  prompt: s.heroTermPrompt,
  tool: s.heroTermTool,
  ok: s.heroTermOk,
  relay: s.heroTermRelay,
};

const RELAY_PATHS: RelayPath[] = [
  {
    id: 'hero-relay-route-one',
    d: 'M -80 62 C 120 12 260 108 460 58 S 800 102 1040 52 S 1240 82 1360 44',
    duration: '10.8s',
    delay: '-2.1s',
  },
  {
    id: 'hero-relay-route-two',
    d: 'M 70 202 C 250 140 360 258 560 198 S 860 138 1060 210 S 1260 260 1360 192',
    duration: '12.6s',
    delay: '-7.4s',
  },
  {
    id: 'hero-relay-route-three',
    d: 'M -80 344 C 120 286 280 390 480 334 S 820 286 1010 348 S 1230 392 1360 326',
    duration: '11.4s',
    delay: '-5.3s',
  },
  {
    id: 'hero-relay-route-four',
    d: 'M 180 68 C 300 118 360 132 485 204 S 650 286 795 344',
    duration: '8.8s',
    delay: '-3.7s',
  },
  {
    id: 'hero-relay-route-five',
    d: 'M 1100 58 C 960 110 920 154 820 206 S 650 270 540 340',
    duration: '9.6s',
    delay: '-6.2s',
  },
  {
    id: 'hero-relay-route-six',
    d: 'M -40 196 C 180 228 255 126 420 80 S 760 132 900 210 S 1110 320 1320 336',
    duration: '13.2s',
    delay: '-9.1s',
  },
];

/**
 * Three rows of Claude Code, Codex, Grok and OpenCode sessions. Each title bar
 * names the agent, while repository and activity context stay in the terminal.
 * The animated lines show the prompt, what the tool did, and where the result
 * went, which for Agent Relay means a channel, a DM or a PR.
 *
 * The cards are illustrative chrome, so the whole band is aria-hidden and holds
 * nothing focusable; the hero's real content is the column above it.
 */
const ROW_ONE: TerminalCard[] = [
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

const ROW_TWO: TerminalCard[] = [
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

const ROW_THREE: TerminalCard[] = [
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

const SIZE_CLASS = {
  sm: s.heroTermSm,
  md: s.heroTermMd,
  lg: s.heroTermLg,
} as const;

function TerminalAgentLogo({ agent, idPrefix }: { agent: TerminalAgent; idPrefix: string }) {
  if (agent === 'grok') return <Grok className={s.heroTermMark} />;

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
      {RELAY_PATHS.map((route) => (
        <path className={s.heroRelayPath} d={route.d} id={route.id} key={route.id} />
      ))}
      {RELAY_PATHS.map((route) => (
        <circle className={s.heroRelaySpark} key={`${route.id}-spark`} r="2.4">
          <animateMotion begin={route.delay} dur={route.duration} repeatCount="indefinite">
            <mpath href={`#${route.id}`} />
          </animateMotion>
          <animate
            attributeName="opacity"
            dur="1.8s"
            repeatCount="indefinite"
            values="0.28;0.9;0.28"
          />
        </circle>
      ))}
    </svg>
  );
}

function TerminalRow({
  cards,
  rowClass,
  rowKey,
}: {
  cards: TerminalCard[];
  rowClass: string;
  rowKey: string;
}) {
  // Two identical copies make the loop seamless: the track slides exactly one
  // copy's width (translateX(-50%)) and snaps back with the second copy already
  // sitting where the first one started.
  const copies = ['a', 'b'];
  const rowPhase = rowKey === 'one' ? 0 : rowKey === 'two' ? 2.2 : 4.4;

  return (
    <div className={s.heroMarqueeRow}>
      <div className={`${s.heroMarqueeTrack} ${rowClass}`}>
        {copies.map((copy, copyIndex) =>
          cards.map((card, index) => {
            const meta = AGENT_META[card.agent];
            const phase = -(rowPhase + index * 0.83 + copyIndex * 0.37);
            const terminalStyle: TerminalStyle = {
              '--term-cycle': meta.cycle,
              '--term-phase': `${phase}s`,
            };

            return (
              <article
                className={`${s.heroTerm} ${SIZE_CLASS[card.size]}`}
                key={`${rowKey}-${copy}-${index}`}
                style={terminalStyle}
              >
                <header className={s.heroTermBar}>
                  <span className={s.heroTermTitle}>
                    <TerminalAgentLogo
                      agent={card.agent}
                      idPrefix={`hero-mq-${rowKey}-${copy}-${index}`}
                    />
                    {meta.label}
                  </span>
                </header>

                <div className={s.heroTermBody}>
                  <div className={s.heroTermContext}>
                    <span className={s.heroTermRepo}>{card.repo}</span>
                    <span className={s.heroTermState}>
                      <span className={s.heroTermStateDot} />
                      {meta.state} · {meta.mode}
                    </span>
                  </div>
                  {card.lines.map((line, lineIndex) => (
                    <span
                      className={`${s.heroTermLine} ${TONE_CLASS[line.tone]}`}
                      key={line.text}
                      style={{ '--line-delay': `${lineIndex * 0.58}s` } as TerminalStyle}
                    >
                      {line.text}
                    </span>
                  ))}
                  <span className={s.heroTermLivePrompt}>
                    <span className={s.heroTermPromptGlyph}>{meta.prompt}</span>
                    <span className={s.heroTermCursor} />
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

export function HeroTerminalMarquee() {
  return (
    <div aria-hidden="true" className={s.heroMarquee} data-marquee-band="">
      <RelayNetwork />
      <TerminalRow cards={ROW_ONE} rowClass={s.heroMarqueeTrackOne} rowKey="one" />
      <TerminalRow cards={ROW_TWO} rowClass={s.heroMarqueeTrackTwo} rowKey="two" />
      <TerminalRow cards={ROW_THREE} rowClass={s.heroMarqueeTrackThree} rowKey="three" />
    </div>
  );
}
