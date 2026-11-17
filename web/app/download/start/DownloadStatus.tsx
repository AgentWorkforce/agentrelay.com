'use client';

import { useEffect, useRef, useState } from 'react';
import { usePostHog } from '@posthog/next';

import { captureDesktopDownload } from '../../../lib/desktop-download-analytics';
import { type DesktopAsset, desktopAssetUrl, shouldStartDownload } from '../../../lib/desktop-downloads';
import s from './start.module.css';

/** Long enough for the arrow to drop into the tray twice before it settles. */
const SETTLE_MS = 1900;

/** Builds started in this document; client-side navigation back here keeps it. */
const startedThisDocument = new Set<string>();

const LABELS = {
  pending: 'Starting download…',
  started: 'Download started',
  skipped: 'Check your Downloads folder',
} as const;

/**
 * The download's status: a marker and a label. Opening the page starts the
 * download (GitHub answers the release link with an attachment, so the
 * browser saves the file and stays here); the arrow drops into the tray, then
 * becomes a check. A reload, a Back from sign-in, or a return through in-app
 * navigation downloads nothing, shows the check at once and says where the
 * earlier file went; every fresh page load from a download button downloads.
 */
export function DownloadStatus({ asset }: { asset: DesktopAsset }) {
  const href = desktopAssetUrl(asset.file);
  const ph = usePostHog();
  const alreadyStarted = useRef<boolean | null>(null);
  const [outcome, setOutcome] = useState<keyof typeof LABELS>('pending');
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (alreadyStarted.current === null) {
      const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      alreadyStarted.current = !shouldStartDownload(href, navigation?.type, startedThisDocument);
      if (!alreadyStarted.current) {
        startedThisDocument.add(href);
        captureDesktopDownload(ph, 'started', asset);
        window.location.assign(href);
      }
    }
    setOutcome(alreadyStarted.current ? 'skipped' : 'started');

    const instant = alreadyStarted.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setSettled(true), instant ? 0 : SETTLE_MS);
    return () => clearTimeout(timer);
  }, [href, asset, ph]);

  return (
    <>
      <span className={`${s.marker} ${s.markerDownload}`} data-settled={settled || undefined} aria-hidden="true">
        <svg className={s.arrow} viewBox="0 0 20 20" fill="none">
          <path d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg className={s.tray} viewBox="0 0 20 20" fill="none">
          <path d="M3.5 12.5v2.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <svg className={s.check} viewBox="0 0 20 20" fill="none">
          <path d="m5 10.5 3.2 3L15 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span aria-live="polite">{LABELS[outcome]}</span>
    </>
  );
}
