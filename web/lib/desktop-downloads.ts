/**
 * Download links for the native macOS app, "Agent Relay for Mac".
 *
 * The `.dmg` assets are published by `AgentWorkforce/relay-desktop` CI and
 * attached to each GitHub Release. The `releases/latest/download/<asset>` form
 * always resolves to the newest release, so these URLs never need a version
 * bump when a new build ships.
 */

/** GitHub repository that publishes the macOS app releases. */
export const RELAY_DESKTOP_REPO_URL = 'https://github.com/AgentWorkforce/relay-desktop';

/** Human-facing list of every published release and its notes. */
export const RELAY_DESKTOP_RELEASES_URL = `${RELAY_DESKTOP_REPO_URL}/releases`;

/** Prefix that resolves to the latest release's assets. */
const LATEST_ASSET_BASE = `${RELAY_DESKTOP_RELEASES_URL}/latest/download`;

/** Apple silicon (M-series) disk image. */
export const MAC_ARM64_DOWNLOAD_URL = `${LATEST_ASSET_BASE}/AgentRelay-macOS-arm64.dmg`;

/** Intel (x86_64) disk image. */
export const MAC_X64_DOWNLOAD_URL = `${LATEST_ASSET_BASE}/AgentRelay-macOS-x64.dmg`;

/** One downloadable build of the macOS app. */
export interface DesktopDownload {
  /** Stable key for React lists and analytics. */
  id: 'mac-arm64' | 'mac-x64';
  /** Button label. */
  label: string;
  /** Short line under the button. */
  note: string;
  /** Direct link to the `.dmg`. */
  href: string;
}

/**
 * The macOS downloads, Apple silicon first: it is the recommended build for
 * every Mac sold since 2020.
 */
export function desktopDownloads(): DesktopDownload[] {
  return [
    {
      id: 'mac-arm64',
      label: 'Download for Apple silicon',
      note: 'M1, M2, M3, M4 and later',
      href: MAC_ARM64_DOWNLOAD_URL,
    },
    {
      id: 'mac-x64',
      label: 'Download for Intel Mac',
      note: 'Intel Core processors',
      href: MAC_X64_DOWNLOAD_URL,
    },
  ];
}
