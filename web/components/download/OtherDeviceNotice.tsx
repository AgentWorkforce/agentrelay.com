'use client';

import { Check, Link2 } from 'lucide-react';
import type { DetectedPlatform } from '../../lib/desktop-downloads';
import { useCopy } from './hooks';
import s from './other-device-notice.module.css';

/** Shown to visitors on a phone or Windows: the app runs on Mac and Linux, so hand them the link. */
export function OtherDeviceNotice({ detected, className }: { detected: DetectedPlatform | null; className?: string }) {
  const [copied, copy] = useCopy();
  if (!detected || (detected.os !== 'mobile' && detected.os !== 'windows')) return null;

  const message =
    detected.os === 'mobile'
      ? 'Agent Relay installs on the computer where your coding agents run. Send yourself this page and open it there.'
      : 'Agent Relay runs on Mac and Linux today. Windows support is in progress.';

  return (
    <div className={`${s.notice} ${className ?? ''}`} role="note">
      <p>{message}</p>
      {detected.os === 'mobile' && (
        <button type="button" className={s.copy} onClick={() => copy('page', window.location.href)}>
          {copied ? <Check size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
          {copied ? 'Link copied' : 'Copy link'}
        </button>
      )}
    </div>
  );
}
