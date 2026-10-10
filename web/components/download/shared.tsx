import type { Metadata } from 'next';
import type React from 'react';
import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import { absoluteUrl } from '../../lib/site';

export function downloadVariantMetadata(path: string): Metadata {
  return {
    title: 'Download Agent Relay',
    description: 'Agent Relay connects your coding agent sessions to your team.',
    alternates: { canonical: absoluteUrl('/download') },
    robots: { index: false, follow: true },
    openGraph: { url: absoluteUrl(path) },
  };
}

export function DownloadShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteNav />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function AppleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.76c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.29-3.52ZM14.2 6.29c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.68-.92 2.67.97.08 1.96-.49 2.56-1.22Z" />
    </svg>
  );
}

export function LinuxIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="14" rx="2.5" />
      <path d="m7 9 3 2.5L7 14M12 14h5" />
      <path d="M9 21h6" />
    </svg>
  );
}

const MARK_FRONT = 'M71.3682 21.7098L54.042 39.036C50.6567 42.4213 50.6568 47.9099 54.042 51.2952L71.3727 68.6259L52.8321 87.1665C48.6005 91.3981 41.7397 91.3981 37.5081 87.1665L3.17369 52.8321C-1.05789 48.6005 -1.0579 41.7397 3.17369 37.5081L37.5081 3.17369C41.7397 -1.0579 48.6005 -1.05789 52.8321 3.17369L71.3682 21.7098Z';
const MARK_BACK = 'M75.5711 72.8243C78.9563 76.2096 84.445 76.2096 87.8302 72.8243L109.359 51.2952C112.745 47.9099 112.745 42.4213 109.359 39.036L87.8302 17.507C84.445 14.1218 78.9563 14.1218 75.5711 17.507L71.3682 21.7098L88.6989 39.0405C92.0842 42.4258 92.0842 47.9144 88.6989 51.2997L71.3727 68.6259L75.5711 72.8243Z';

/** The Agent Relay mark on an app-icon tile. */
export function AppTile({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="relay-app-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a7fb5" />
          <stop offset="1" stopColor="#1f4f78" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#relay-app-tile)" />
      <rect x="2.5" y="2.5" width="59" height="59" rx="13.5" fill="none" stroke="rgba(255,255,255,.18)" />
      <g transform="translate(14 17.5) scale(0.32)" fill="#fff">
        <path d={MARK_FRONT} />
        <path opacity=".55" d={MARK_BACK} />
      </g>
    </svg>
  );
}
