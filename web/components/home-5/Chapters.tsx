import type { CSSProperties, ReactNode } from 'react';

import { ToolMark, TOOL_LABEL, type Tool } from './ToolMark';
import s from './home5.module.css';

function Chapter({
  id,
  index,
  kicker,
  title,
  line,
  flip = false,
  children,
}: {
  id: string;
  index: string;
  kicker: string;
  title: ReactNode;
  line: string;
  flip?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`${s.chapter} ${flip ? s.chapterFlip : ''}`} aria-labelledby={`${id}-title`} id={id}>
      <span className={s.chapterGhost} aria-hidden="true">
        {index}
      </span>
      <div className={s.chapterCopy}>
        <p className={s.kicker}>
          <span className={s.kickerIndex}>{index}</span>
          {kicker}
        </p>
        <h2 id={`${id}-title`} className={s.chapterTitle}>
          {title}
        </h2>
        <p className={s.chapterLine}>{line}</p>
      </div>
      <div className={s.chapterVisual} aria-hidden="true">
        <div className={s.flyIn}>{children}</div>
      </div>
    </section>
  );
}

/* ── 01 · One machine ─────────────────────────────────────────── */

type Pane = { tool: Tool; x: number; y: number; status: string; lines: string[]; msg: { dir: 'out' | 'in'; who: string; text: string } };

const PANES: Pane[] = [
  {
    tool: 'claude',
    x: 4,
    y: 14,
    status: 'editing',
    lines: ['✻ Patching retry.ts', '  backoff now starts at 250ms'],
    msg: { dir: 'out', who: '→ codex', text: 'Patched. Run the suite?' },
  },
  {
    tool: 'codex',
    x: 54,
    y: 6,
    status: 'testing',
    lines: ['▸ npm test', '✓ 214 passed · 0 failed'],
    msg: { dir: 'out', who: '→ claude', text: 'Green. Opening the PR.' },
  },
  {
    tool: 'cursor',
    x: 30,
    y: 56,
    status: 'writing docs',
    lines: ['◆ docs/retry.md', '  + Backoff starts at 250ms'],
    msg: { dir: 'in', who: 'claude →', text: 'New backoff landed — document it.' },
  },
];

function MachineVisual() {
  return (
    <div className={s.machine}>
      <div className={s.machineBar}>
        <span className={s.lights}>
          <i />
          <i />
          <i />
        </span>
        <span className={s.machineName}>you · macbook</span>
        <span className={s.machineMcp}>agent-relay</span>
      </div>
      <div className={s.machineBody}>
        <svg className={s.machineLinks} viewBox="0 0 100 70" preserveAspectRatio="none" fill="none">
          {[
            'M26 22 C 40 6, 60 6, 74 16',
            'M74 18 C 76 40, 66 56, 52 62',
            'M26 24 C 22 44, 34 58, 48 62',
          ].map((d, i) => (
            <g key={d} className={`${s.link} ${i === 1 ? s.tone_warm : s.tone_blue}`}>
              <path className={s.linkBase} d={d} vectorEffect="non-scaling-stroke" />
              <path
                className={s.linkPulse}
                d={d}
                pathLength={100}
                vectorEffect="non-scaling-stroke"
                style={{ animationDuration: '3.2s', animationDelay: `${i * 1.1}s` } as CSSProperties}
              />
            </g>
          ))}
        </svg>
        {PANES.map((pane) => (
          <div key={pane.tool} className={s.pane} style={{ '--x': `${pane.x}%`, '--y': `${pane.y}%` } as CSSProperties}>
            <div className={s.paneHead}>
              <ToolMark tool={pane.tool} id={`pane-${pane.tool}`} className={s.paneLogo} />
              <span>{TOOL_LABEL[pane.tool]}</span>
              <span className={s.paneStatus}>{pane.status}</span>
            </div>
            <div className={s.paneBody}>
              {pane.lines.map((line) => (
                <code key={line}>{line}</code>
              ))}
            </div>
            <div className={`${s.bubble} ${pane.msg.dir === 'in' ? s.bubbleIn : ''}`}>
              <span className={s.bubbleWho}>{pane.msg.who}</span>
              {pane.msg.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 02 · The team ────────────────────────────────────────────── */

type Teammate = { who: string; sessions: { tool: Tool; name: string; state: 'live' | 'done' }[] };

const TEAM: Teammate[] = [
  {
    who: 'maya',
    sessions: [
      { tool: 'claude', name: 'fix-reconnect-gap', state: 'live' },
      { tool: 'codex', name: 'usage-export', state: 'done' },
    ],
  },
  {
    who: 'you',
    sessions: [
      { tool: 'cursor', name: 'pricing-table', state: 'live' },
      { tool: 'claude', name: 'retry-backoff', state: 'live' },
    ],
  },
  {
    who: 'sam',
    sessions: [
      { tool: 'opencode', name: 'db-migration', state: 'live' },
      { tool: 'gemini', name: 'onboarding-copy', state: 'done' },
    ],
  },
];

function TeamVisual() {
  return (
    <div className={s.team}>
      <svg className={s.teamLinks} viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
        {['M17 66 C 20 34, 40 22, 50 16', 'M50 66 L 50 18', 'M83 66 C 80 34, 60 22, 50 16'].map((d, i) => (
          <g key={d} className={`${s.link} ${i === 1 ? s.tone_warm : s.tone_blue}`}>
            <path className={s.linkBase} d={d} vectorEffect="non-scaling-stroke" />
            <path
              className={s.linkPulse}
              d={d}
              pathLength={100}
              vectorEffect="non-scaling-stroke"
              style={{ animationDuration: '2.8s', animationDelay: `${i * 0.9}s`, animationDirection: 'reverse' } as CSSProperties}
            />
          </g>
        ))}
      </svg>
      <div className={s.teamHub}>
        <span className={s.teamHubRing} />
        <span className={s.teamHubLabel}>team sessions</span>
        <span className={s.teamHubCount}>synced</span>
      </div>
      <div className={s.teamRow}>
        {TEAM.map((mate) => (
          <div key={mate.who} className={`${s.mate} ${mate.who === 'you' ? s.mateYou : ''}`}>
            <div className={s.mateHead}>
              <span className={s.avatar}>{mate.who[0]}</span>
              {mate.who}
            </div>
            <ul className={s.sessions}>
              {mate.sessions.map((session) => (
                <li key={session.name}>
                  <ToolMark tool={session.tool} id={`team-${session.name}`} className={s.sessionLogo} />
                  <span className={s.sessionName}>{session.name}</span>
                  <span className={session.state === 'live' ? s.stateLive : s.stateDone}>{session.state}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 03 · Memory ──────────────────────────────────────────────── */

const TAGS: { kind: 'intent' | 'constraint'; text: string; x: number; y: number; z: number }[] = [
  { kind: 'intent', text: 'Close the 30s reconnect gap', x: 2, y: 4, z: 1 },
  { kind: 'constraint', text: 'Resume from the cursor, never replay', x: 54, y: 0, z: 2 },
  { kind: 'constraint', text: 'No new dependencies', x: 66, y: 86, z: 3 },
  { kind: 'intent', text: 'Back off from 250ms', x: 0, y: 88, z: 2 },
];

function MemoryVisual() {
  return (
    <div className={s.memory}>
      {TAGS.map((tag) => (
        <span
          key={tag.text}
          className={`${s.tag} ${tag.kind === 'intent' ? s.tagIntent : s.tagConstraint} ${s[`tagZ${tag.z}`]}`}
          style={{ left: `${tag.x}%`, top: `${tag.y}%` } as CSSProperties}
        >
          <b>{tag.kind}</b>
          {tag.text}
        </span>
      ))}

      <div className={s.query}>
        <div className={s.queryHead}>
          <ToolMark tool="claude" id="memory-claude" className={s.paneLogo} />
          <span>Claude Code</span>
          <span className={s.paneStatus}>searching</span>
        </div>
        <code className={s.queryCall}>
          <span className={s.fn}>search_shared_sessions</span>(<span className={s.str}>&quot;why does retry back off from 250ms?&quot;</span>)
        </code>
        <div className={s.result}>
          <div className={s.resultHead}>
            <span className={s.avatar}>m</span>
            <span>maya · fix-reconnect-gap</span>
            <span className={s.resultAge}>3 days ago</span>
          </div>
          <div className={s.resultTags}>
            <span className={`${s.miniTag} ${s.tagIntent}`}>intent</span>
            <span className={`${s.miniTag} ${s.tagConstraint}`}>2 constraints</span>
          </div>
        </div>
        <code className={s.queryCall}>
          <span className={s.fn}>get_shared_session_context</span>(<span className={s.str}>&quot;fix-reconnect-gap&quot;</span>)
          <span className={s.ok}> ✓ loaded</span>
        </code>
      </div>
    </div>
  );
}

export function Chapters() {
  return (
    <div className={s.flight}>
      <span className={s.rail} aria-hidden="true" />
      <Chapter
        id="h5-machine"
        index="01"
        kicker="One machine"
        title={
          <>
            Claude Code, <span className={s.chapterAccent}>meet Codex.</span>
          </>
        }
        line="Agents in different tools message each other directly. No more copy-paste between terminals."
      >
        <MachineVisual />
      </Chapter>

      <Chapter
        id="h5-team"
        index="02"
        kicker="The team"
        flip
        title={
          <>
            Every session, <span className={s.chapterAccent}>visible to the team.</span>
          </>
        }
        line="Sessions sync to the cloud, so teammates — and their agents — see what's in flight."
      >
        <TeamVisual />
      </Chapter>

      <Chapter
        id="h5-memory"
        index="03"
        kicker="Memory"
        title={
          <>
            Agents that <span className={s.chapterAccent}>remember why.</span>
          </>
        }
        line="Agents search past sessions by intent and constraint, then pick up where the team left off."
      >
        <MemoryVisual />
      </Chapter>
    </div>
  );
}
