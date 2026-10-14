import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowDownToLine,
  Check,
  CircleCheck,
  Columns3,
  CornerDownLeft,
  Monitor,
  Pause,
  Radio,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

import { AgentToolLogo } from '../AgentToolLogos';
import { Cursor, Grok, OpenCode } from '../brand-icons';
import { FadeIn } from '../FadeIn';
import landing from '../../app/landing.module.css';
import s from './desktop-app-shot.module.css';

type Upload = 'uploaded' | 'uploading' | 'local';

type Session = {
  title: string;
  source: 'claude' | 'codex';
  model: string;
  status: 'Active' | 'Finished' | 'Idle';
  project: string;
  updated: string;
  created: string;
  messages: boolean;
  upload: Upload;
  selected?: boolean;
};

const SOURCE_LABEL = { claude: 'Claude', codex: 'Codex' } as const;

const SESSIONS: Session[] = [
  {
    title: 'Terminal and GUI apps showcase',
    source: 'claude',
    model: 'claude-opus-5-5',
    status: 'Active',
    project: 'agentrelay.com',
    updated: '2 minutes ago',
    created: '6 hours ago',
    messages: true,
    upload: 'uploading',
  },
  {
    title: 'Add signup buttons to homepage',
    source: 'codex',
    model: 'gpt-6.1-sol',
    status: 'Active',
    project: 'agentrelay.com',
    updated: '7 minutes ago',
    created: '5 days ago',
    messages: true,
    upload: 'uploaded',
  },
  {
    title: 'View on web button for sessions',
    source: 'claude',
    model: 'claude-opus-5-5',
    status: 'Active',
    project: 'relay-desktop',
    updated: '3 hours ago',
    created: '8 hours ago',
    messages: true,
    upload: 'uploaded',
    selected: true,
  },
  {
    title: 'Fix stale Flows funnel docs',
    source: 'claude',
    model: 'claude-opus-5-5',
    status: 'Finished',
    project: 'cloud',
    updated: '4 hours ago',
    created: '6 hours ago',
    messages: false,
    upload: 'uploaded',
  },
  {
    title: 'Relayhistory integration for burn analysis',
    source: 'claude',
    model: 'claude-opus-5-5',
    status: 'Finished',
    project: 'burn',
    updated: '4 hours ago',
    created: '5 days ago',
    messages: false,
    upload: 'local',
  },
  {
    title: 'Clarify auto-review sessions',
    source: 'codex',
    model: 'gpt-6-astra · high reasoning',
    status: 'Idle',
    project: 'cloud',
    updated: '5 hours ago',
    created: '9 hours ago',
    messages: false,
    upload: 'local',
  },
];

function UploadCell({ upload }: { upload: Upload }) {
  if (upload === 'uploaded') {
    return (
      <span className={`${s.upload} ${s.uploaded}`}>
        <CircleCheck size={15} strokeWidth={1.8} aria-hidden />
        Uploaded
      </span>
    );
  }

  if (upload === 'uploading') {
    return (
      <span className={`${s.upload} ${s.uploading}`}>
        <RefreshCw className={s.spin} size={15} strokeWidth={1.8} aria-hidden />
        Uploading
        <span className={s.uploadBar} />
      </span>
    );
  }

  return (
    <span className={s.upload}>
      <Monitor size={15} strokeWidth={1.6} aria-hidden />
      Local only
    </span>
  );
}

function MuseMark() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" aria-hidden="true">
      <path
        d="M6.5 7.5C3.8 7.5 2.5 10 2.5 12.3S3.9 16.5 6.2 16.5c2.6 0 4.2-3.2 5.8-5.6 1.6-2.4 3.1-3.4 5-3.4 2.6 0 4.5 2.2 4.5 4.8s-1.7 4.2-3.9 4.2c-2.3 0-3.9-3.1-5.6-5.6C10.9 8.6 9 7.5 6.5 7.5Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

const HARNESSES: { label: string; key: string; icon: ReactNode; checked?: boolean }[] = [
  {
    label: 'Claude',
    key: 'claude',
    icon: <AgentToolLogo className={s.harnessLogo} idPrefix="search-claude" provider="claude" />,
  },
  {
    label: 'Codex',
    key: 'codex',
    icon: <AgentToolLogo className={s.harnessLogo} idPrefix="search-codex" provider="codex" />,
    checked: true,
  },
  { label: 'Cursor', key: 'cursor', icon: <Cursor size={18} /> },
  { label: 'Grok', key: 'grok', icon: <Grok size={18} /> },
  { label: 'Muse', key: 'muse', icon: <MuseMark /> },
  { label: 'OpenCode', key: 'opencode', icon: <OpenCode size={18} /> },
];

/** The search palette: filter by harness, status or date with typed syntax. */
function SearchPalette() {
  return (
    <div className={s.palette}>
      <span className={s.paletteInput}>
        <Search size={14} strokeWidth={2} aria-hidden />
        <span className={s.query}>harness:codex updated:&gt;=2026-10-08</span>
        <span className={s.caret} />
        <X className={s.paletteClose} size={14} strokeWidth={2} aria-hidden />
      </span>
      <span className={s.paletteAction}>
        <Search size={13} strokeWidth={2} aria-hidden />
        Search loaded sessions
        <CornerDownLeft size={12} strokeWidth={2} aria-hidden />
      </span>
      <span className={s.paletteHeading}>Harnesses</span>
      {HARNESSES.map((harness, index) => (
        <span
          className={`${s.paletteOption}${index === 0 ? ` ${s.paletteOptionActive}` : ''}`}
          key={harness.key}
        >
          <span className={s.harnessIcon}>{harness.icon}</span>
          {harness.label}
          <code>harness:{harness.key}</code>
          {harness.checked ? (
            <span className={s.paletteCheck}>
              <Check size={10} strokeWidth={3} aria-hidden />
            </span>
          ) : null}
        </span>
      ))}
      <span className={s.paletteHeading}>Status</span>
      <span className={s.paletteOption}>
        <span className={s.statusFilled} />
        Active
        <code>is:active</code>
      </span>
      <span className={s.paletteFooter}>
        <span className={s.paletteTips}>Search syntax tips</span>
        <span className={s.paletteKeys}>↑↓ navigate · → select · ↵ choose &amp; search</span>
      </span>
    </div>
  );
}

/**
 * Agent Relay Desktop's sessions window as it ships: every local Claude Code
 * and Codex session with its status, whether it takes messages from the
 * relay, and whether it uploads to the workspace.
 */
function SessionsShot({ searching = false }: { searching?: boolean }) {
  return (
    <div
      className={`${s.window}${searching ? ` ${s.searching}` : ''}`}
      role="img"
      aria-label={
        searching
          ? 'Agent Relay Desktop: searching sessions by harness, status and date'
          : 'Agent Relay Desktop: local Claude Code and Codex sessions with message and upload status'
      }
    >
      <div className={s.titleBar}>
        <span />
        <span />
        <span />
      </div>
      <header className={s.header}>
        <img className={s.wordmark} src="/agent-relay-logo-white.svg" alt="" width={124} height={22} />
        <span className={s.search}>
          <Search size={14} strokeWidth={2} aria-hidden />
          Search or filter sessions…
          <kbd>/</kbd>
        </span>
        <Columns3 className={s.headerIcon} size={18} strokeWidth={1.6} aria-hidden />
        <span className={s.avatar}>
          <img src="/authors/will-128.webp" alt="" width={28} height={28} />
        </span>
      </header>

      <div className={s.table}>
        <span className={`${s.row} ${s.head}`}>
          <span className={s.check} />
          <span className={s.colSession}>Session</span>
          <span>Status</span>
          <span className={s.colProject}>Project</span>
          <span className={s.colUpdated}>
            Updated <ArrowDown size={11} strokeWidth={2.2} aria-hidden />
          </span>
          <span className={s.colMessages}>Messages</span>
          <span className={s.colCreated}>Created</span>
          <span className={s.colUpload}>Upload</span>
        </span>
        {SESSIONS.map((session) => (
          <span
            className={`${s.row}${session.selected ? ` ${s.selected}` : ''}`}
            key={session.title}
          >
            <span className={s.check} />
            <span className={s.colSession}>
              <span className={`${s.agentIcon} ${s[session.source]}`}>
                <AgentToolLogo
                  className={s.agentLogo}
                  idPrefix={`desktop-${session.title}`}
                  provider={session.source}
                />
              </span>
              <span className={s.sessionText}>
                <b>{session.title}</b>
                <span>
                  {session.model} · {SOURCE_LABEL[session.source]}
                </span>
              </span>
            </span>
            <span>{session.status}</span>
            <span className={s.colProject}>{session.project}</span>
            <span className={s.colUpdated}>{session.updated}</span>
            <span className={s.colMessages}>
              <span className={`${s.messages}${session.messages ? ` ${s.messagesOn}` : ''}`}>
                <span className={s.messagesDot} />
                {session.messages ? 'On' : 'Off'}
              </span>
            </span>
            <span className={s.colCreated}>{session.created}</span>
            <span className={s.colUpload}>
              <UploadCell upload={session.upload} />
            </span>
          </span>
        ))}
      </div>

      {searching ? <SearchPalette /> : null}

      <footer className={s.statusBar}>
        <span className={s.statusLeft}>
          <span className={s.uploadingDot} />
          Uploading 1 session
          <span className={s.statusMuted}>1,000 sessions on this machine</span>
          <ArrowDownToLine size={12} strokeWidth={2} aria-hidden />
          <Pause size={11} strokeWidth={2.4} aria-hidden />
        </span>
        <span className={s.statusRight}>
          <Radio size={13} strokeWidth={1.8} aria-hidden />
          Live Agents on Relay: 3
        </span>
      </footer>
    </div>
  );
}

export function DesktopSessionsFeature() {
  return (
    <FadeIn direction="up" delay={180} className={`${landing.featureCol} ${landing.desktopSessionsFeature}`}>
      <div className={landing.featureCopy}>
        <h3 className={landing.featureTitle}>Your sessions, shared with your team</h3>
        <ul className={landing.featureList}>
          <li>
            Agent Relay Desktop finds every local Claude Code and Codex session and shows what each one is
            doing.
          </li>
          <li>Turn on messages to let your teammates&apos; agents reach a session over the relay.</li>
          <li>Choose which sessions upload to your workspace. The rest stay local only.</li>
          <li>No terminal required: install the app, sign in with Google, done.</li>
        </ul>
      </div>
      <div className={s.preview}>
        <SessionsShot />
      </div>
    </FadeIn>
  );
}

export function DesktopSearchFeature() {
  return (
    <FadeIn direction="up" delay={120} className={`${landing.featureCol} ${landing.desktopSearchFeature}`}>
      <div className={`${s.preview} ${s.searchPreview}`}>
        <SessionsShot searching />
      </div>
      <div className={landing.featureCopy}>
        <h3 className={landing.featureTitle}>Find any session, from any tool</h3>
        <ul className={landing.featureList}>
          <li>Claude, Codex, Cursor, Grok, Muse and OpenCode sessions land in one list.</li>
          <li>Filter by harness, status or date as you type, like harness:codex updated:&gt;=2026-10-08.</li>
          <li>Open the session you need instead of digging through terminals and chat history.</li>
        </ul>
      </div>
    </FadeIn>
  );
}
