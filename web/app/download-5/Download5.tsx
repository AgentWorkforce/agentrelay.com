'use client';

import { EyeOff, MonitorSmartphone, PauseCircle } from 'lucide-react';
import { OtherDeviceNotice } from '../../components/download/OtherDeviceNotice';
import { useDownloadChoice, useLatestRelease } from '../../components/download/hooks';
import { AppTile, AppleIcon, LinuxIcon } from '../../components/download/shared';
import { DESKTOP_RELEASES_URL, MAC_REQUIREMENT, formatSize, linuxBuilds, macBuilds } from '../../lib/desktop-downloads';
import s from './download-5.module.css';

const reassurances = [
  { icon: EyeOff, title: 'Private by default', body: 'Signing in shares nothing. You pick each session your team can see.' },
  { icon: PauseCircle, title: 'Pause anytime', body: 'Stop uploads from the menu bar in one click.' },
  { icon: MonitorSmartphone, title: 'Every agent on this computer', body: 'Claude Code, Codex, OpenCode and more, in one list.' },
];

function AboutThisMac({ intel }: { intel: boolean }) {
  return (
    <div className={s.about} aria-hidden="true">
      <div className={s.aboutBar}><i /><i /><i /></div>
      <div className={s.aboutBody}>
        <div className={s.aboutLaptop} />
        <strong className={s.aboutName}>MacBook Pro</strong>
        <span className={s.aboutYear}>{intel ? '16-inch, 2019' : '14-inch, 2023'}</span>
        <dl className={s.aboutSpecs}>
          <div className={s.aboutKey}>
            <dt>{intel ? 'Processor' : 'Chip'}</dt>
            <dd>{intel ? '2.3 GHz 8-Core Intel Core i9' : 'Apple M3 Pro'}</dd>
          </div>
          <div>
            <dt>Memory</dt>
            <dd>{intel ? '16 GB 2667 MHz DDR4' : '18 GB'}</dd>
          </div>
          <div>
            <dt>macOS</dt>
            <dd>Sequoia 15.6</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function Download5() {
  const { detected, build, choose } = useDownloadChoice();
  const release = useLatestRelease();
  const isLinux = build?.os === 'linux';
  const intel = build?.id === 'mac-x64';
  const detectedMacArch = detected?.os === 'mac' ? detected.arch : null;
  const detectedLinuxArch = detected?.os === 'linux' ? detected.arch : null;

  return (
    <>
      <section className={s.hero}>
        <div className={s.left}>
          <AppTile size={56} />
          <h1 className={s.title}>Download Agent Relay</h1>
          <p className={s.lede}>Bring your coding agents onto your team’s relay — from a small app in your menu bar.</p>

          <OtherDeviceNotice detected={detected} className={s.notice} />

          {isLinux ? (
            <fieldset className={s.picker}>
              <legend>Which Linux?</legend>
              {(['linux-x64-deb', 'linux-arm64-deb'] as const).map((id) => {
                const x64 = id === 'linux-x64-deb';
                const selected = build?.id === id;
                const isDetected = detectedLinuxArch === (x64 ? 'x64' : 'arm64');
                return (
                  <label key={id} className={`${s.option} ${selected ? s.optionOn : ''}`}>
                    <input type="radio" name="linux" checked={selected} onChange={() => choose(id)} />
                    <span className={s.radio} />
                    <span className={s.optionText}>
                      <strong>
                        {x64 ? 'x64' : 'arm64'}
                        {isDetected && <em>{detected?.confident ? 'Detected' : 'Most likely'}</em>}
                      </strong>
                      <span>
                        Debian and Ubuntu <b>.deb</b>
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ) : (
            <fieldset className={s.picker}>
              <legend>Which Mac do you have?</legend>
              {(['mac-arm64', 'mac-x64'] as const).map((id) => {
                const arm = id === 'mac-arm64';
                const selected = build?.id === id;
                const isDetected = detectedMacArch === (arm ? 'arm64' : 'x64');
                return (
                  <label key={id} className={`${s.option} ${selected ? s.optionOn : ''}`}>
                    <input type="radio" name="mac" checked={selected} onChange={() => choose(id)} />
                    <span className={s.radio} />
                    <span className={s.optionText}>
                      <strong>
                        {arm ? 'Apple silicon' : 'Intel'}
                        {isDetected && <em>{detected?.confident ? 'Detected' : 'Most likely'}</em>}
                      </strong>
                      <span>
                        About This Mac says <b>{arm ? 'Chip: Apple M…' : 'Processor: Intel…'}</b>
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}

          {build ? (
            <>
              <a href={build.href} className={`btn btn-primary ${s.cta}`}>
                {isLinux ? <LinuxIcon size={18} /> : <AppleIcon size={18} />}
                Download for {build.label}
                {formatSize(release?.sizes[build.id]) && <span className={s.size}>{formatSize(release?.sizes[build.id])}</span>}
              </a>
              <p className={s.meta}>
                {isLinux ? `.${build.format} · ${build.detail}` : MAC_REQUIREMENT}
                {release && <> · v{release.version}</>}
              </p>
            </>
          ) : (
            <p className={s.meta}>Choose a build above to download.</p>
          )}

          <p className={s.linux}>
            {isLinux ? (
              <>
                <AppleIcon size={15} /> On a Mac?{' '}
                {macBuilds.map((b, i) => (
                  <span key={b.id}>
                    {i > 0 && ' · '}
                    <button type="button" onClick={() => choose(b.id)} aria-pressed={build?.id === b.id}>
                      {b.label}
                    </button>
                  </span>
                ))}
                {' · '}
                <a href={release?.url ?? DESKTOP_RELEASES_URL}>tarballs ↗</a>
              </>
            ) : (
              <>
                <LinuxIcon size={15} /> On Linux?{' '}
                {linuxBuilds
                  .filter((b) => b.format === 'deb')
                  .map((b, i) => (
                    <span key={b.id}>
                      {i > 0 && ' · '}
                      <button type="button" onClick={() => choose(b.id)} aria-pressed={build?.id === b.id}>
                        {b.arch} .deb
                      </button>
                    </span>
                  ))}
                {' · '}
                <a href={release?.url ?? DESKTOP_RELEASES_URL}>tarballs ↗</a>
              </>
            )}
          </p>
        </div>

        <div className={s.right}>
          {isLinux ? (
            <div className={s.linuxCard} aria-hidden="true">
              <code>$ sudo apt install ./{build.asset}</code>
            </div>
          ) : (
            <>
              <AboutThisMac intel={intel} />
              <p className={s.caption}>
                Not sure? Open the <AppleIcon size={12} /> menu and choose <b>About This Mac</b>.
              </p>
            </>
          )}
        </div>
      </section>

      <section className={s.reassure}>
        {reassurances.map(({ icon: Icon, title, body }) => (
          <div key={title}>
            <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
            <h2>{title}</h2>
            <p>{body}</p>
          </div>
        ))}
      </section>
    </>
  );
}
