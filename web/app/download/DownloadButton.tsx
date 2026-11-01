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

/**
 * Leads with the build for the visitor's OS and architecture. `initialPlatform`
 * is the server's read of this request, so that build is in the first HTML
 * response. The effect replaces it only once a client-only signal arrives:
 * touch points (iPad) or Chromium's high-entropy architecture. It does not
 * apply a user-agent-only guess first, which would overwrite a server
 * architecture hint with the x64 or Apple-silicon default.
 */
export function DownloadButton({ initialPlatform = null }: { initialPlatform?: DesktopPlatform | null }) {
  const [platform, setPlatform] = useState<DesktopPlatform | null>(initialPlatform);

  useEffect(() => {
    let cancelled = false;
    const nav = navigator as UADataNavigator;
    const apply = (architecture?: string) => {
      if (cancelled) return;
      const next = detectDesktopPlatform(nav.userAgent, { architecture, touchPoints: nav.maxTouchPoints });
      setPlatform((current) => {
        // Keep the server's architecture when the client learned nothing new
        // and still agrees on the OS. An empty hint must not flip Windows on
        // Arm back to the x64 default.
        if (!architecture && current && next && next.os === current.os) return current;
        return next;
      });
    };

    const pending = nav.userAgentData?.getHighEntropyValues(['architecture']);
    if (pending) {
      pending.then(({ architecture }) => apply(architecture || undefined)).catch(() => apply());
    } else {
      apply();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  if (!platform) {
    return (
      <div className={s.actions}>
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
    <div className={s.actions}>
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
