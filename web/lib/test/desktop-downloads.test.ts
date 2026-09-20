import { describe, expect, it } from 'vitest';

import {
  MAC_ARM64_DOWNLOAD_URL,
  MAC_X64_DOWNLOAD_URL,
  RELAY_DESKTOP_RELEASES_URL,
  desktopDownloads,
} from '../desktop-downloads';

const REPO_PREFIX = 'https://github.com/AgentWorkforce/relay-desktop';

describe('desktop downloads', () => {
  it('points every link at the relay-desktop repository on github.com', () => {
    for (const url of [MAC_ARM64_DOWNLOAD_URL, MAC_X64_DOWNLOAD_URL, RELAY_DESKTOP_RELEASES_URL]) {
      expect(new URL(url).host).toBe('github.com');
      expect(url.startsWith(`${REPO_PREFIX}/`)).toBe(true);
    }
  });

  it('resolves the latest release asset for each architecture', () => {
    expect(MAC_ARM64_DOWNLOAD_URL).toBe(
      `${REPO_PREFIX}/releases/latest/download/AgentRelay-macOS-arm64.dmg`,
    );
    expect(MAC_X64_DOWNLOAD_URL).toBe(
      `${REPO_PREFIX}/releases/latest/download/AgentRelay-macOS-x64.dmg`,
    );
    expect(MAC_ARM64_DOWNLOAD_URL.endsWith('AgentRelay-macOS-arm64.dmg')).toBe(true);
    expect(MAC_X64_DOWNLOAD_URL.endsWith('AgentRelay-macOS-x64.dmg')).toBe(true);
  });

  it('links the releases index without an asset path', () => {
    expect(RELAY_DESKTOP_RELEASES_URL).toBe(`${REPO_PREFIX}/releases`);
  });

  it('lists Apple silicon first with labelled, unique download links', () => {
    const downloads = desktopDownloads();

    expect(downloads.map((download) => download.id)).toEqual(['mac-arm64', 'mac-x64']);
    expect(downloads.map((download) => download.label)).toEqual([
      'Download for Apple silicon',
      'Download for Intel Mac',
    ]);
    expect(downloads.map((download) => download.href)).toEqual([
      MAC_ARM64_DOWNLOAD_URL,
      MAC_X64_DOWNLOAD_URL,
    ]);
    for (const download of downloads) {
      expect(download.href.endsWith('.dmg')).toBe(true);
      expect(download.note.length).toBeGreaterThan(0);
    }
  });
});
