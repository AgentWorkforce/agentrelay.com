import type { ReactNode } from 'react';
import {
  Check,
  CircleCheck,
  CircleUserRound,
  HardDrive,
  Inbox,
  LayoutGrid,
  Moon,
  Pause,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  SquarePen,
  Users,
} from 'lucide-react';

import { AgentToolLogo } from '../AgentToolLogos';
import { FadeIn } from '../FadeIn';
import landing from '../../app/landing.module.css';
import s from './desktop-app-shot.module.css';

type View = 'me' | 'team';

type NavItem = {
  icon: ReactNode;
  label: string;
  count: number;
  live?: boolean;
  active?: boolean;
};

type UploadState = 'uploaded' | 'uploading' | 'off';

type Session = {
  title: string;
  source: 'claude' | 'codex';
  state: UploadState;
};

type TeamAgent = { handle: string; machine: string; task: string };

type Teammate = { initials: string; name: string; agents: TeamAgent[] };

const ICON = { size: 13, strokeWidth: 1.8, 'aria-hidden': true } as const;

const SESSIONS: Session[] = [
  { title: 'Fix flaky upload tests', source: 'codex', state: 'uploaded' },
  { title: 'Docs: workspace layout', source: 'claude', state: 'uploading' },
  { title: 'Broker reconnect backoff', source: 'claude', state: 'uploaded' },
  { title: 'Spike: team roster', source: 'codex', state: 'off' },
];

const TEAM: Teammate[] = [
  {
    initials: 'GH',
    name: 'Grace Hopper',
    agents: [
      { handle: 'api-review', machine: 'h_grace-mbp', task: 'Reviewing the cast API PR' },
      { handle: 'billing', machine: 'h_grace-mbp', task: 'Stripe webhook retries' },
    ],
  },
  {
    initials: 'LT',
    name: 'Linus Torvalds',
    agents: [{ handle: 'ios-shell', machine: 'h_linus-mbp', task: 'Swift SDK sample app' }],
  },
  { initials: 'KJ', name: 'Katherine Johnson', agents: [] },
];

const SOURCE_LABEL = { claude: 'Claude', codex: 'Codex' } as const;

function Rail({ view }: { view: View }) {
  return (
    <nav className={s.rail}>
      <img className={s.railMark} src="/favicon.svg" alt="" width={18} height={18} />
      <span className={`${s.railItem}${view === 'me' ? ` ${s.railItemActive}` : ''}`}>
        <CircleUserRound size={16} strokeWidth={1.7} aria-hidden />
        Me
      </span>
      <span className={`${s.railItem}${view === 'team' ? ` ${s.railItemActive}` : ''}`}>
        <Users size={16} strokeWidth={1.7} aria-hidden />
        Team
      </span>
      <span className={`${s.railItem} ${s.railSettings}`}>
        <Settings size={15} strokeWidth={1.7} aria-hidden />
      </span>
      <span className={s.railAvatar}>AL</span>
    </nav>
  );
}

function Sidebar({ groups }: { groups: { heading: string; items: NavItem[] }[] }) {
  return (
    <aside className={s.sidebar}>
      <div className={s.workspace}>
        <span className={s.workspaceIcon}>A</span>
        <span>
          <b>Acme</b>
          <span className={s.connected}>Connected</span>
        </span>
      </div>
      {groups.map((group) => (
        <div className={s.navGroup} key={group.heading}>
          <span className={s.navHeading}>{group.heading}</span>
          {group.items.map((item) => (
            <span
              className={`${s.navItem}${item.active ? ` ${s.navItemActive}` : ''}`}
              key={item.label}
            >
              {item.icon}
              <span className={s.navLabel}>{item.label}</span>
              <span className={s.navCount}>
                {item.live ? <span className={s.liveDot} /> : null}
                {item.count}
              </span>
            </span>
          ))}
        </div>
      ))}
    </aside>
  );
}

function StatusBar({ left }: { left: ReactNode }) {
  return (
    <footer className={s.statusBar}>
      {left}
      <span className={s.statusRight}>
        <Radio size={12} strokeWidth={1.8} aria-hidden />3 on the relay
      </span>
    </footer>
  );
}

function Window({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className={s.window} aria-label={label} role="img">
      <div className={s.titleBar}>
        <span />
        <span />
        <span />
      </div>
      {children}
    </div>
  );
}

function StatusPill({ state }: { state: UploadState }) {
  if (state === 'uploaded') {
    return (
      <span className={`${s.pill} ${s.pillUploaded}`}>
        <CircleCheck size={11} strokeWidth={2.2} aria-hidden />
        Uploaded
      </span>
    );
  }

  if (state === 'uploading') {
    return (
      <span className={`${s.pill} ${s.pillUploading}`}>
        <RefreshCw className={s.spin} size={11} strokeWidth={2.2} aria-hidden />
        Uploading
        <span className={s.pillProgress} />
      </span>
    );
  }

  return (
    <span className={`${s.pill} ${s.pillOff}`}>
      <HardDrive size={11} strokeWidth={2} aria-hidden />
      Not uploading
    </span>
  );
}

function SessionsShot() {
  return (
    <Window label="Agent Relay Desktop: My sessions, uploading one session to the workspace">
      <div className={s.app}>
        <Rail view="me" />
        <Sidebar
          groups={[
            {
              heading: 'Agents',
              items: [
                { icon: <LayoutGrid {...ICON} />, label: 'All agents', count: 4 },
                { icon: <Radio {...ICON} />, label: 'On the relay', count: 2, live: true },
                { icon: <Moon {...ICON} />, label: 'Not on the relay', count: 2 },
              ],
            },
            {
              heading: 'Sessions',
              items: [
                { icon: <Inbox {...ICON} />, label: 'All sessions', count: 4, active: true },
                { icon: <RefreshCw {...ICON} />, label: 'In progress', count: 1 },
                { icon: <CircleCheck {...ICON} />, label: 'Uploaded', count: 2 },
                { icon: <HardDrive {...ICON} />, label: 'Not uploading', count: 1 },
              ],
            },
          ]}
        />
        <main className={s.main}>
          <header className={s.mainHeader}>
            <span>
              <b>My sessions</b>
              <span>Your local coding history and what&apos;s shared with your workspace.</span>
            </span>
            <span className={s.search}>
              <Search size={12} strokeWidth={2} aria-hidden />
              Search sessions
            </span>
          </header>

          <section className={s.pipeline}>
            <span className={s.pipelineTitle}>
              <RefreshCw className={s.spin} size={15} strokeWidth={2} aria-hidden />
              <b>Uploading 1 session</b>
              <span className={s.enabled}>3 sessions enabled</span>
            </span>
            <span className={s.step}>
              <span className={s.stepDone}>
                <Check size={9} strokeWidth={3} aria-hidden />
              </span>
              <b>Reading sessions</b>
              <span>4 sessions loaded</span>
            </span>
            <span className={s.step}>
              <span className={s.stepDone}>
                <Check size={9} strokeWidth={3} aria-hidden />
              </span>
              <b>Collecting transcripts</b>
              <span>Local history is ready</span>
            </span>
            <span className={s.step}>
              <span className={s.stepActive} />
              <b>Uploading to server</b>
              <span>Docs: workspace layout</span>
            </span>
          </section>

          <div className={s.table}>
            <span className={s.tableHead}>
              <span>Session</span>
              <span>Status</span>
              <span>Upload</span>
            </span>
            {SESSIONS.map((session) => (
              <span className={s.row} key={session.title}>
                <span className={s.sessionCell}>
                  <span className={s.agentIcon}>
                    <AgentToolLogo
                      className={s.agentLogo}
                      idPrefix={`desktop-${session.title}`}
                      provider={session.source}
                    />
                  </span>
                  <span className={s.sessionText}>
                    <b>{session.title}</b>
                    <span>{SOURCE_LABEL[session.source]}</span>
                  </span>
                </span>
                <StatusPill state={session.state} />
                <span className={`${s.toggle}${session.state === 'off' ? '' : ` ${s.toggleOn}`}`} />
              </span>
            ))}
          </div>
        </main>
      </div>
      <StatusBar
        left={
          <span className={s.statusLeft}>
            <span className={s.uploadingDot} />
            Uploading 1 session
            <Pause size={11} strokeWidth={2.4} aria-hidden />
          </span>
        }
      />
    </Window>
  );
}

function TeamShot() {
  return (
    <Window label="Agent Relay Desktop: your team's agents on the relay">
      <div className={s.app}>
        <Rail view="team" />
        <Sidebar
          groups={[
            {
              heading: 'People',
              items: [
                { icon: <Users {...ICON} />, label: 'Everyone', count: 3, active: true },
                ...TEAM.map((person) => ({
                  icon: <span className={s.navInitials}>{person.initials}</span>,
                  label: person.name,
                  count: person.agents.length,
                  live: person.agents.length > 0,
                })),
              ],
            },
          ]}
        />
        <main className={s.main}>
          <header className={s.mainHeader}>
            <span>
              <b>Team</b>
              <span>Teammates in your workspace and the agents they have on the relay.</span>
            </span>
            <span className={s.messageButton}>
              <SquarePen size={12} strokeWidth={2} aria-hidden />
              Message
            </span>
          </header>

          <div className={s.people}>
            {TEAM.map((person) => (
              <section className={s.person} key={person.name}>
                <span className={s.personHead}>
                  <span className={s.initials}>{person.initials}</span>
                  <span className={s.personText}>
                    <b>{person.name}</b>
                    <span>
                      {person.agents.length
                        ? `${person.agents.length} on the relay`
                        : 'No agents on the relay'}
                    </span>
                  </span>
                  {person.agents.length ? (
                    <span className={s.liveCount}>
                      <span className={s.liveDot} />
                      {person.agents.length}
                    </span>
                  ) : null}
                </span>
                {person.agents.map((agent) => (
                  <span className={s.teamAgent} key={agent.handle}>
                    <span className={s.teamAgentIcon}>
                      <Sparkles size={12} strokeWidth={1.8} aria-hidden />
                      <span className={s.onlineDot} />
                    </span>
                    <span className={s.teamAgentText}>
                      <b>
                        {agent.handle}@{agent.machine}
                      </b>
                      <span>
                        on {agent.machine} · {agent.task}
                      </span>
                    </span>
                    <span className={s.rowButton}>Message</span>
                  </span>
                ))}
              </section>
            ))}
          </div>
        </main>
      </div>
      <StatusBar
        left={
          <span className={s.statusLeft}>
            <span className={s.upToDateDot} />
            Uploads up to date
            <Pause size={11} strokeWidth={2.4} aria-hidden />
          </span>
        }
      />
    </Window>
  );
}

export function DesktopSessionsFeature() {
  return (
    <FadeIn
      direction="up"
      delay={180}
      className={`${landing.featureCol} ${landing.desktopSessionsFeature}`}
    >
      <div className={landing.featureCopy}>
        <h3 className={landing.featureTitle}>Your sessions, shared with your team</h3>
        <ul className={landing.featureList}>
          <li>
            Agent Relay Desktop finds your local Claude Code and Codex sessions and puts them on the
            relay.
          </li>
          <li>Choose which sessions upload to your workspace. New changes upload automatically.</li>
          <li>See exactly where each upload is, and pause uploads from the status bar.</li>
          <li>No terminal required: install the app, sign in with Google, done.</li>
        </ul>
      </div>
      <div className={`${landing.featurePreview} ${s.preview}`}>
        <SessionsShot />
      </div>
    </FadeIn>
  );
}

export function DesktopTeamFeature() {
  return (
    <FadeIn direction="up" delay={120} className={`${landing.featureCol} ${landing.desktopTeamFeature}`}>
      <div className={`${landing.featurePreview} ${s.preview}`}>
        <TeamShot />
      </div>
      <div className={landing.featureCopy}>
        <h3 className={landing.featureTitle}>Every agent on your team, one click away</h3>
        <ul className={landing.featureList}>
          <li>See each teammate&apos;s agents on the relay, by person and machine.</li>
          <li>Message any agent directly, yours or a teammate&apos;s.</li>
          <li>Turn a session on to put it on the relay. Turn it off to take it down.</li>
          <li>Runs on macOS and Linux, with a native app for iPhone and iPad.</li>
        </ul>
      </div>
    </FadeIn>
  );
}
