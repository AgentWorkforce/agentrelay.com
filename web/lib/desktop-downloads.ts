export const DESKTOP_RELEASES_REPO = 'AgentWorkforce/relay-desktop-releases';
export const DESKTOP_RELEASES_URL = `https://github.com/${DESKTOP_RELEASES_REPO}/releases`;
export const DESKTOP_LATEST_RELEASE_API = `https://api.github.com/repos/${DESKTOP_RELEASES_REPO}/releases/latest`;
export const DESKTOP_AGENT_SETUP_URL =
  'https://github.com/AgentWorkforce/relay-desktop/blob/main/docs/agent-driven-setup.md';

export type DesktopOs = 'mac' | 'linux';
export type DesktopArch = 'arm64' | 'x64';
export type DesktopBuildId = 'mac-arm64' | 'mac-x64' | 'linux-x64-deb' | 'linux-arm64-deb' | 'linux-x64-tar' | 'linux-arm64-tar';

export type DesktopBuild = {
  id: DesktopBuildId;
  os: DesktopOs;
  arch: DesktopArch;
  /** Machine name a person recognises, e.g. "Apple silicon". */
  label: string;
  /** Which machines this build is for. */
  detail: string;
  format: 'dmg' | 'deb' | 'tar.gz';
  /** Stable asset name; GitHub's /latest/download/ resolves it to the newest release. */
  asset: string;
  href: string;
  checksumHref: string;
};

function build(id: DesktopBuildId, os: DesktopOs, arch: DesktopArch, label: string, detail: string, format: DesktopBuild['format']): DesktopBuild {
  const platform = os === 'mac' ? 'macOS' : 'Linux';
  const asset = `AgentRelay-${platform}-${arch}.${format}`;
  const href = `${DESKTOP_RELEASES_URL}/latest/download/${asset}`;
  return { id, os, arch, label, detail, format, asset, href, checksumHref: `${href}.sha256` };
}

export const desktopBuilds: DesktopBuild[] = [
  build('mac-arm64', 'mac', 'arm64', 'Apple silicon', 'M1 and later', 'dmg'),
  build('mac-x64', 'mac', 'x64', 'Intel', 'Intel-based Macs', 'dmg'),
  build('linux-x64-deb', 'linux', 'x64', 'Linux x64', 'Debian, Ubuntu', 'deb'),
  build('linux-arm64-deb', 'linux', 'arm64', 'Linux arm64', 'Debian, Ubuntu', 'deb'),
  build('linux-x64-tar', 'linux', 'x64', 'Linux x64', 'Any distro', 'tar.gz'),
  build('linux-arm64-tar', 'linux', 'arm64', 'Linux arm64', 'Any distro', 'tar.gz'),
];

export const macBuilds = desktopBuilds.filter((b) => b.os === 'mac');
export const linuxBuilds = desktopBuilds.filter((b) => b.os === 'linux');

export function getBuild(id: DesktopBuildId): DesktopBuild {
  const found = desktopBuilds.find((b) => b.id === id);
  if (!found) throw new Error(`Unknown desktop build: ${id}`);
  return found;
}

export const MAC_REQUIREMENT = 'macOS 13 Ventura or later';

/* ── Platform detection ──
   Browsers on Apple silicon report an Intel user agent ("Intel Mac OS X"), so
   the user agent alone cannot pick the Mac build. Signals, strongest first:
   1. UA Client Hints `architecture` (Chromium): "arm" or "x86".
   2. The unmasked WebGL renderer: "Apple M…"/"Apple GPU" vs "Intel"/"AMD".
   3. Apple silicon GPUs lack WEBGL_compressed_texture_s3tc_srgb, which every
      Intel/AMD Mac GPU exposes (Safari masks the renderer, so this decides it).
   With no signal the Mac default is Apple silicon: every Mac sold since 2023. */

export type DetectedPlatform =
  | { os: 'mac' | 'linux'; arch: DesktopArch; confident: boolean }
  | { os: 'windows' | 'mobile' | 'unknown'; arch: null; confident: false };

export type PlatformSignals = {
  userAgent: string;
  platform?: string;
  uaArchitecture?: string;
  maxTouchPoints?: number;
  webglRenderer?: string;
  webglExtensions?: string[];
};

export function detectPlatform(signals: PlatformSignals): DetectedPlatform {
  const ua = signals.userAgent;
  const platform = signals.platform ?? '';
  const isIpad = /Macintosh/.test(ua) && (signals.maxTouchPoints ?? 0) > 1;

  if (/iPhone|iPad|iPod|Android/i.test(ua) || isIpad) return { os: 'mobile', arch: null, confident: false };
  if (/Windows/i.test(ua) || /^Win/i.test(platform)) return { os: 'windows', arch: null, confident: false };

  if (/Mac/i.test(platform) || /Macintosh|Mac OS X/.test(ua)) {
    const arch = macArchFromSignals(signals);
    return arch ? { os: 'mac', arch, confident: true } : { os: 'mac', arch: 'arm64', confident: false };
  }

  if (/Linux|X11|CrOS/i.test(ua) || /Linux/i.test(platform)) {
    const hint = signals.uaArchitecture?.toLowerCase();
    if (hint === 'arm' || /aarch64|arm64|armv8/i.test(`${ua} ${platform}`)) return { os: 'linux', arch: 'arm64', confident: true };
    if (hint === 'x86' || /x86_64|amd64/i.test(`${ua} ${platform}`)) return { os: 'linux', arch: 'x64', confident: true };
    return { os: 'linux', arch: 'x64', confident: false };
  }

  return { os: 'unknown', arch: null, confident: false };
}

function macArchFromSignals({ uaArchitecture, webglRenderer, webglExtensions }: PlatformSignals): DesktopArch | null {
  const hint = uaArchitecture?.toLowerCase();
  if (hint === 'arm') return 'arm64';
  if (hint === 'x86') return 'x64';

  if (webglRenderer) {
    if (/Apple M\d/i.test(webglRenderer)) return 'arm64';
    if (/Intel|AMD|Radeon|NVIDIA/i.test(webglRenderer)) return 'x64';
  }

  if (webglExtensions && webglExtensions.length > 0) {
    return webglExtensions.includes('WEBGL_compressed_texture_s3tc_srgb') ? 'x64' : 'arm64';
  }

  return null;
}

/**
 * The build to offer a visitor, or null when there is nothing to recommend:
 * Windows, mobile and unknown platforms get no default CTA, so they can only
 * download a build they explicitly choose.
 */
export function recommendedBuild(detected: DetectedPlatform): DesktopBuild | null {
  if (detected.os === 'linux') return getBuild(detected.arch === 'arm64' ? 'linux-arm64-deb' : 'linux-x64-deb');
  if (detected.os === 'mac' && detected.arch === 'x64') return getBuild('mac-x64');
  if (detected.os === 'mac') return getBuild('mac-arm64');
  return null;
}

/* ── Latest release ── */

export type LatestRelease = {
  version: string;
  publishedAt: string;
  url: string;
  sizes: Partial<Record<DesktopBuildId, number>>;
};

type GitHubRelease = {
  tag_name: string;
  published_at: string;
  html_url: string;
  assets: { name: string; size: number }[];
};

export function parseLatestRelease(release: GitHubRelease): LatestRelease {
  const sizes: LatestRelease['sizes'] = {};
  for (const b of desktopBuilds) {
    const asset = release.assets.find((a) => a.name === b.asset);
    if (asset) sizes[b.id] = asset.size;
  }
  return {
    version: release.tag_name.replace(/^v/, ''),
    publishedAt: release.published_at,
    url: release.html_url,
    sizes,
  };
}

export function formatSize(bytes: number | undefined): string | null {
  if (!bytes) return null;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function formatReleaseDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
