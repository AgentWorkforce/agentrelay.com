import { describe, expect, it } from 'vitest';

import {
  LINUX_TARBALLS,
  downloadFor,
  detectDesktopDownload,
  downloadLabel,
} from '../desktop-downloads';

const WINDOWS_X64 =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const WINDOWS_ARM64 =
  'Mozilla/5.0 (Windows NT 10.0; Win64; ARM64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const MAC_APPLE_SILICON =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15';
const LINUX_X64 =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

describe('desktop downloads', () => {
  it('detects Windows and recommends the Windows zip, not the Mac disk image', () => {
    const detected = detectDesktopDownload({ userAgent: WINDOWS_X64 });

    expect(detected?.platform).toBe('windows');
    expect(detected?.arch).toBe('x64');
    expect(detected?.filename).toBe('AgentRelay-Windows-x64.zip');
    expect(detected?.url).toBe(
      'https://github.com/AgentWorkforce/relay-desktop-releases/releases/latest/download/AgentRelay-Windows-x64.zip',
    );
    expect(downloadLabel(detected!)).toBe('Download for Windows (x64)');
  });

  it('uses Client Hints or the user agent to pick Windows on Arm', () => {
    expect(
      detectDesktopDownload({ userAgent: WINDOWS_X64, architecture: '"arm"' })?.filename,
    ).toBe('AgentRelay-Windows-arm64.zip');
    expect(detectDesktopDownload({ userAgent: WINDOWS_ARM64 })?.filename).toBe(
      'AgentRelay-Windows-arm64.zip',
    );
  });

  it('uses the Sec-CH-UA-Platform header when the user agent is reduced', () => {
    expect(
      detectDesktopDownload({ userAgent: 'Mozilla/5.0', platform: '"Windows"' })?.platform,
    ).toBe('windows');
    expect(
      detectDesktopDownload({ userAgent: 'Mozilla/5.0', platform: '"macOS"' })?.platform,
    ).toBe('macos');
  });

  it('defaults Macs to Apple silicon and honors an Intel Client Hint', () => {
    expect(detectDesktopDownload({ userAgent: MAC_APPLE_SILICON })?.filename).toBe(
      'AgentRelay-macOS-arm64.dmg',
    );
    expect(
      detectDesktopDownload({ userAgent: MAC_APPLE_SILICON, architecture: '"x86"' })?.filename,
    ).toBe('AgentRelay-macOS-x64.dmg');
  });

  it('detects Linux and links both package formats', () => {
    expect(detectDesktopDownload({ userAgent: LINUX_X64 })?.filename).toBe('AgentRelay-Linux-x64.deb');
    expect(LINUX_TARBALLS.x64).toMatch(/AgentRelay-Linux-x64\.tar\.gz$/);
    expect(LINUX_TARBALLS.arm64).toMatch(/AgentRelay-Linux-arm64\.tar\.gz$/);
  });

  it('offers every option when the platform is unclear or not a desktop', () => {
    expect(detectDesktopDownload({ userAgent: 'curl/8.0' })).toBeNull();
    expect(
      detectDesktopDownload({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      }),
    ).toBeNull();
    expect(
      detectDesktopDownload({
        userAgent:
          'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      }),
    ).toBeNull();
    expect(downloadFor('windows', 'arm64').format).toBe('zip');
  });
});
