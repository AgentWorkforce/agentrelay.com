'use client';

import {
  alternateDesktopAsset,
  type DesktopPlatform,
  desktopAssetUrl,
  desktopStartHref,
  primaryDesktopAsset,
} from '../../lib/desktop-downloads';
import { useDesktopPlatform } from '../../lib/use-desktop-platform';
import s from './download.module.css';

/** What the server renders, and what a visitor whose OS can't be read gets: every platform. */
const EVERY_PLATFORM: readonly DesktopPlatform[] = [
  { os: 'macos', arch: 'arm64' },
  { os: 'linux', arch: 'x64' },
  { os: 'windows', arch: 'x64' },
];

/** Leads with the build for the visitor's OS and architecture. */
export function DownloadButton() {
  const platform = useDesktopPlatform();

  if (!platform) {
    return (
      <div className={s.actions}>
        <div className={s.choices}>
          {EVERY_PLATFORM.map((choice) => {
            const asset = primaryDesktopAsset(choice);
            return (
              <a key={asset.file} className={`btn btn-secondary ${s.choice}`} href={asset.os === 'macos' ? desktopStartHref(asset.file) : desktopAssetUrl(asset.file)}>
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
    <div className={s.actions}>
      <a className={`btn btn-primary ${s.primary}`} href={asset.os === 'macos' ? desktopStartHref(asset.file) : desktopAssetUrl(asset.file)}>
        Download for {asset.label}
      </a>
      <p className={s.heroNote}>
        {asset.kind} · <a href={desktopAssetUrl(`${asset.file}.sha256`)}>SHA-256</a> · Not your machine?{' '}
        <a href={alternate.os === 'macos' ? desktopStartHref(alternate.file) : desktopAssetUrl(alternate.file)}>
          {alternate.label} {alternate.kind}
        </a>{' '}
        or <a href="#all-downloads">all downloads</a>
      </p>
    </div>
  );
}
