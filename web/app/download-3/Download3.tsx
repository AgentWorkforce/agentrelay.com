'use client';

import type React from 'react';
import { useState } from 'react';
import { ArrowDownToLine, Check, FolderOpen } from 'lucide-react';
import { OtherDeviceNotice } from '../../components/download/OtherDeviceNotice';
import { useCopy, useDownloadChoice, useLatestRelease } from '../../components/download/hooks';
import { AppTile, AppleIcon, LinuxIcon } from '../../components/download/shared';
import {
  DESKTOP_RELEASES_URL,
  MAC_REQUIREMENT,
  formatSize,
  getBuild,
  recommendedBuild,
  type DesktopBuild,
  type DesktopBuildId,
} from '../../lib/desktop-downloads';
import s from './download-3.module.css';

type Step = { title: string; body: React.ReactNode; scene: 'download' | 'drag' | 'terminal' | 'signin' | 'choose' };

function stepsFor(build: DesktopBuild): Step[] {
  const install: Step[] =
    build.os === 'mac'
      ? [
          {
            title: 'Drag it into Applications',
            body: <>Open <code>{build.asset}</code> from Downloads and drag <strong>Agent Relay</strong> onto the Applications folder.</>,
            scene: 'drag',
          },
        ]
      : [
          {
            title: build.format === 'deb' ? 'Install the package' : 'Unpack the tree',
            body:
              build.format === 'deb' ? (
                <>From your Downloads folder, install it with apt. It registers the app, tray icon and autostart.</>
              ) : (
                <>Extract it and run <code>usr/bin/agent-relay</code> in place, or copy the tree under <code>/</code>.</>
              ),
            scene: 'terminal',
          },
        ];
  return [
    { title: 'Download', body: <>Your download starts as soon as you choose your machine.</>, scene: 'download' },
    ...install,
    {
      title: 'Open it and sign in',
      body: <>Launch Agent Relay and choose <strong>Continue with Google</strong>. Sign-in finishes in your browser.</>,
      scene: 'signin',
    },
    {
      title: 'Choose what to share',
      body: <>Check the sessions your team should see and click <strong>Upload selected</strong>. Everything else stays on this computer.</>,
      scene: 'choose',
    },
  ];
}

function Scene({ scene, build, command }: { scene: Step['scene']; build: DesktopBuild; command: string }) {
  const [copied, copy] = useCopy();
  if (scene === 'drag') {
    return (
      <div className={s.window} aria-hidden="true">
        <div className={s.windowBar}><i /><i /><i /><span>Agent Relay</span></div>
        <div className={s.dmg}>
          <div className={s.dmgItem}>
            <AppTile size={72} className={s.dragTile} />
            <span>Agent Relay</span>
          </div>
          <svg className={s.dmgArrow} viewBox="0 0 120 24" aria-hidden="true">
            <path d="M4 12h104m-10-8 10 8-10 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 6" />
          </svg>
          <div className={s.dmgItem}>
            <span className={s.folder}><FolderOpen size={40} strokeWidth={1.4} aria-hidden="true" /></span>
            <span>Applications</span>
          </div>
        </div>
      </div>
    );
  }
  if (scene === 'terminal') {
    return (
      <div className={`${s.window} ${s.term}`}>
        <div className={s.windowBar}><i /><i /><i /><span>Terminal</span></div>
        <div className={s.termBody}>
          <code><span className={s.prompt}>$</span> {command}</code>
          <button type="button" onClick={() => copy('cmd', command)}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
      </div>
    );
  }
  if (scene === 'signin') {
    return (
      <div className={s.window} aria-hidden="true">
        <div className={s.windowBar}><i /><i /><i /><span>Agent Relay</span></div>
        <div className={s.signin}>
          <div className={s.signinArt}><AppTile size={56} /></div>
          <div className={s.signinForm}>
            <strong>Connect this {build.os === 'mac' ? 'Mac' : 'computer'}</strong>
            <span>Bring your coding sessions to your team.</span>
            <span className={s.google}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.4-.2-2.1H12v4h6c-.1 1-.8 2.5-2.3 3.5v2.8h3.7c2.1-2 3.2-4.9 3.2-8.2Z" />
                <path fill="#34A853" d="M12 23c3 0 5.6-1 7.4-2.7l-3.7-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2v2.9C3.8 20.6 7.6 23 12 23Z" />
                <path fill="#FBBC05" d="M5.8 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.5.4-2.1V7H2C1.4 8.5 1 10.2 1 12s.4 3.5 1.2 5l3.6-2.9Z" />
                <path fill="#EA4335" d="M12 5.4c1.7 0 2.8.7 3.5 1.3l2.6-2.5C16.5 2.7 14.5 1.8 12 1.8 7.6 1.8 3.8 4.3 2 8l3.8 2.9c.9-2.6 3.3-4.5 6.2-4.5Z" />
              </svg>
              Continue with Google
            </span>
          </div>
        </div>
      </div>
    );
  }
  if (scene === 'choose') {
    const rows = [
      ['Fix flaky auth refresh test', true],
      ['Move billing tables to D1', true],
      ['Personal dotfiles cleanup', false],
    ] as const;
    return (
      <div className={s.window} aria-hidden="true">
        <div className={s.windowBar}><i /><i /><i /><span>Session Uploads</span></div>
        <ul className={s.uploads}>
          {rows.map(([title, checked]) => (
            <li key={title}>
              <span className={`${s.check} ${checked ? s.checked : ''}`}>{checked && <Check size={11} strokeWidth={3} aria-hidden="true" />}</span>
              {title}
            </li>
          ))}
        </ul>
        <div className={s.uploadsFoot}><span>Only sessions I choose</span><span className={s.uploadBtn}>Upload selected</span></div>
      </div>
    );
  }
  return (
    <div className={s.window} aria-hidden="true">
      <div className={s.windowBar}><i /><i /><i /><span>Downloads</span></div>
      <div className={s.file}>
        <span className={s.fileIcon}>{build.os === 'mac' ? <AppleIcon size={22} /> : <LinuxIcon size={22} />}</span>
        <span className={s.fileName}>{build.asset}</span>
        <span className={s.fileBar}><span /></span>
      </div>
    </div>
  );
}

export function Download3() {
  const { detected, build, choose } = useDownloadChoice();
  const release = useLatestRelease();
  const [started, setStarted] = useState(false);
  const [active, setActive] = useState(0);
  const view = build ?? getBuild('mac-arm64');
  const steps = stepsFor(view);
  const command = view.format === 'deb' ? `sudo apt install ./${view.asset}` : `tar -xzf ${view.asset}`;

  const machines = [
    { build: getBuild('mac-arm64'), label: 'Apple silicon', detail: 'M-series chip' },
    { build: getBuild('mac-x64'), label: 'Intel Mac', detail: 'Intel processor' },
    { build: getBuild('linux-x64-deb'), label: 'Linux x64', detail: 'x64 · .deb' },
    { build: getBuild('linux-arm64-deb'), label: 'Linux arm64', detail: 'arm64 · .deb' },
  ];
  const detectedId = detected?.os === 'mac' || detected?.os === 'linux' ? (recommendedBuild(detected)?.id ?? null) : null;

  function start(id: DesktopBuildId) {
    choose(id);
    setStarted(true);
    setActive(1);
  }

  return (
    <div className={s.wrap}>
      <header className={s.head}>
        <h1 className={s.title}>Install Agent Relay</h1>
        <p className={s.lede}>Pick your computer — we’ve highlighted the one you’re on — then follow the steps.</p>
        <OtherDeviceNotice detected={detected} className={s.notice} />
      </header>

      <div className={s.machines} role="group" aria-label="Choose your computer">
        {machines.map((m) => (
          <a
            key={m.label}
            href={m.build.href}
            onClick={() => start(m.build.id)}
            className={`${s.machine} ${m.build.id === build?.id ? s.machineCurrent : ''}`}
          >
            <span className={s.machineIcon}>{m.build.os === 'linux' ? <LinuxIcon size={20} /> : <AppleIcon size={20} />}</span>
            <span className={s.machineText}>
              <strong>{m.label}</strong>
              <span>
                {m.detail}
                {formatSize(release?.sizes[m.build.id]) && ` · ${formatSize(release?.sizes[m.build.id])}`}
              </span>
            </span>
            {m.build.id === detectedId && <span className={s.badge}>This computer</span>}
            <ArrowDownToLine size={18} className={s.machineArrow} aria-hidden="true" />
          </a>
        ))}
      </div>
      <p className={s.req}>
        {MAC_REQUIREMENT} · Linux .deb for Debian and Ubuntu · <a href={release?.url ?? DESKTOP_RELEASES_URL}>{release ? `Release ${release.version}` : 'All releases'} ↗</a>
      </p>

      <section className={s.guide} aria-label="Install steps">
        <ol className={s.steps}>
          {steps.map((step, i) => {
            const done = started && i < active;
            return (
              <li key={step.title} className={`${i === active ? s.stepActive : ''} ${done ? s.stepDone : ''}`}>
                <button type="button" onClick={() => setActive(i)} aria-current={i === active ? 'step' : undefined}>
                  <span className={s.stepMark}>{done ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : i + 1}</span>
                  <span className={s.stepTitle}>{step.title}</span>
                </button>
                {i === active && (
                  <div className={s.stepBody}>
                    <p>{step.body}</p>
                    {i === 0 && started && (
                      <p className={s.retry}>
                        Didn’t start? <a href={view.href}>Download {view.asset}</a>
                      </p>
                    )}
                    {i < steps.length - 1 && (
                      <button type="button" className={s.next} onClick={() => setActive(i + 1)}>
                        {i === 0 && !started ? 'Skip — I have it' : 'Done, next step'}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <div className={s.stage} key={`${view.id}-${active}`}>
          <Scene scene={steps[active].scene} build={view} command={command} />
        </div>
      </section>
    </div>
  );
}
