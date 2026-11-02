'use client';

import { useEffect, useRef, useState } from 'react';

import s from './start.module.css';

/** Long enough for the arrow to drop into the tray twice before it settles. */
const SETTLE_MS = 1900;

/**
 * Step one's marker. Opening the page starts the download (GitHub answers the
 * release link with an attachment, so the browser saves the file and stays
 * here); the arrow drops into the tray while it starts, then becomes a check.
 * A reload, or coming Back from sign-in, shows the check without downloading
 * the file a second time; every fresh visit from a download button downloads.
 */
export function DownloadMarker({ href }: { href: string }) {
  const handled = useRef(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const alreadyStarted = navigation?.type === 'reload' || navigation?.type === 'back_forward';

    if (!handled.current) {
      handled.current = true;
      if (!alreadyStarted) window.location.assign(href);
    }

    const instant = alreadyStarted || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setSettled(true), instant ? 0 : SETTLE_MS);
    return () => clearTimeout(timer);
  }, [href]);

  return (
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
  );
}
