export const DESKTOP_RELEASES_URL = 'https://github.com/AgentWorkforce/relay-desktop-releases/releases';

export const desktopDownloads = [
  { arch: 'arm64', label: 'Apple silicon', detail: 'M1 and later' },
  { arch: 'x64', label: 'Intel', detail: 'Intel-based Macs' },
].map((download) => ({
  ...download,
  href: `${DESKTOP_RELEASES_URL}/latest/download/AgentRelay-macOS-${download.arch}.dmg`,
}));
