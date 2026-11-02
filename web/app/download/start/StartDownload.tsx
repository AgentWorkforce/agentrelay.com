'use client';

import { useEffect, useRef } from 'react';

/**
 * Starts the download once, when the page opens. GitHub answers the release
 * link with an attachment, so the browser saves the file and stays here.
 */
export function StartDownload({ href }: { href: string }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    window.location.assign(href);
  }, [href]);

  return null;
}
