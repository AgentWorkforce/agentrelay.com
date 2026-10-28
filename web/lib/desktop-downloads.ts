/** GitHub resolves `latest` server-side, so each asset name below is a stable link. */
export const DESKTOP_RELEASES = 'https://github.com/AgentWorkforce/relay-desktop-releases/releases/latest/download';

export type DesktopOs = 'macos' | 'linux' | 'windows';
export type DesktopArch = 'arm64' | 'x64';

export type DesktopAsset = {
  os: DesktopOs;
  arch: DesktopArch;
  file: string;
  label: string;
  /** The format's short name, shown beside the label. */
  kind: string;
};

export const DESKTOP_ASSETS: readonly DesktopAsset[] = [
  { os: 'macos', arch: 'arm64', file: 'AgentRelay-macOS-arm64.dmg', label: 'macOS, Apple silicon', kind: 'DMG' },
  { os: 'macos', arch: 'x64', file: 'AgentRelay-macOS-x64.dmg', label: 'macOS, Intel', kind: 'DMG' },
  { os: 'linux', arch: 'x64', file: 'AgentRelay-Linux-x64.deb', label: 'Linux, x64', kind: 'Debian package' },
  { os: 'linux', arch: 'arm64', file: 'AgentRelay-Linux-arm64.deb', label: 'Linux, ARM64', kind: 'Debian package' },
  { os: 'linux', arch: 'x64', file: 'AgentRelay-Linux-x64.tar.gz', label: 'Linux, x64', kind: 'tarball' },
  { os: 'linux', arch: 'arm64', file: 'AgentRelay-Linux-arm64.tar.gz', label: 'Linux, ARM64', kind: 'tarball' },
  { os: 'windows', arch: 'x64', file: 'AgentRelay-Windows-x64-Setup.exe', label: 'Windows, x64', kind: 'installer' },
  { os: 'windows', arch: 'arm64', file: 'AgentRelay-Windows-arm64-Setup.exe', label: 'Windows, ARM64', kind: 'installer' },
  { os: 'windows', arch: 'x64', file: 'AgentRelay-Windows-x64.zip', label: 'Windows, x64', kind: 'portable zip' },
  { os: 'windows', arch: 'arm64', file: 'AgentRelay-Windows-arm64.zip', label: 'Windows, ARM64', kind: 'portable zip' },
];

export function desktopAssetUrl(file: string): string {
  return `${DESKTOP_RELEASES}/${file}`;
}

export type DesktopPlatform = { os: DesktopOs; arch: DesktopArch };

/**
 * Headers `/download` sends so Chromium includes architecture on the navigation
 * itself. `Sec-CH-UA-Arch` is high-entropy and stays absent until the server
 * asks; `Critical-CH` makes the browser retry that first request with the hint
 * instead of showing a defaulted build. Kept in sync with `web/next.config.mjs`.
 */
export const DOWNLOAD_CLIENT_HINT_HEADERS = {
  'Accept-CH': 'Sec-CH-UA-Arch, Sec-CH-UA-Platform',
  'Critical-CH': 'Sec-CH-UA-Arch, Sec-CH-UA-Platform',
} as const;

/** Structured client-hint values arrive quoted (`"arm"`, `"Windows"`). */
function hintValue(value: string | null | undefined): string {
  return (value ?? '').replaceAll('"', '').trim().toLowerCase();
}

/**
 * The visitor's platform from what the browser reports. `architecture` is the
 * User-Agent Client Hints value (Chromium only), and `platform` is
 * `Sec-CH-UA-Platform` for a reduced user agent that no longer names the OS.
 * Safari and Firefox report every Mac as Intel, so a Mac without an
 * architecture hint is taken to be Apple silicon, which every Mac sold since
 * 2023 is; the Intel build stays one click away. iPadOS Safari also reports a
 * Mac, and only its touch points tell it apart.
 */
export function detectDesktopPlatform(
  userAgent: string,
  {
    architecture,
    platform,
    touchPoints = 0,
  }: { architecture?: string | null; platform?: string | null; touchPoints?: number } = {},
): DesktopPlatform | null {
  const ua = userAgent.toLowerCase();
  const platformHint = hintValue(platform);
  const architectureHint = hintValue(architecture);
  const arm = architectureHint ? architectureHint.startsWith('arm') : /\b(aarch64|arm64|armv8)\b/.test(ua);
  const windows = platformHint === 'windows' || /windows/.test(ua);
  if (windows) return { os: 'windows', arch: arm ? 'arm64' : 'x64' };
  if (
    platformHint === 'android' ||
    platformHint === 'ios' ||
    platformHint === 'chrome os' ||
    /android|iphone|ipad|cros/.test(ua)
  ) {
    return null;
  }
  if (platformHint === 'macos' || /macintosh|mac os x/.test(ua)) {
    if (touchPoints > 1) return null;
    return { os: 'macos', arch: architectureHint && !arm ? 'x64' : 'arm64' };
  }
  if (platformHint === 'linux' || /linux|x11/.test(ua)) return { os: 'linux', arch: arm ? 'arm64' : 'x64' };
  return null;
}

/** The build a platform downloads first: the DMG on macOS, the Debian package on Linux, Setup on Windows. */
export function primaryDesktopAsset(platform: DesktopPlatform): DesktopAsset {
  return DESKTOP_ASSETS.find((asset) => asset.os === platform.os && asset.arch === platform.arch)!;
}

/**
 * The one other build offered beside the primary: the other architecture where
 * detection can be wrong (Macs without Client Hints, Windows on Arm), and the
 * tarball on Linux, whose architecture the user agent does report.
 */
export function alternateDesktopAsset(platform: DesktopPlatform): DesktopAsset {
  if (platform.os === 'linux') {
    const primary = primaryDesktopAsset(platform);
    return DESKTOP_ASSETS.find((asset) => asset.os === 'linux' && asset.arch === platform.arch && asset !== primary)!;
  }
  return primaryDesktopAsset({ os: platform.os, arch: platform.arch === 'arm64' ? 'x64' : 'arm64' });
}
