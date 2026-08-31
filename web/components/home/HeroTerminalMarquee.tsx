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

type RelayRoute = {
  d: string;
  delay: string;
  duration: string;
  id: string;
  origin: { x: number; y: number };
  target: { x: number; y: number };
};

const AGENT_META: Record<
  TerminalAgent,
  {
    activityGlyph: string;
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
    cycle: '7.8s',
    label: 'Claude Code',
    mode: 'trusted',
    prompt: '❯',
    session: 'Claude Max',
    state: 'Thinking',
  },
  codex: {
    activityGlyph: '◌',
    cycle: '7.2s',
    label: 'OpenAI Codex',
    mode: 'workspace-write',
    prompt: '›',
    session: 'Codex session',
    state: 'Running',
  },
  grok: {
    activityGlyph: '◆',
    cycle: '7.5s',
    label: 'Grok',
    mode: 'auto',
    prompt: '>',
    session: 'Grok Code',
    state: 'Working',
  },
  opencode: {
    activityGlyph: '▣',
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
  const prompt = card.lines.find((line) => line.tone === 'prompt') ?? card.lines[0];
  const activity = card.lines.find((line) => line.tone === 'tool') ?? card.lines[1];
  const result = card.lines.find((line) => line.tone === 'relay' || line.tone === 'ok');

  return (
    <div className={`${s.heroTermBody} ${s.heroGrokBody}`}>
      <div className={s.heroGrokContext}>
        <span className={s.heroGrokBranch}>⌁</span>
        <span className={s.heroGrokPath}>
          codex/{card.repo.replace('/', '-')} ~/{card.repo}
        </span>
        <span className={s.heroGrokContextMode}>auto</span>
      </div>
      <div
        className={`${s.heroGrokPrompt} ${s.heroGrokCycleLine}`}
        style={{ '--line-delay': '0s' } as TerminalStyle}
      >
        <span>❯</span>
        <span>{terminalLineCopy(prompt)}</span>
      </div>
      <div className={s.heroGrokEvents}>
        <span
          className={s.heroGrokCycleLine}
          style={{ '--line-delay': '0.5s' } as TerminalStyle}
        >
          ◆ user_prompt_submit
        </span>
        <span
          className={s.heroGrokCycleLine}
          style={{ '--line-delay': '0.9s' } as TerminalStyle}
        >
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
      <div className={s.heroOpenCodeScrollViewport}>
        <div className={s.heroOpenCodeScrollTrack}>
          <div className={s.heroOpenCodePrompt}>{terminalLineCopy(prompt)}</div>
          <div className={s.heroOpenCodeActivity}>
            <span className={`${s.heroOpenCodeThought} ${s.heroOpenCodeAddedLine}`}>
              + Thought: 683ms
            </span>
            <span className={s.heroOpenCodeAddedLine}>* {terminalLineCopy(activity)}</span>
            <span className={`${s.heroOpenCodeResult} ${s.heroOpenCodeAddedLine}`}>
              ~ {result ? terminalLineCopy(result) : 'Finding files…'}
            </span>
          </div>
          <div className={s.heroOpenCodeMode}>
            <span>▣</span>
            <strong>Build</strong>
            <span>OpenCode</span>
          </div>
        </div>
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
          {['a', 'b'].map((copy) => (
            <div className={s.heroCodexScrollSequence} key={copy}>
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
              <div className={s.heroCodexPrompt}>
                <span>›</span>
                <span>{terminalLineCopy(prompt)}</span>
              </div>
              <div className={s.heroCodexReply}>
                <span>•</span>
                <span>I’ll inspect the project, then make the smallest safe change.</span>
              </div>
              <div className={s.heroCodexRun}>
                <span className={s.heroCodexRunMarker}>•</span>
                <span className={s.heroCodexRunCopy}>
                  <strong>Ran</strong> {terminalLineCopy(activity)}
                </span>
                {result ? (
                  <span className={s.heroCodexRunResult}>└ {terminalLineCopy(result)}</span>
                ) : null}
              </div>
              <div className={s.heroCodexWorking}>
                <span className={s.heroCodexWorkingMarker}>•</span>
                <strong>Working</strong>
                <span>esc to interrupt</span>
              </div>
            </div>
          ))}
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
              <pre className={s.heroClaudeMascot}>{`▐▛███▛█
▝▜██████▀
 ▝▝ ▝▝`}</pre>
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
                data-agent={card.agent}
                key={`${rowKey}-${copy}-${index}`}
                style={terminalStyle}
              >
                <header className={s.heroTermBar}>
                  <span className={s.heroTermTraffic}>
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className={s.heroTermTitle}>
                    <TerminalAgentLogo
                      agent={card.agent}
                      idPrefix={`hero-mq-${rowKey}-${copy}-${index}`}
                    />
                    {meta.label}
                  </span>
                </header>

                {card.agent === 'grok' ? (
                  <GrokTerminalBody card={card} />
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
