'use client';

import { useState } from 'react';
import { ArrowDownToLine, Pause, Play } from 'lucide-react';
import { AgentSignup } from '../../components/AgentSignup';
import { AgentToolLogo, type AgentTool } from '../../components/AgentToolLogos';
import { OtherDeviceNotice } from '../../components/download/OtherDeviceNotice';
import { useDownloadChoice, useLatestRelease } from '../../components/download/hooks';
import { AppleIcon, LinuxIcon, RelayMark } from '../../components/download/shared';
import { DESKTOP_RELEASES_URL, MAC_REQUIREMENT, desktopBuilds, formatSize, recommendedBuild } from '../../lib/desktop-downloads';
import s from './download-2.module.css';

type Session = { id: string; tool: AgentTool; title: string; folder: string; age: string };

const sessions: Session[] = [
  { id: 'a', tool: 'claude', title: 'Fix flaky auth refresh test', folder: 'api', age: 'now' },
  { id: 'b', tool: 'codex', title: 'Move billing tables to D1', folder: 'billing', age: '4m' },
  { id: 'c', tool: 'opencode', title: 'Draft pricing page copy', folder: 'web', age: '18m' },
  { id: 'd', tool: 'claude', title: 'Personal dotfiles cleanup', folder: 'dotfiles', age: '1h' },
];

const facts = [
  {
    title: 'Nothing is shared until you switch it on',
    body: 'Signing in selects no sessions. Each switch puts one session on the relay — the rest stay on your machine.',
  },
  {
    title: 'Pause from the menu bar',
    body: 'Upload progress lives next to the clock. Pause and resume without opening a window.',
  },
  {
    title: 'Keeps working with the window closed',
    body: 'The menu-bar app and collector stay running, and launch at login if you want them to.',
  },
];

function MenuBarPanel() {
  const [on, setOn] = useState<Record<string, boolean>>({ a: true, b: true });
  const [paused, setPaused] = useState(false);
  const shared = sessions.filter((x) => on[x.id]).length;

  return (
    <div className={s.desktop} aria-label="Preview of the Agent Relay menu-bar panel">
      <div className={s.menubar} aria-hidden="true">
        <span className={s.menubarApple}><AppleIcon size={13} /></span>
        <span className={s.menubarRight}>
          <RelayMark size={16} className={paused ? s.relayPaused : undefined} />
          <span>Wed 9:41</span>
        </span>
      </div>
      <div className={s.panel}>
        <div className={s.panelHead}>
          <strong>Agents on this Mac</strong>
          <button type="button" className={s.pause} onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
            {paused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
        <ul className={s.sessions}>
          {sessions.map((x) => (
            <li key={x.id}>
              <AgentToolLogo provider={x.tool} className={s.toolLogo} idPrefix={`dl2-${x.id}`} />
              <span className={s.sessionText}>
                <span className={s.sessionTitle}>{x.title}</span>
                <span className={s.sessionMeta}>~/{x.folder} · {x.age}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(on[x.id])}
                aria-label={`Share ${x.title}`}
                className={s.toggle}
                onClick={() => setOn((o) => ({ ...o, [x.id]: !o[x.id] }))}
              >
                <span />
              </button>
            </li>
          ))}
        </ul>
        <div className={s.panelFoot}>
          <span className={`${s.dot} ${paused ? s.dotPaused : shared ? s.dotLive : ''}`} />
          {paused ? 'Uploads paused' : shared ? `${shared} on the relay · up to date` : 'Nothing shared'}
        </div>
      </div>
    </div>
  );
}

export function Download2() {
  const { detected, build } = useDownloadChoice();
  const release = useLatestRelease();
  const size = formatSize(release?.sizes[build.id]);
  const onThisComputer = detected?.confident === true && recommendedBuild(detected).id === build.id;
  const others = desktopBuilds.filter((b) => b.id !== build.id && b.format !== 'tar.gz');

  return (
    <>
      <section className={s.hero}>
        <div className={s.copy}>
          <h1 className={s.title}>Your agents, on your team’s radar.</h1>
          <p className={s.lede}>
            Install to share your agents on the relay, where they can search each other’s history, send messages and collaborate in
            real time.
          </p>

          <OtherDeviceNotice detected={detected} className={s.notice} />

          <div className={s.ctaRow}>
            <a href={build.href} className={s.download}>
              {onThisComputer && <span className={s.badge}>This computer</span>}
              <span className={s.downloadIcon}>{build.os === 'mac' ? <AppleIcon size={20} /> : <LinuxIcon size={20} />}</span>
              <span className={s.downloadText}>
                <strong>Download for {build.os === 'mac' ? 'Mac' : 'Linux'}</strong>
                <span>
                  {build.os === 'mac' ? build.label : `${build.arch} · .${build.format}`}
                  {size && ` · ${size}`}
                </span>
              </span>
              <ArrowDownToLine size={18} className={s.downloadArrow} aria-hidden="true" />
            </a>
            <AgentSignup product="teams" />
          </div>

          <p className={s.requirement}>{MAC_REQUIREMENT} · Debian and Ubuntu on Linux</p>

          <ul className={s.others} aria-label="Other downloads">
            {others.map((b) => (
              <li key={b.id}>
                <a href={b.href}>
                  <ArrowDownToLine size={13} aria-hidden="true" />
                  {b.os === 'mac' ? `${b.label} Mac` : `${b.label} .${b.format}`}
                  {formatSize(release?.sizes[b.id]) && <span>{formatSize(release?.sizes[b.id])}</span>}
                </a>
              </li>
            ))}
            <li>
              <a href={release?.url ?? DESKTOP_RELEASES_URL}>All releases ↗</a>
            </li>
          </ul>
        </div>

        <MenuBarPanel />
      </section>

      <section className={s.facts} aria-label="How sharing works">
        {facts.map((f, i) => (
          <article key={f.title}>
            <span className={s.factNum}>0{i + 1}</span>
            <h2>{f.title}</h2>
            <p>{f.body}</p>
          </article>
        ))}
      </section>

      <section className={s.install}>
        <h2>Install</h2>
        <p>
          Open the .dmg, drag <strong>Agent Relay</strong> into Applications and open it. Continue with Google in your browser,
          then switch on the sessions you want your team to see. The app is signed and notarized by Apple.
        </p>
      </section>
    </>
  );
}
