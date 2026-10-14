import type { CSSProperties, ReactNode } from 'react';

import { ClaudeCodeColor, Codex, Cursor } from '../brand-icons';
import { RELAY_MARK_PATHS } from '../../lib/relay-mark';
import {
  CONDUCTOR_RUN,
  MAYA_MATCH,
  PANE_NAME,
  PANES,
  SCRIPT,
  type PaneId,
  type ScriptLine,
} from './script';
import s from './home-2.module.css';

export function RelayMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 112 91" fill="none" aria-hidden="true" focusable="false">
      <path fillRule="evenodd" clipRule="evenodd" d={RELAY_MARK_PATHS[0]} fill="currentColor" />
      <path d={RELAY_MARK_PATHS[1]} fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function ConductorMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <rect x="2.5" y="2.5" width="19" height="19" rx="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 15.5 15.5 7M11 17l6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ToolIcon({ pane, className }: { pane: PaneId; className?: string }) {
  if (pane === 'claude') return <ClaudeCodeColor className={className} aria-hidden="true" />;
  if (pane === 'codex') return <Codex className={className} aria-hidden="true" />;
  if (pane === 'conductor') return <ConductorMark className={className} />;
  return <Cursor className={className} aria-hidden="true" />;
}

const CENTER: Record<PaneId, [number, number]> = {
  claude: [25, 25],
  codex: [75, 25],
  conductor: [25, 75],
  maya: [75, 75],
};

const FLIGHT_MS = 800;

export type Spotlight = 'direct' | 'tools' | 'teammates' | 'search' | null;

export function Workspace({
  elapsed,
  focus,
  spotlight = null,
  flights = true,
  activeOverride,
}: {
  elapsed: number;
  focus?: PaneId[];
  spotlight?: Spotlight;
  flights?: boolean;
  activeOverride?: PaneId;
}) {
  const visible = SCRIPT.filter((line) => line.t <= elapsed);
  const latest = visible.filter((line) => line.t > 0).pop();
  const searchHit = elapsed >= MAYA_MATCH.start && elapsed < MAYA_MATCH.end;
  const active: PaneId = activeOverride ?? (searchHit ? 'claude' : latest?.pane ?? 'claude');
  const inFlight = flights
    ? visible.filter((line) => line.kind === 'send' && elapsed - line.t < FLIGHT_MS)
    : [];
  const receiving = new Set(
    SCRIPT.filter((line) => line.kind === 'receive' && line.t <= elapsed && elapsed - line.t < 1400).map(
      (line) => line.pane,
    ),
  );
  const sentCount = visible.filter((line) => line.kind === 'send').length;

  return (
    <div className={s.window} data-spotlight={spotlight ?? undefined}>
      <div className={s.titleBar}>
        <span className={s.lights} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={s.titleText}>
          <RelayMark className={s.titleMark} />
          acme · fix/reconnect-gap
        </span>
        <span className={s.titleSearch} data-on={searchHit || spotlight === 'search' ? 'true' : undefined}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Search team sessions
          <kbd>⌘K</kbd>
        </span>
      </div>

      <div className={s.windowBody}>
        <aside className={s.rail} aria-hidden="true">
          <p className={s.railLabel}>Agents</p>
          {PANES.filter((p) => p.owner === 'You').map((pane) => (
            <div className={s.railItem} data-active={active === pane.id ? 'true' : undefined} key={pane.id}>
              <ToolIcon pane={pane.id} className={s.railIcon} />
              <span>{PANE_NAME[pane.id]}</span>
              <i className={s.presence} />
            </div>
          ))}
          <p className={s.railLabel}>Team</p>
          <div
            className={s.railItem}
            data-active={active === 'maya' || searchHit ? 'true' : undefined}
            data-team="true"
          >
            <span className={s.avatar}>M</span>
            <span>Maya</span>
            <i className={s.presence} data-idle="true" />
          </div>
          <div className={s.railItem} data-team="true">
            <span className={s.avatar} data-alt="true">
              J
            </span>
            <span>Jon</span>
            <i className={s.presence} />
          </div>
          <div className={s.railFoot}>
            <span className={s.railStat}>
              <b>{sentCount}</b> agent messages
            </span>
            <span className={s.railStat}>
              <b>0</b> pasted by you
            </span>
          </div>
        </aside>

        <div className={s.tabs} aria-hidden="true">
          {PANES.map((pane) => (
            <span
              className={s.tab}
              data-active={active === pane.id ? 'true' : undefined}
              data-ping={receiving.has(pane.id) ? 'true' : undefined}
              key={pane.id}
            >
              <ToolIcon pane={pane.id} className={s.tabIcon} />
              {pane.owner === 'You' ? pane.tool : pane.owner}
            </span>
          ))}
        </div>

        <div className={s.grid}>
          {PANES.map((pane) => (
            <Pane
              active={active === pane.id}
              dim={Boolean(focus && !focus.includes(pane.id))}
              elapsed={elapsed}
              key={pane.id}
              lines={visible.filter((line) => line.pane === pane.id)}
              pane={pane.id}
              receiving={receiving.has(pane.id)}
              searchHit={searchHit}
              spotlight={spotlight}
            />
          ))}

          {inFlight.map((line) =>
            line.kind === 'send' ? (
              <span
                className={s.flight}
                key={line.id}
                style={
                  {
                    '--x0': `${CENTER[line.pane][0]}%`,
                    '--y0': `${CENTER[line.pane][1]}%`,
                    '--x1': `${CENTER[line.to][0]}%`,
                    '--y1': `${CENTER[line.to][1]}%`,
                  } as CSSProperties
                }
              >
                <RelayMark className={s.flightMark} />@{PANE_NAME[line.to]}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}

function Pane({
  pane,
  lines,
  active,
  dim,
  elapsed,
  receiving,
  searchHit,
  spotlight,
}: {
  pane: PaneId;
  lines: ScriptLine[];
  active: boolean;
  dim: boolean;
  elapsed: number;
  receiving: boolean;
  searchHit: boolean;
  spotlight: Spotlight;
}) {
  const meta = PANES.find((p) => p.id === pane)!;
  return (
    <section
      className={s.pane}
      data-pane={pane}
      data-active={active ? 'true' : undefined}
      data-dim={dim ? 'true' : undefined}
      data-receiving={receiving ? 'true' : undefined}
    >
      <header className={s.paneHead}>
        <ToolIcon pane={pane} className={s.paneIcon} />
        <span className={s.paneTool}>{meta.tool}</span>
        <span className={s.paneWhere}>{meta.where}</span>
        <span className={s.paneOwner} data-team={meta.owner !== 'You' ? 'true' : undefined}>
          {meta.owner === 'You' ? 'you' : meta.owner.toLowerCase()}
        </span>
      </header>
      <div className={s.paneBody}>
        {pane === 'conductor' ? <ConductorBoard elapsed={elapsed} /> : null}
        {pane === 'maya' ? <MayaSession match={searchHit || spotlight === 'teammates'} /> : null}
        <div className={s.lines}>
          {lines.map((line) => (
            <Line key={line.id} line={line} pane={pane} />
          ))}
          {pane !== 'maya' && pane !== 'conductor' ? <span className={s.caret} aria-hidden="true" /> : null}
        </div>
      </div>
    </section>
  );
}

function Line({ line, pane }: { line: ScriptLine; pane: PaneId }): ReactNode {
  switch (line.kind) {
    case 'prompt':
      return (
        <p className={s.lPrompt}>
          <span className={s.chev}>&gt;</span>
          {line.text}
        </p>
      );
    case 'text':
      return (
        <p className={s.lText}>
          <span className={s.dot} data-pane={pane} />
          {line.text}
        </p>
      );
    case 'tool':
      return (
        <p className={s.lTool} data-mcp={line.name.includes('_') ? 'true' : undefined}>
          <span className={s.dot} data-pane={pane} />
          <b>{line.name}</b>({line.arg})
        </p>
      );
    case 'diff':
      return (
        <div className={s.lDiff}>
          <span className={s.diffFile}>ws-client.ts</span>
          {line.del ? <code data-kind="del">- {line.del}</code> : null}
          <code data-kind="add">+ {line.add}</code>
        </div>
      );
    case 'send':
      return (
        <div className={s.msg} data-dir="out">
          <span className={s.msgHead}>
            <RelayMark className={s.msgMark} />
            sendMessage → <b>@{PANE_NAME[line.to]}</b>
          </span>
          <span className={s.msgText}>{line.text}</span>
        </div>
      );
    case 'receive':
      return (
        <div className={s.msg} data-dir="in">
          <span className={s.msgHead}>
            <RelayMark className={s.msgMark} />
            from <b>@{PANE_NAME[line.from]}</b>
          </span>
          <span className={s.msgText}>{line.text}</span>
        </div>
      );
    case 'hit':
      return (
        <div className={s.hit}>
          <span className={s.hitHead}>
            <span className={s.avatar}>M</span>
            {line.who}
            <span className={s.hitWhen}>{line.when}</span>
            <span className={s.hitTag}>{line.tag}</span>
          </span>
          <span className={s.hitQuote}>{line.quote}</span>
        </div>
      );
    case 'ok':
      return (
        <p className={s.lOk}>
          <span aria-hidden="true">✓</span>
          {line.text}
        </p>
      );
  }
}

function ConductorBoard({ elapsed }: { elapsed: number }) {
  const running = elapsed >= CONDUCTOR_RUN.start && elapsed < CONDUCTOR_RUN.end;
  const done = elapsed >= CONDUCTOR_RUN.end;
  const progress = running ? (elapsed - CONDUCTOR_RUN.start) / (CONDUCTOR_RUN.end - CONDUCTOR_RUN.start) : done ? 1 : 0;
  const passed = Math.round(progress * 48);
  return (
    <ul className={s.board}>
      <li data-state={done ? 'done' : running ? 'running' : 'idle'}>
        <span className={s.branch}>fix/reconnect-gap</span>
        <span className={s.bar}>
          <i style={{ transform: `scaleX(${progress})` }} />
        </span>
        <span className={s.boardStatus}>{done ? '48/48 ✓' : running ? `${passed}/48` : 'idle'}</span>
      </li>
      <li data-state="review">
        <span className={s.branch}>usage-export</span>
        <span className={s.bar}>
          <i style={{ transform: 'scaleX(1)' }} />
        </span>
        <span className={s.boardStatus}>review</span>
      </li>
      <li data-state="idle">
        <span className={s.branch}>pricing-table</span>
        <span className={s.bar}>
          <i style={{ transform: 'scaleX(0.35)' }} />
        </span>
        <span className={s.boardStatus}>drafting</span>
      </li>
    </ul>
  );
}

function MayaSession({ match }: { match: boolean }) {
  return (
    <div className={s.maya}>
      <span className={s.syncBadge}>
        <i /> synced · yesterday 16:42
      </span>
      <p className={s.mayaPrompt}>
        <span className={s.avatar}>M</span>
        Why does gateway CPU spike right after deploys?
      </p>
      <p className={s.mayaText}>Every client reconnects at once. Retries have no jitter.</p>
      <div className={s.mayaDecision} data-match={match ? 'true' : undefined}>
        <span className={s.intent}>constraint</span>
        Cap reconnect backoff at 30s with full jitter. The gateway rate-limits reconnect storms.
      </div>
      <p className={s.mayaText}>Updated retry.ts and the gateway runbook.</p>
    </div>
  );
}
