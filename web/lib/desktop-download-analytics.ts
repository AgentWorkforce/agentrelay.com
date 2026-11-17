import type { usePostHog } from '@posthog/next';

import type { DesktopAsset } from './desktop-downloads';

/** Where a download button sits: the homepage hero, or the site nav on any page. */
export type DownloadPlacement = 'hero' | 'nav';

/**
 * The desktop download funnel: `desktop_download_clicked` when a download
 * button is pressed, `desktop_download_started` when the start page actually
 * starts the file (not on a reload or a return to it). Both carry the build,
 * so the funnel splits by OS and architecture. Sent by beacon, since a click
 * navigates away at once.
 */
export function captureDesktopDownload(
  ph: ReturnType<typeof usePostHog> | undefined,
  event: 'clicked' | 'started',
  asset: DesktopAsset,
  extra: { placement?: DownloadPlacement } = {},
) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !ph || ph.has_opted_out_capturing()) return;
  ph.capture(
    `desktop_download_${event}`,
    { build: asset.file, os: asset.os, arch: asset.arch, path: window.location.pathname, ...extra },
    { transport: 'sendBeacon' },
  );
}
