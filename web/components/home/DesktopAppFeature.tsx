import { ArrowDown, ArrowDownToLine, CircleCheck, Columns3, Monitor, Pause, Radio, RefreshCw, Search } from 'lucide-react';

import { AgentToolLogo } from '../AgentToolLogos';
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

/**
 * Agent Relay Desktop's sessions window as it ships: every local Claude Code
 * and Codex session with its status, whether it takes messages from the
 * relay, and whether it uploads to the workspace.
 */
function SessionsShot() {
  return (
    <div
      className={s.window}
      role="img"
      aria-label="Agent Relay Desktop: local Claude Code and Codex sessions with message and upload status"
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
