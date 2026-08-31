import { AgentToolLogo, type AgentTool } from '../AgentToolLogos';
import s from '../../app/landing.module.css';

type LineTone = 'prompt' | 'tool' | 'ok' | 'relay';

type TerminalLine = {
  tone: LineTone;
  text: string;
};

type TerminalCard = {
  /** Which agent's terminal this is — drives the mark in the title bar. */
  agent: AgentTool;
  /** The title bar string, `agent · repo` the way a real shell tab reads. */
  title: string;
  /** Three or four lines: a prompt, what the agent did, where it went. */
  lines: TerminalLine[];
  /** Card width step. The rows read as sessions, not as a grid, so widths vary. */
  size: 'sm' | 'md' | 'lg';
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
      { tone: 'tool', text: '⎿ ran 26 tests — 26 passed' },
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
      { tone: 'tool', text: '⎿ retried 3× — stable' },
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

  return (
    <div className={s.heroMarqueeRow}>
      <div className={`${s.heroMarqueeTrack} ${rowClass}`}>
        {copies.map((copy) =>
          cards.map((card, index) => (
            <article
              className={`${s.heroTerm} ${SIZE_CLASS[card.size]}`}
              key={`${rowKey}-${copy}-${index}`}
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
              </header>
              <div className={s.heroTermBody}>
                {card.lines.map((line, lineIndex) => (
                  <span className={`${s.heroTermLine} ${TONE_CLASS[line.tone]}`} key={lineIndex}>
                    {line.text}
                  </span>
                ))}
              </div>
            </article>
          ))
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
