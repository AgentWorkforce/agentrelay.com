'use client';

import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { AgentToolLogo, type AgentTool } from '../../components/AgentToolLogos';
import { OtherDeviceNotice } from '../../components/download/OtherDeviceNotice';
import { useDownloadChoice, useLatestRelease } from '../../components/download/hooks';
import { AppleIcon, LinuxIcon, RelayMark } from '../../components/download/shared';
import { DESKTOP_RELEASES_URL, MAC_REQUIREMENT, formatSize, linuxBuilds, type DesktopBuildId } from '../../lib/desktop-downloads';
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
  const { detected, build, choose } = useDownloadChoice();
  const release = useLatestRelease();
  const size = formatSize(release?.sizes[build.id]);
  const alternatives = [
    { id: 'mac-arm64', label: 'Apple silicon' },
    { id: 'mac-x64', label: 'Intel Macs' },
    { id: linuxBuilds[0].id, label: 'Linux' },
  ].filter((alt) => alt.id !== build.id && !(alt.label === 'Linux' && build.os === 'linux')) as { id: DesktopBuildId; label: string }[];

  return (
    <>
      <section className={s.hero}>
        <div className={s.copy}>
          <p className={s.eyebrow}>Agent Relay for {build.os === 'mac' ? 'Mac' : 'Linux'}</p>
          <h1 className={s.title}>Your agents, on your team’s radar.</h1>
          <p className={s.lede}>
            A small menu-bar app that puts the coding sessions you pick — Claude Code, Codex, OpenCode and more — in your team’s
            shared workspace.
          </p>

          <OtherDeviceNotice detected={detected} className={s.notice} />

          <div className={s.ctaRow}>
            <a href={build.href} className={`btn btn-primary ${s.cta}`}>
              {build.os === 'mac' ? <AppleIcon size={18} /> : <LinuxIcon size={18} />}
              Download for {build.label}
            </a>
            <span className={s.ctaMeta}>
              {build.os === 'mac' ? MAC_REQUIREMENT : `.${build.format} · ${build.detail}`}
              {size && <> · {size}</>}
            </span>
          </div>

          <p className={s.alts}>
            Also for{' '}
            {alternatives.map((alt, i) => (
              <span key={alt.id}>
                {i > 0 && ' and '}
                <button type="button" onClick={() => choose(alt.id)}>{alt.label}</button>
              </span>
            ))}
            . <a href={release?.url ?? DESKTOP_RELEASES_URL}>All releases ↗</a>
          </p>
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
