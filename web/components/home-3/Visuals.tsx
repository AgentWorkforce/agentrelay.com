import s from './home-3.module.css';

/** Hero: two sessions, one hairline drawn between them, one message crossing it. */
export function HeroLine() {
  return (
    <div className={s.heroLine} aria-hidden="true">
      <span className={s.heroEnd}>
        <i className={s.dot} />
        claude-code <em>~/api</em>
      </span>
      <span className={s.heroRule}>
        <span className={s.heroRuleFill} />
        <span className={s.heroPacket} />
      </span>
      <span className={`${s.heroEnd} ${s.heroEndRight}`}>
        codex <em>~/web</em>
        <i className={s.dot} />
      </span>
    </div>
  );
}

const DIRECT = 'M40 72 C 150 6, 330 6, 440 72';

/** 01: the old path runs through you; the new one doesn't. */
export function MessengerDiagram() {
  return (
    <svg className={s.svg} viewBox="0 0 480 210" role="img" aria-label="Before: context passes from Claude Code through you to Codex. After: Claude Code messages Codex directly.">
      <path className={s.oldPath} d="M40 72 L240 168 L440 72" />
      <path className={s.drawPath} d={DIRECT} pathLength={1} />
      <circle className={s.packet} r="3.5">
        <animateMotion dur="3.2s" repeatCount="indefinite" path={DIRECT} begin="1.4s" />
      </circle>

      <circle className={s.node} cx="40" cy="72" r="5" />
      <circle className={s.node} cx="440" cy="72" r="5" />
      <text className={s.svgLabel} x="40" y="100" textAnchor="middle">claude-code</text>
      <text className={s.svgLabel} x="440" y="100" textAnchor="middle">codex</text>

      <circle className={s.youNode} cx="240" cy="168" r="11" />
      <line className={s.youStrike} x1="226" y1="182" x2="254" y2="154" />
      <text className={s.svgLabelWarm} x="240" y="203" textAnchor="middle">you · copy · paste · re-explain</text>
    </svg>
  );
}

/** 02: a two-line exchange between agents in different repos. */
export function ChatExchange() {
  return (
    <div className={s.chat}>
      <div className={s.msg} data-step="1">
        <span className={s.msgMeta}>
          claude-code <b>→</b> codex
        </span>
        <p className={s.bubble}>
          Renamed <code>user.name</code> to <code>displayName</code> in the API. Your call sites need it.
        </p>
      </div>
      <div className={`${s.msg} ${s.msgIn}`} data-step="2">
        <span className={s.msgMeta}>
          codex <b>→</b> claude-code
        </span>
        <p className={`${s.bubble} ${s.bubbleIn}`}>Updated 3 call sites. Tests pass.</p>
      </div>
      <code className={s.chatFoot}>agent.sendMessage({'{'} to, text {'}'})</code>
    </div>
  );
}

const TOOLS: Array<[kind: string, name: string]> = [
  ['cli', 'Claude Code'],
  ['cli', 'Codex'],
  ['cli', 'Gemini'],
  ['cli', 'OpenCode'],
  ['app', 'Cursor'],
  ['app', 'Conductor'],
  ['app', 'Claude desktop'],
  ['phone', 'Phone agents'],
];

/** 03: every tool converges on one relay. */
export function ToolsConverge() {
  const top = 22;
  const step = 36;
  const hubY = top + (step * (TOOLS.length - 1)) / 2;
  return (
    <svg className={s.svg} viewBox="0 0 480 296" role="img" aria-label="Claude Code, Codex, Gemini, OpenCode, Cursor, Conductor, Claude desktop and phone agents all connect to one relay.">
      {TOOLS.map(([kind, name], i) => {
        const y = top + i * step;
        return (
          <g key={name}>
            <text className={s.svgTag} x="0" y={y + 4}>{kind}</text>
            <text className={s.svgLabelBright} x="46" y={y + 4.5}>{name}</text>
            <path
              className={s.drawPath}
              style={{ transitionDelay: `${0.15 + i * 0.07}s` }}
              d={`M170 ${y} C 290 ${y}, 300 ${hubY}, 404 ${hubY}`}
              pathLength={1}
            />
          </g>
        );
      })}
      <circle className={s.hubRing} cx="416" cy={hubY} r="12" />
      <circle className={s.hub} cx="416" cy={hubY} r="4.5" />
      <text className={s.svgLabel} x="416" y={hubY + 32} textAnchor="middle">relay</text>
    </svg>
  );
}

const SESSIONS: Array<{ who: string; agent: string; task: string; state: string; live: boolean }> = [
  { who: 'maya', agent: 'Claude Code', task: 'api / rate-limits', state: 'live', live: true },
  { who: 'sam', agent: 'Codex', task: 'web / checkout', state: 'live', live: true },
  { who: 'you', agent: 'Cursor', task: 'infra / ci-cache', state: '4m ago', live: false },
];

/** 04: the team's sessions, side by side. */
export function TeamSessions() {
  return (
    <div className={s.sessions}>
      <div className={s.sessionsHead}>
        <span>shared sessions</span>
        <span>2 live</span>
      </div>
      {SESSIONS.map((row) => (
        <div className={s.sessionRow} key={row.who}>
          <span className={s.avatar} aria-hidden="true">
            {row.who[0]}
          </span>
          <span className={s.sessionWho}>{row.who}</span>
          <span className={s.sessionAgent}>{row.agent}</span>
          <span className={s.sessionTask}>{row.task}</span>
          <span className={`${s.sessionState} ${row.live ? s.isLive : ''}`}>{row.state}</span>
        </div>
      ))}
    </div>
  );
}

/** 05: an agent asking the team's history a question. */
export function SearchTerminal() {
  return (
    <div className={s.term}>
      <div className={s.termLine}>
        <span className={s.termPrompt}>›</span> search_shared_sessions(<span className={s.termStr}>&quot;why no redis cache?&quot;</span>)
      </div>
      <div className={`${s.termLine} ${s.termDim}`}>1 match · sam · codex · 3 days ago</div>
      <div className={s.termGrid}>
        <span>intent</span>
        <span>cut infra cost before launch</span>
        <span>constraint</span>
        <span>p99 under 50ms without a cache</span>
      </div>
      <div className={s.termLine}>
        <span className={s.termPrompt}>›</span> get_shared_session_context(<span className={s.termStr}>&quot;sam/perf&quot;</span>)<span className={s.caret} />
      </div>
    </div>
  );
}
