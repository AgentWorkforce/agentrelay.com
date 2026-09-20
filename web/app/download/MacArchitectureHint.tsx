'use client';

import { useEffect, useState } from 'react';

import s from './download.module.css';

/**
 * Nudges Mac visitors toward the Apple silicon build.
 *
 * Rendered empty on the server and on non-Mac clients so the page needs no
 * user-agent handling in the server component (and stays cacheable). The check
 * is deliberately crude — a wrong guess costs a visitor one extra click, and
 * the note never hides the Intel button.
 */
export function MacArchitectureHint() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.userAgent.includes('Mac'));
  }, []);

  if (!isMac) return null;

  return (
    <p className={s.archHint}>Recommended for most Macs sold since 2020: Apple silicon</p>
  );
}
