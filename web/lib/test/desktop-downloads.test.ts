import { describe, expect, it } from 'vitest';
import { desktopDownloads, DESKTOP_RELEASES_URL } from '../desktop-downloads';

describe('desktop distribution links', () => {
  it('downloads both Mac builds from the public distribution repo', () => {
    expect(desktopDownloads.map(({ href }) => href)).toEqual([
      'https://github.com/AgentWorkforce/relay-desktop-releases/releases/latest/download/AgentRelay-macOS-arm64.dmg',
      'https://github.com/AgentWorkforce/relay-desktop-releases/releases/latest/download/AgentRelay-macOS-x64.dmg',
    ]);
    expect(DESKTOP_RELEASES_URL).toBe('https://github.com/AgentWorkforce/relay-desktop-releases/releases');
  });
});
