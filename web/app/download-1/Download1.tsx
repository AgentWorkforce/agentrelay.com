'use client';

import { ArrowDownToLine } from 'lucide-react';
import { OtherDeviceNotice } from '../../components/download/OtherDeviceNotice';
import { useDownloadChoice, useLatestRelease } from '../../components/download/hooks';
import { AppTile, AppleIcon, LinuxIcon } from '../../components/download/shared';
import {
  DESKTOP_RELEASES_URL,
  MAC_REQUIREMENT,
  desktopBuilds,
  formatReleaseDate,
  formatSize,
  macBuilds,
  getBuild,
} from '../../lib/desktop-downloads';
import s from './download-1.module.css';

function stepsFor(build: { os: string; format: string }) {
  const install =
    build.os === 'mac'
      ? 'Open the .dmg and drag Agent Relay into Applications.'
      : build.format === 'deb'
        ? 'From your Downloads folder, install the .deb with apt. It registers the app, tray icon and autostart.'
        : 'Extract the archive and run usr/bin/agent-relay in place, or copy the tree under /.';
  return [
    { title: 'Install', body: install },
    { title: 'Sign in', body: 'Open the app and continue with Google in your browser.' },
    { title: 'Choose', body: 'Switch on the sessions your team should see. Nothing uploads until you do.' },
  ];
}

export function Download1() {
  const { detected, build, choose } = useDownloadChoice();
  const release = useLatestRelease();
  const size = build ? formatSize(release?.sizes[build.id]) : null;
  const steps = stepsFor(build ?? { os: 'mac', format: 'dmg' });
  const unsure = detected?.os === 'mac' && !detected.confident;
  const otherMac = build?.os === 'mac' ? getBuild(build.id === 'mac-arm64' ? 'mac-x64' : 'mac-arm64') : null;

  return (
    <>
      <section className={s.hero}>
        <div className={s.glow} aria-hidden="true" />
        <AppTile size={96} className={s.tile} />
        <h1 className={s.title}>Agent Relay</h1>
        <p className={s.lede}>Put your coding agents on the relay. Choose which sessions your team sees, right from the menu bar.</p>

        <OtherDeviceNotice detected={detected} className={s.notice} />

        {build ? (
          <a href={build.href} className={`btn btn-primary ${s.cta}`}>
            {build.os === 'mac' ? <AppleIcon size={20} /> : <LinuxIcon size={20} />}
            Download for {build.label}
            {build.format !== 'dmg' && <span className={s.format}>.{build.format}</span>}
          </a>
        ) : (
          <a href="#all-heading" className={`btn btn-primary ${s.cta}`}>
            Choose your download
          </a>
        )}

        {build && (
          <p className={s.meta}>
            {release ? `Version ${release.version}` : 'Latest version'}
            {size && <> · {size}</>}
            {' · '}
            {build.os === 'mac' ? MAC_REQUIREMENT : build.detail}
          </p>
        )}

        {build?.os === 'mac' && otherMac && (
          <p className={s.switch}>
            {unsure ? 'Not sure which Mac you have?' : `Not ${build.id === 'mac-arm64' ? 'Apple silicon' : 'an Intel Mac'}?`}{' '}
            <button type="button" onClick={() => choose(otherMac.id)}>
              Get the {otherMac.label} version
            </button>
          </p>
        )}
        {unsure && (
          <p className={s.hint}>
            <AppleIcon size={13} /> menu → About This Mac. <strong>Chip</strong> means Apple silicon; <strong>Processor</strong> means Intel.
          </p>
        )}
      </section>

      {build && (
      <section className={s.steps} aria-labelledby="steps-heading">
        <h2 id="steps-heading" className={s.srOnly}>Getting started</h2>
        <ol>
          {steps.map((step, i) => (
            <li key={step.title}>
              <span className={s.stepNum}>{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
      )}

      <section className={s.all} aria-labelledby="all-heading">
        <div className={s.allHead}>
          <h2 id="all-heading">All downloads</h2>
          {release && <span>Released {formatReleaseDate(release.publishedAt)}</span>}
        </div>
        <ul className={s.list}>
          {[...macBuilds, ...desktopBuilds.filter((b) => b.os === 'linux')].map((b) => (
            <li key={b.id} className={b.id === build?.id ? s.current : undefined}>
              <span className={s.listIcon}>{b.os === 'mac' ? <AppleIcon size={16} /> : <LinuxIcon size={16} />}</span>
              <span className={s.listName}>
                {b.os === 'mac' ? `Mac · ${b.label}` : b.label}
                <small>{b.detail}</small>
              </span>
              <span className={s.listFormat}>.{b.format}</span>
              <span className={s.listSize}>{formatSize(release?.sizes[b.id]) ?? ''}</span>
              <a href={b.href} className={s.listLink} aria-label={`Download ${b.asset}`}>
                <ArrowDownToLine size={16} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <a className={s.notes} href={release?.url ?? DESKTOP_RELEASES_URL}>
          Release notes, checksums &amp; earlier versions <span aria-hidden="true">↗</span>
        </a>
      </section>
    </>
  );
}
