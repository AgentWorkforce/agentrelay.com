import { AgentToolLogo } from '../AgentToolLogos';
import type { TerminalStyle } from './HeroTerminalMarquee';
import s from '../../app/landing.module.css';

type DesktopApp = 'conductor' | 'claude' | 'codex';

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
};

function ConductorMark() {
  return (
    <svg className={s.heroAppMark} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M1 1h10v3H4v4h7v3H1z" fill="currentColor" />
    </svg>
  );
}

function AppMark({ app, idPrefix }: { app: DesktopApp; idPrefix: string }) {
  if (app === 'conductor') return <ConductorMark />;
  return <AgentToolLogo className={s.heroAppMark} idPrefix={idPrefix} provider={app} />;
}

function cycleLine(delay: string): TerminalStyle {
  return { '--line-delay': delay };
}

function Sidebar({ card }: { card: AppWindowCard }) {
  const heading = card.app === 'conductor' ? 'Workspaces' : 'Recents';

  return (
    <aside className={s.heroAppSidebar}>
      {card.app === 'claude' ? (
        <span className={s.heroAppNav}>
          <span className={s.heroAppNavIcon}>+</span>New session
        </span>
      ) : card.app === 'codex' ? (
        <span className={s.heroAppNav}>
          <span className={s.heroAppNavIcon}>✎</span>New chat
        </span>
      ) : (
        <span className={s.heroAppNav}>
          <span className={s.heroAppNavIcon}>⌂</span>Home
        </span>
      )}
      <span className={s.heroAppSidebarHeading}>{heading}</span>
      {card.sessions.map((session, index) => (
        <span
          className={`${s.heroAppSession}${index === 0 ? ` ${s.heroAppSessionActive}` : ''}`}
          key={session}
        >
          <span className={s.heroAppSessionLabel}>{session}</span>
          {card.app === 'codex' && index > 0 && index < 3 ? (
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

function Thread({ card }: { card: AppWindowCard }) {
  return (
    <div className={s.heroAppThread}>
      <span className={s.heroAppCrumb}>
        <b>{card.repo}</b>
        <span>/</span>
        {card.title}
      </span>
      <span className={`${s.heroAppAsk} ${s.heroAppCycleLine}`} style={cycleLine('0s')}>
        {card.ask}
      </span>
      <span className={`${s.heroAppReply} ${s.heroAppCycleLine}`} style={cycleLine('0.45s')}>
        {card.reply}
      </span>
      <span className={`${s.heroAppTools} ${s.heroAppCycleLine}`} style={cycleLine('0.85s')}>
        {card.app === 'codex' ? 'Ran 4 commands, edited 2 files' : 'Read 3 files · 5 tool calls'} ›
      </span>
      <span className={`${s.heroAppRelay} ${s.heroAppCycleLine}`} style={cycleLine('1.2s')}>
        <span className={s.heroAppRelayDot} />
        {card.relay}
      </span>
      {card.app === 'conductor' ? null : (
        <span className={s.heroAppComposer}>
          <span className={s.heroAppComposerHint}>
            {card.app === 'claude' ? 'Describe a task or ask a question' : 'Ask Codex anything'}
          </span>
          <span className={s.heroAppComposerModel}>
            {card.app === 'claude' ? 'Fable 5 · Extra high' : 'high'}
          </span>
          <span className={s.heroAppSend}>↑</span>
        </span>
      )}
    </div>
  );
}

/**
 * A desktop agent app window: Conductor's workspaces-plus-diff layout, the
 * Claude app's sidebar-and-thread, or the Codex app's icon rail and thread.
 * Sits in the same rows as the terminal cards so the band reads as every
 * surface agents run in, CLI and GUI, all on one relay.
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
        <span className={s.heroAppBadge}>App</span>
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
