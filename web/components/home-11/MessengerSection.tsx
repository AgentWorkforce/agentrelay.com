import type { ReactNode } from 'react';

import { OpenAILogo } from '../AgentToolLogos';
import { ClaudeCodeColor, Cursor, Grok, MuseColor, OpenCode } from '../brand-icons';
import landing from '../../app/landing.module.css';
import s from './messenger-section.module.css';

type Upload = 'uploaded' | 'syncing' | 'local';

const PEOPLE = {
  Will: '/authors/will-128.webp',
  Khaliq: '/authors/khaliq-128.webp',
  Mary: '/authors/mary-128.webp',
  Ingrid: '/authors/ingrid-128.webp',
} as const;

/** Sessions from across the team: whose they are, which harness, and what it is doing right now. */
const SESSIONS: {
  person: keyof typeof PEOPLE;
  harness: string;
  icon: ReactNode;
  title: string;
  active: boolean;
  upload: Upload;
  updated: string;
}[] = [
  { person: 'Will', harness: 'Claude Code', icon: <ClaudeCodeColor />, title: 'Fix reconnect backoff', active: true, upload: 'uploaded', updated: 'just now' },
  { person: 'Khaliq', harness: 'Codex', icon: <OpenAILogo />, title: 'Migrate billing to cents', active: true, upload: 'uploaded', updated: '1 min ago' },
  { person: 'Mary', harness: 'Cursor', icon: <Cursor />, title: 'Checkout form polish', active: true, upload: 'syncing', updated: '2 min ago' },
  { person: 'Ingrid', harness: 'Grok', icon: <Grok />, title: 'Index the thread history', active: false, upload: 'uploaded', updated: '1 hour ago' },
  { person: 'Will', harness: 'Muse', icon: <MuseColor />, title: 'Draft the release notes', active: true, upload: 'uploaded', updated: '6 min ago' },
  { person: 'Khaliq', harness: 'OpenCode', icon: <OpenCode />, title: 'Spike the CLI rewrite', active: false, upload: 'local', updated: '3 hours ago' },
];

const UPLOAD_LABEL: Record<Upload, string> = { uploaded: 'Uploaded', syncing: 'Syncing', local: 'Local only' };

function UploadIcon({ upload }: { upload: Upload }) {
  if (upload === 'local') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2" y="3" width="12" height="8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6 13.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M4.5 12.5a3 3 0 0 1-.4-6A4 4 0 0 1 11.8 6a3.2 3.2 0 0 1 .2 6.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {upload === 'uploaded' ? (
        <path d="m6.2 9.2 1.4 1.4 2.4-2.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      ) : (
        <path d="M8 11V7.6m0 0L6.6 9M8 7.6 9.4 9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** The Agent Relay desktop app's sessions list, zoomed in: every agent online, and whether its session is uploaded. */
function SessionsWindow() {
  return (
    <div className={s.window} aria-hidden="true">
      <div className={s.titlebar}>
        <span className={s.lights}>
          <i />
          <i />
          <i />
        </span>
        <span className={s.search}>
          <svg viewBox="0 0 16 16">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Search sessions
        </span>
      </div>

      <div className={s.head}>
        <span>Session</span>
        <span className={s.status}>Status</span>
        <span>Upload</span>
        <span className={s.updated}>Updated</span>
      </div>

      {SESSIONS.map((session) => (
        <div className={s.row} key={session.title}>
          <span className={s.session}>
            <span className={s.who}>
              <img className={s.avatar} src={PEOPLE[session.person]} alt="" />
              <span className={s.harness}>{session.icon}</span>
            </span>
            <span>
              <b>{session.title}</b>
              <small>
                {session.person} · {session.harness}
              </small>
            </span>
          </span>
          <span className={s.status} data-active={session.active || undefined}>
            <i />
            {session.active ? 'Active' : 'Idle'}
          </span>
          <span className={s.upload} data-upload={session.upload}>
            <UploadIcon upload={session.upload} />
            {UPLOAD_LABEL[session.upload]}
          </span>
          <span className={s.updated}>{session.updated}</span>
        </div>
      ))}

      <div className={s.footer}>
        <span>
          <i className={s.connected} /> Connected · 87 sessions on this machine
        </span>
        <span>Live agents on Relay: 6</span>
      </div>
    </div>
  );
}

export function MessengerSection() {
  return (
    <div className={landing.featuresWrapper}>
      <section className={`${landing.featuresSection} ${s.section}`} aria-labelledby="messenger-title">
        <div className={landing.featureCopy}>
          <h2 id="messenger-title" className={landing.featureTitle}>
            Stop redoing each other’s work
          </h2>
          <ul className={landing.featureList}>
            <li>See every teammate’s sessions live: who’s on it, in which agent, doing what.</li>
            <li>Spot overlap before you start, not at standup.</li>
            <li>Pick up where a teammate left off, with their full context.</li>
          </ul>
        </div>
        <div className={s.stage}>
          <div className={landing.previewAccent} />
          <SessionsWindow />
        </div>
      </section>
    </div>
  );
}
