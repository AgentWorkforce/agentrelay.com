const RELEASES = 'https://github.com/AgentWorkforce/relay-desktop-releases/releases/latest/download';

export type DesktopPlatform = 'macos' | 'windows' | 'linux';
export type DesktopArch = 'arm64' | 'x64';
export type DesktopDownloadFormat = 'dmg' | 'exe' | 'zip' | 'deb';

export type DesktopDownload = {
  platform: DesktopPlatform;
  arch: DesktopArch;
  format: DesktopDownloadFormat;
  filename: string;
  url: string;
  /** Short architecture name for a button, such as "Apple silicon" or "x64". */
  archLabel: string;
  /** What to do with the file once it arrives. */
  installNote: string;
};

const download = (
  platform: DesktopPlatform,
  arch: DesktopArch,
  format: DesktopDownloadFormat,
  filename: string,
  archLabel: string,
  installNote: string,
): DesktopDownload => ({
  platform,
  arch,
  format,
  filename,
  url: `${RELEASES}/${filename}`,
  archLabel,
  installNote,
});

/**
 * Every download link the website offers, one entry per platform and
 * architecture. The stable asset names are published by relay-desktop's
 * Release workflow, so these URLs follow a new release without a website
 * deploy.
 */
export const DESKTOP_DOWNLOADS: readonly DesktopDownload[] = [
  download(
    'macos',
    'arm64',
    'dmg',
    'AgentRelay-macOS-arm64.dmg',
    'Apple silicon',
    'Open the disk image and drag Agent Relay to Applications.',
  ),
  download(
    'macos',
    'x64',
    'dmg',
    'AgentRelay-macOS-x64.dmg',
    'Intel',
    'Open the disk image and drag Agent Relay to Applications.',
  ),
  download(
    'windows',
    'x64',
    'exe',
    'AgentRelay-Windows-x64-Setup.exe',
    'x64',
    'Run the installer. It installs for your account without administrator rights.',
  ),
  download(
    'windows',
    'arm64',
    'exe',
    'AgentRelay-Windows-arm64-Setup.exe',
    'Arm64',
    'Run the installer. It installs for your account without administrator rights.',
  ),
  download(
    'linux',
    'x64',
    'deb',
    'AgentRelay-Linux-x64.deb',
    'x64',
    'Install the .deb with your package manager.',
  ),
  download(
    'linux',
    'arm64',
    'deb',
    'AgentRelay-Linux-arm64.deb',
    'arm64',
    'Install the .deb with your package manager.',
  ),
];

/**
 * The zips are the portable alternative to the Windows installer: unpack one
 * and run agent-relay.exe without installing anything.
 */
export const WINDOWS_PORTABLE: Record<DesktopArch, string> = {
  x64: `${RELEASES}/AgentRelay-Windows-x64.zip`,
  arm64: `${RELEASES}/AgentRelay-Windows-arm64.zip`,
};

export const LINUX_TARBALLS: Record<DesktopArch, string> = {
  x64: `${RELEASES}/AgentRelay-Linux-x64.tar.gz`,
  arm64: `${RELEASES}/AgentRelay-Linux-arm64.tar.gz`,
};

export function platformName(platform: DesktopPlatform): string {
  if (platform === 'macos') return 'macOS';
  if (platform === 'windows') return 'Windows';
  return 'Linux';
}

export function downloadsFor(platform: DesktopPlatform): DesktopDownload[] {
  return DESKTOP_DOWNLOADS.filter((item) => item.platform === platform);
}

export function downloadFor(platform: DesktopPlatform, arch: DesktopArch): DesktopDownload {
  const match = DESKTOP_DOWNLOADS.find((item) => item.platform === platform && item.arch === arch);
  if (!match) throw new Error(`No ${platform} ${arch} download`);
  return match;
}

export function downloadLabel(item: DesktopDownload): string {
  return `Download for ${platformName(item.platform)} (${item.archLabel})`;
}

export type DesktopDetectInput = {
  userAgent: string;
  /** `navigator.platform`, or the quoted `Sec-CH-UA-Platform` request header. */
  platform?: string | null;
  /** `Sec-CH-UA-Arch`, when a browser sends it. */
  architecture?: string | null;
};

/**
 * Work out which download to put first. Runs on the server from the request's
 * User-Agent (and Client Hint headers), so Windows visitors get the Windows
 * build in the first response instead of a Mac download that swaps after
 * hydration. When the platform is unclear, the page shows every option.
 */
export function detectDesktopDownload(input: DesktopDetectInput): DesktopDownload | null {
  const userAgent = input.userAgent ?? '';
  const platformHint = (input.platform ?? '').replaceAll('"', '').toLowerCase();

  // Phones, tablets, and ChromeOS are not desktop installs.
  if (/iphone|ipad|ipod|android|windows phone|mobile/i.test(userAgent) || /cros/i.test(userAgent)) {
    return null;
  }

  let platform: DesktopPlatform | null = null;
  if (platformHint.includes('windows') || /windows|win32|win64/i.test(userAgent)) {
    platform = 'windows';
  } else if (platformHint.includes('mac') || /macintosh|mac os x/i.test(userAgent)) {
    platform = 'macos';
  } else if (platformHint.includes('linux') || /linux|x11/i.test(userAgent)) {
    platform = 'linux';
  }

  if (!platform) return null;

  return downloadFor(platform, detectArch(platform, userAgent, input.architecture));
}

function detectArch(
  platform: DesktopPlatform,
  userAgent: string,
  architecture: string | null | undefined,
): DesktopArch {
  const hint = (architecture ?? '').replaceAll('"', '').toLowerCase();
  if (hint === 'arm' || /arm64|aarch64|armv8/i.test(userAgent)) return 'arm64';
  if (hint === 'x86' || /x86_64|amd64|win64/i.test(userAgent)) return 'x64';

  // Safari does not expose the Mac's architecture. Apple silicon is the
  // common case; Intel Macs can still choose Intel from the options below.
  return platform === 'macos' ? 'arm64' : 'x64';
}
