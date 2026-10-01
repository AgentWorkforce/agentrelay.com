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

const steps = [
  { title: 'Install', body: 'Open the .dmg and drag Agent Relay into Applications.' },
  { title: 'Sign in', body: 'Open the app and continue with Google in your browser.' },
  { title: 'Choose', body: 'Switch on the sessions your team should see. Nothing uploads until you do.' },
];

export function Download1() {
  const { detected, build, choose } = useDownloadChoice();
  const release = useLatestRelease();
  const size = formatSize(release?.sizes[build.id]);
  const unsure = detected?.os === 'mac' && !detected.confident;
  const otherMac = build.id === 'mac-arm64' ? getBuild('mac-x64') : getBuild('mac-arm64');

  return (
    <>
      <section className={s.hero}>
        <div className={s.glow} aria-hidden="true" />
        <AppTile size={96} className={s.tile} />
        <h1 className={s.title}>Agent Relay for {build.os === 'mac' ? 'Mac' : 'Linux'}</h1>
        <p className={s.lede}>Put your coding agents on the relay. Choose which sessions your team sees, right from the menu bar.</p>

        <OtherDeviceNotice detected={detected} className={s.notice} />

        <a href={build.href} className={`btn btn-primary ${s.cta}`}>
          {build.os === 'mac' ? <AppleIcon size={20} /> : <LinuxIcon size={20} />}
          Download for {build.label}
          {build.format !== 'dmg' && <span className={s.format}>.{build.format}</span>}
        </a>

        <p className={s.meta}>
          {release ? `Version ${release.version}` : 'Latest version'}
          {size && <> · {size}</>}
          {' · '}
          {build.os === 'mac' ? MAC_REQUIREMENT : build.detail}
        </p>

        {build.os === 'mac' && (
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

      <section className={s.all} aria-labelledby="all-heading">
        <div className={s.allHead}>
          <h2 id="all-heading">All downloads</h2>
          {release && <span>Released {formatReleaseDate(release.publishedAt)}</span>}
        </div>
        <ul className={s.list}>
          {[...macBuilds, ...desktopBuilds.filter((b) => b.os === 'linux')].map((b) => (
            <li key={b.id} className={b.id === build.id ? s.current : undefined}>
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
