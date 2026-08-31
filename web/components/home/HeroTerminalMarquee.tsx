import type { CSSProperties } from 'react';

import { AgentToolLogo, type AgentTool } from '../AgentToolLogos';
import s from '../../app/landing.module.css';

type TerminalAgent = Extract<AgentTool, 'claude' | 'codex' | 'opencode' | 'gemini' | 'copilot'>;

type LineTone = 'prompt' | 'tool' | 'ok' | 'relay';

type TerminalLine = {
  tone: LineTone;
  text: string;
};

type TerminalCard = {
  /** Which agent's terminal this is — drives the mark in the title bar. */
  agent: TerminalAgent;
  /** The title bar string, `agent · repo` the way a real shell tab reads. */
  title: string;
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
  opencode: {
    cycle: '6.9s',
    label: 'OpenCode',
    mode: 'build',
    prompt: '>',
    state: 'Editing',
  },
  gemini: {
    cycle: '7.5s',
    label: 'Gemini CLI',
    mode: 'auto edit',
    prompt: '✦',
    state: 'Working',
  },
  copilot: {
    cycle: '7.1s',
    label: 'GitHub Copilot',
    mode: 'agent',
    prompt: '>',
    state: 'Working',
  },
};

const AGENT_CLASS: Record<TerminalAgent, string> = {
  claude: s.heroTermClaude,
  codex: s.heroTermCodex,
  opencode: s.heroTermOpenCode,
  gemini: s.heroTermGemini,
  copilot: s.heroTermCopilot,
};

const TONE_CLASS: Record<LineTone, string> = {
  prompt: s.heroTermPrompt,
  tool: s.heroTermTool,
  ok: s.heroTermOk,
  relay: s.heroTermRelay,
};

/**
 * Three rows of agent sessions, each one a small terminal the way Claude Code,
 * Codex or OpenCode actually look: a title bar with the agent and the repo, a
 * prompt line, what the tool did, and where the result went — which for Agent
 * Relay means a channel, a DM or a PR.
 *
 * The cards are illustrative chrome, so the whole band is aria-hidden and holds
 * nothing focusable; the hero's real content is the column above it.
 */
const ROW_ONE: TerminalCard[] = [
  {
    agent: 'claude',
    title: 'claude · agentrelay/web',
    size: 'md',
    lines: [
      { tone: 'prompt', text: '$ claude "fix the flaky retry test"' },
      { tone: 'tool', text: '⎿ ran 26 tests - 26 passed' },
      { tone: 'relay', text: '↑ pushed fix-retry → PR #482' },
    ],
  },
  {
    agent: 'codex',
    title: 'codex · relay/router',
    size: 'lg',
    lines: [
      { tone: 'prompt', text: '$ codex "trace the dropped socket"' },
      { tone: 'tool', text: '⎿ found reconnect gap at 30s' },
      { tone: 'relay', text: '→ relayed to #build-router' },
    ],
  },
  {
    agent: 'opencode',
    title: 'opencode · relay/sdk',
    size: 'sm',
    lines: [
      { tone: 'prompt', text: '$ opencode "threads for py sdk"' },
      { tone: 'tool', text: '⎿ wrote sdk/python/threads.py' },
      { tone: 'ok', text: '✓ typecheck clean' },
    ],
  },
  {
    agent: 'gemini',
    title: 'gemini · relay/docs',
    size: 'md',
    lines: [
      { tone: 'prompt', text: '$ gemini "refresh the quickstart"' },
      { tone: 'tool', text: '⎿ edited docs/quickstart.mdx' },
      { tone: 'relay', text: '→ DM to Reviewer: ready for a pass' },
    ],
  },
  {
    agent: 'copilot',
    title: 'copilot · relay/tests',
    size: 'sm',
    lines: [
      { tone: 'prompt', text: '$ copilot "unflake the ws suite"' },
      { tone: 'tool', text: '⎿ retried 3× - stable' },
      { tone: 'relay', text: '→ note left in #build-router' },
    ],
  },
];

const ROW_TWO: TerminalCard[] = [
  {
    agent: 'copilot',
    title: 'copilot · relay/web',
    size: 'lg',
    lines: [
      { tone: 'prompt', text: '$ copilot "port nav to the new tokens"' },
      { tone: 'tool', text: '⎿ 4 files changed, 61 insertions' },
      { tone: 'relay', text: '↑ opened PR #491 · asked Reviewer' },
    ],
  },
  {
    agent: 'claude',
    title: 'claude · relay/api',
    size: 'sm',
    lines: [
      { tone: 'tool', text: '⎿ relay.send_message(#build-web)' },
      { tone: 'tool', text: '⎿ Reviewer joined the thread' },
      { tone: 'ok', text: '✓ handoff acked in 1.2s' },
    ],
  },
  {
    agent: 'codex',
    title: 'codex · relay/billing',
    size: 'md',
    lines: [
      { tone: 'prompt', text: '$ codex "add the usage export"' },
      { tone: 'tool', text: '⎿ ran migration 0042' },
      { tone: 'ok', text: '✓ backfilled 1,204 rows' },
    ],
  },
  {
    agent: 'opencode',
    title: 'opencode · relay/cli',
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
    agent: 'gemini',
    title: 'gemini · relay/search',
    size: 'md',
    lines: [
      { tone: 'prompt', text: '$ gemini "index the thread history"' },
      { tone: 'tool', text: '⎿ reindexed 84,102 messages' },
      { tone: 'relay', text: '→ summary in #build-search' },
    ],
  },
  {
    agent: 'claude',
    title: 'claude · relay/infra',
    size: 'sm',
    lines: [
      { tone: 'tool', text: '⎿ waiting on Planner in #ship-it' },
      { tone: 'relay', text: '→ Planner: "go after the freeze"' },
      { tone: 'ok', text: '✓ resumed after 41m idle' },
    ],
  },
  {
    agent: 'claude',
    title: 'claude · agentrelay/web',
    size: 'lg',
    lines: [
      { tone: 'prompt', text: '$ claude "review PR #482"' },
      { tone: 'tool', text: '⎿ read 6 files · left 3 notes' },
      { tone: 'relay', text: '→ DM to Coder: one nit, then merge' },
    ],
  },
  {
    agent: 'codex',
    title: 'codex · relay/router',
    size: 'md',
    lines: [
      { tone: 'tool', text: '⎿ picked up task from #build-router' },
      { tone: 'prompt', text: '$ codex "add backpressure to fanout"' },
      { tone: 'ok', text: '✓ p99 480ms → 120ms' },
    ],
  },
  {
    agent: 'opencode',
    title: 'opencode · relay/web',
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
                className={`${s.heroTerm} ${SIZE_CLASS[card.size]} ${AGENT_CLASS[card.agent]}`}
                key={`${rowKey}-${copy}-${index}`}
                style={terminalStyle}
              >
                <header className={s.heroTermBar}>
                  <span className={s.heroTermLights} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className={s.heroTermTitle}>
                    <AgentToolLogo
                      className={s.heroTermMark}
                      idPrefix={`hero-mq-${rowKey}-${copy}-${index}`}
                      provider={card.agent}
                    />
                    {card.title}
                  </span>
                  <span className={s.heroTermState}>
                    <span className={s.heroTermStateDot} />
                    {meta.state}
                  </span>
                </header>

                <div className={s.heroTermProductBar}>
                  <span className={s.heroTermProduct}>{meta.label}</span>
                  <span className={s.heroTermMode}>{meta.mode}</span>
                </div>

                <div className={s.heroTermBody}>
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
      <TerminalRow cards={ROW_ONE} rowClass={s.heroMarqueeTrackOne} rowKey="one" />
      <TerminalRow cards={ROW_TWO} rowClass={s.heroMarqueeTrackTwo} rowKey="two" />
      <TerminalRow cards={ROW_THREE} rowClass={s.heroMarqueeTrackThree} rowKey="three" />
    </div>
  );
}
