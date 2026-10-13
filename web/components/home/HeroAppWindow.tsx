import { AgentToolLogo } from '../AgentToolLogos';
import type { TerminalStyle } from './HeroTerminalMarquee';
import s from '../../app/landing.module.css';

type DesktopApp = 'conductor' | 'claude' | 'codex' | 'devin' | 'paseo';

export type AppWindowCard = {
  kind: 'app';
  /** Which desktop app's window this is; drives the chrome and layout. */
  app: DesktopApp;
  repo: string;
  /** Session or thread title shown in the window. */
  title: string;
  /** What the human asked for, as a chat bubble. */
  ask: string;
  /** The agent's reply, then the relay hop that ties it to the rest of the band. */
  reply: string;
  relay: string;
  /** Sidebar rows; the first is the open session. */
  sessions: string[];
};

export const APP_META: Record<DesktopApp, { cycle: string; label: string }> = {
  conductor: { cycle: '8.4s', label: 'Conductor' },
  claude: { cycle: '8.1s', label: 'Claude' },
  codex: { cycle: '7.9s', label: 'Codex' },
  devin: { cycle: '8.6s', label: 'Devin' },
  paseo: { cycle: '8.2s', label: 'Paseo' },
};

const SIDEBAR_NAV: Record<DesktopApp, { icon: string; label: string; heading: string }> = {
  conductor: { icon: '⌂', label: 'Home', heading: 'Workspaces' },
  claude: { icon: '+', label: 'New session', heading: 'Recents' },
  codex: { icon: '✎', label: 'New chat', heading: 'Recents' },
  devin: { icon: '+', label: 'New session', heading: 'Sessions' },
  paseo: { icon: '+', label: 'New', heading: 'Ready to review' },
};

const TOOL_SUMMARY: Record<DesktopApp, string> = {
  conductor: 'Read 3 files · 5 tool calls',
  claude: 'Read 3 files · 5 tool calls',
  codex: 'Ran 4 commands, edited 2 files',
  devin: 'Tested in the browser · 5 tests passed',
  paseo: 'Worked for 4m 12s · 2 subagents',
};

function ConductorMark() {
  return (
    <svg className={s.heroAppMark} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M1 1h10v3H4v4h7v3H1z" fill="currentColor" />
    </svg>
  );
}

function DevinMark() {
  return (
    <svg className={s.heroAppMark} viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="3.4" cy="3.4" r="2.2" fill="currentColor" />
      <circle cx="8.6" cy="3.4" r="2.2" fill="currentColor" />
      <circle cx="6" cy="8.4" r="2.6" fill="currentColor" />
    </svg>
  );
}

function PaseoMark() {
  return (
    <svg className={s.heroAppMark} viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M2 10.5V4.2a3 3 0 0 1 6 0v1.4h1.6a1.6 1.6 0 0 1 0 3.2H5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function AppMark({ app, idPrefix }: { app: DesktopApp; idPrefix: string }) {
  if (app === 'conductor') return <ConductorMark />;
  if (app === 'devin') return <DevinMark />;
  if (app === 'paseo') return <PaseoMark />;
  return <AgentToolLogo className={s.heroAppMark} idPrefix={idPrefix} provider={app} />;
}

function cycleLine(delay: string): TerminalStyle {
  return { '--line-delay': delay };
}

function Sidebar({ card }: { card: AppWindowCard }) {
  const nav = SIDEBAR_NAV[card.app];

  return (
    <aside className={s.heroAppSidebar}>
      <span className={s.heroAppNav}>
        <span className={s.heroAppNavIcon}>{nav.icon}</span>
        {nav.label}
      </span>
      <span className={s.heroAppSidebarHeading}>{nav.heading}</span>
      {card.sessions.map((session, index) => (
        <span
          className={`${s.heroAppSession}${index === 0 ? ` ${s.heroAppSessionActive}` : ''}`}
          key={session}
        >
          {card.app === 'paseo' ? (
            <span className={index < 2 ? s.heroAppStatusReview : s.heroAppStatusWorking} />
          ) : null}
          <span className={s.heroAppSessionLabel}>{session}</span>
          {(card.app === 'codex' || card.app === 'devin') && index > 0 && index < 3 ? (
            <span className={s.heroAppUnread} />
          ) : null}
          {card.app === 'conductor' && index === 0 ? (
            <span className={s.heroAppSessionMeta}>2m</span>
          ) : null}
        </span>
      ))}
    </aside>
  );
}

function ConductorChanges({ card }: { card: AppWindowCard }) {
  const files = [
    ['retry.ts', '+42', '−8'],
    ['socket.ts', '+17', '−3'],
    ['retry.test.ts', '+61', '−0'],
  ];

  return (
    <aside className={s.heroAppChanges}>
      <span className={s.heroAppMergeRow}>
        <span className={s.heroAppReady}>✓ Ready</span>
        <span className={s.heroAppMerge}>Merge</span>
      </span>
      <span className={s.heroAppChangesTabs}>
        <b>Changes 3</b>
        <span>Checks</span>
      </span>
      {files.map(([file, add, del]) => (
        <span className={s.heroAppFile} key={file}>
          <span className={s.heroAppFileName}>
            {card.repo.split('/')[1]}/{file}
          </span>
          <span className={s.heroAppAdd}>{add}</span>
          <span className={s.heroAppDel}>{del}</span>
        </span>
      ))}
    </aside>
  );
}

function ThreadHeader({ card }: { card: AppWindowCard }) {
  if (card.app === 'paseo') {
    return (
      <span className={s.heroAppTabs}>
        <b>Codex</b>
        <span>Claude Code</span>
        <span>npm run dev</span>
      </span>
    );
  }

  return (
    <span className={s.heroAppCrumb}>
      <b>{card.repo}</b>
      <span>/</span>
      {card.title}
    </span>
  );
}

function Composer({ card }: { card: AppWindowCard }) {
  if (card.app === 'conductor' || card.app === 'paseo') return null;

  const hint =
    card.app === 'claude'
      ? 'Describe a task or ask a question'
      : card.app === 'devin'
        ? 'Reply to Devin'
        : 'Ask Codex anything';
  const model = card.app === 'claude' ? 'Fable 5 · Extra high' : card.app === 'devin' ? '' : 'high';

  return (
    <span className={s.heroAppComposer}>
      <span className={s.heroAppComposerHint}>{hint}</span>
      {model ? <span className={s.heroAppComposerModel}>{model}</span> : null}
      <span className={s.heroAppSend}>↑</span>
    </span>
  );
}

function Thread({ card }: { card: AppWindowCard }) {
  return (
    <div className={s.heroAppThread}>
      <ThreadHeader card={card} />
      <span className={`${s.heroAppAsk} ${s.heroAppCycleLine}`} style={cycleLine('0s')}>
        {card.ask}
      </span>
      <span className={`${s.heroAppReply} ${s.heroAppCycleLine}`} style={cycleLine('0.45s')}>
        {card.app === 'devin' ? <b className={s.heroAppSpeaker}>Devin</b> : null}
        {card.reply}
      </span>
      <span className={`${s.heroAppTools} ${s.heroAppCycleLine}`} style={cycleLine('0.85s')}>
        {TOOL_SUMMARY[card.app]} ›
      </span>
      <span className={`${s.heroAppRelay} ${s.heroAppCycleLine}`} style={cycleLine('1.2s')}>
        <span className={s.heroAppRelayDot} />
        {card.relay}
      </span>
      <Composer card={card} />
    </div>
  );
}

/**
 * A desktop agent app window: Conductor's workspaces-plus-diff layout, Devin's
 * sessions view, Paseo's status-grouped workspaces with agent tabs, or
 * the Claude and Codex apps' sidebar-and-thread. Sits in the same rows as the
 * terminal cards so the band reads as every surface agents run in, CLI and
 * GUI, all on one relay.
 */
export function HeroAppWindow({
  card,
  idPrefix,
  style,
}: {
  card: AppWindowCard;
  idPrefix: string;
  style?: TerminalStyle;
}) {
  const meta = APP_META[card.app];

  return (
    <article className={s.heroApp} data-app={card.app} style={style}>
      <header className={s.heroAppBar}>
        <span className={s.heroTermTraffic}>
          <span />
          <span />
          <span />
        </span>
        <span className={s.heroAppToolbar}>
          <span className={s.heroAppToolbarIcon} />
          <span className={s.heroAppToolbarIcon} />
        </span>
        <span className={s.heroAppTitle}>
          <AppMark app={card.app} idPrefix={idPrefix} />
          {meta.label}
        </span>
      </header>
      <div className={s.heroAppBody}>
        {card.app === 'codex' ? (
          <span className={s.heroAppRail}>
            <span />
            <span />
            <span />
            <span />
          </span>
        ) : null}
        <Sidebar card={card} />
        <Thread card={card} />
        {card.app === 'conductor' ? <ConductorChanges card={card} /> : null}
      </div>
    </article>
  );
}
