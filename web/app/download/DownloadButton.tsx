'use client';

import { useEffect, useState } from 'react';

import {
  alternateDesktopAsset,
  type DesktopPlatform,
  desktopAssetUrl,
  detectDesktopPlatform,
  primaryDesktopAsset,
} from '../../lib/desktop-downloads';
import s from './download.module.css';

type UADataNavigator = Navigator & {
  userAgentData?: { getHighEntropyValues(hints: string[]): Promise<{ architecture?: string }> };
};

/** What the server renders, and what a visitor whose OS can't be read gets: every platform. */
const EVERY_PLATFORM: readonly DesktopPlatform[] = [
  { os: 'macos', arch: 'arm64' },
  { os: 'linux', arch: 'x64' },
  { os: 'windows', arch: 'x64' },
];

/** Leads with the build for the visitor's OS and architecture. */
export function DownloadButton() {
  const [platform, setPlatform] = useState<DesktopPlatform | null>(null);

  useEffect(() => {
    let cancelled = false;
    const nav = navigator as UADataNavigator;
    const detect = (architecture?: string) => {
      if (!cancelled) {
        setPlatform(detectDesktopPlatform(nav.userAgent, { architecture, touchPoints: nav.maxTouchPoints }));
      }
    };
    detect();
    nav.userAgentData
      ?.getHighEntropyValues(['architecture'])
      .then(({ architecture }) => detect(architecture || undefined))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!platform) {
    return (
      <div className={s.hero}>
        <div className={s.choices}>
          {EVERY_PLATFORM.map((choice) => {
            const asset = primaryDesktopAsset(choice);
            return (
              <a key={asset.file} className={`btn btn-secondary ${s.choice}`} href={desktopAssetUrl(asset.file)}>
                {asset.label}
                <span className={s.choiceKind}>{asset.kind}</span>
              </a>
            );
          })}
        </div>
        <p className={s.heroNote}>
          Other builds are in <a href="#all-downloads">all downloads</a>.
        </p>
      </div>
    );
  }

  const asset = primaryDesktopAsset(platform);
  const alternate = alternateDesktopAsset(platform);

  return (
    <div className={s.hero}>
      <a className={`btn btn-primary ${s.primary}`} href={desktopAssetUrl(asset.file)}>
        Download for {asset.label}
      </a>
      <p className={s.heroNote}>
        {asset.kind} · <a href={desktopAssetUrl(`${asset.file}.sha256`)}>SHA-256</a> · Not your machine?{' '}
        <a href={desktopAssetUrl(alternate.file)}>
          {alternate.label} {alternate.kind}
        </a>{' '}
        or <a href="#all-downloads">all downloads</a>
      </p>
    </div>
  );
}
