import { describe, expect, it } from 'vitest';
import {
  DOWNLOAD_CLIENT_HINT_HEADERS,
  alternateDesktopAsset,
  DESKTOP_ASSETS,
  desktopAssetUrl,
  detectDesktopPlatform,
  primaryDesktopAsset,
} from '../desktop-downloads';

const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const LINUX_X64 = 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0';
const LINUX_ARM = 'Mozilla/5.0 (X11; Linux aarch64; rv:131.0) Gecko/20100101 Firefox/131.0';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

describe('detectDesktopPlatform', () => {
  it('takes a Mac to be Apple silicon unless Client Hints report x86', () => {
    expect(detectDesktopPlatform(MAC)).toEqual({ os: 'macos', arch: 'arm64' });
    expect(detectDesktopPlatform(MAC, { architecture: 'arm' })).toEqual({ os: 'macos', arch: 'arm64' });
    expect(detectDesktopPlatform(MAC, { architecture: 'x86' })).toEqual({ os: 'macos', arch: 'x64' });
  });

  it('reads the Linux architecture from Client Hints or the user agent', () => {
    expect(detectDesktopPlatform(LINUX_X64)).toEqual({ os: 'linux', arch: 'x64' });
    expect(detectDesktopPlatform(LINUX_ARM)).toEqual({ os: 'linux', arch: 'arm64' });
    expect(detectDesktopPlatform(LINUX_X64, { architecture: 'arm' })).toEqual({ os: 'linux', arch: 'arm64' });
  });

  it('takes Windows to be x64 unless Client Hints report Arm', () => {
    expect(detectDesktopPlatform(WINDOWS)).toEqual({ os: 'windows', arch: 'x64' });
    expect(detectDesktopPlatform(WINDOWS, { architecture: 'arm' })).toEqual({ os: 'windows', arch: 'arm64' });
    expect(detectDesktopPlatform(WINDOWS, { architecture: '"arm"' })).toEqual({ os: 'windows', arch: 'arm64' });
    expect(detectDesktopPlatform(MAC, { architecture: '"x86"' })).toEqual({ os: 'macos', arch: 'x64' });
  });

  it('reads a reduced user agent from the platform client hint', () => {
    expect(detectDesktopPlatform('Mozilla/5.0', { platform: '"Windows"' })).toEqual({ os: 'windows', arch: 'x64' });
    expect(detectDesktopPlatform('Mozilla/5.0', { platform: '"Windows"', architecture: '"arm"' })).toEqual({
      os: 'windows',
      arch: 'arm64',
    });
    expect(detectDesktopPlatform('Mozilla/5.0', { platform: '"macOS"' })).toEqual({ os: 'macos', arch: 'arm64' });
    expect(detectDesktopPlatform('Mozilla/5.0', { platform: '"Linux"' })).toEqual({ os: 'linux', arch: 'x64' });
    expect(detectDesktopPlatform('Mozilla/5.0', { platform: '"Android"' })).toBeNull();
    expect(detectDesktopPlatform('Mozilla/5.0', { platform: '"Chrome OS"' })).toBeNull();
  });

  it('has no build for phones, tablets, or ChromeOS', () => {
    expect(detectDesktopPlatform(MAC, { touchPoints: 5 })).toBeNull();
    expect(detectDesktopPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBeNull();
    expect(detectDesktopPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBeNull();
    expect(detectDesktopPlatform('Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)')).toBeNull();
  });
});

describe('desktop assets', () => {
  it('leads with the DMG on macOS, the Debian package on Linux, and Setup on Windows', () => {
    expect(primaryDesktopAsset({ os: 'macos', arch: 'x64' }).file).toBe('AgentRelay-macOS-x64.dmg');
    expect(primaryDesktopAsset({ os: 'linux', arch: 'arm64' }).file).toBe('AgentRelay-Linux-arm64.deb');
    expect(primaryDesktopAsset({ os: 'windows', arch: 'x64' }).file).toBe('AgentRelay-Windows-x64-Setup.exe');
  });

  it('offers the other architecture on macOS and Windows, and the tarball on Linux', () => {
    expect(alternateDesktopAsset({ os: 'macos', arch: 'arm64' }).file).toBe('AgentRelay-macOS-x64.dmg');
    expect(alternateDesktopAsset({ os: 'windows', arch: 'x64' }).file).toBe('AgentRelay-Windows-arm64-Setup.exe');
    expect(alternateDesktopAsset({ os: 'linux', arch: 'x64' }).file).toBe('AgentRelay-Linux-x64.tar.gz');
  });

  it('lists every build from the latest release', () => {
    expect(DESKTOP_ASSETS.map((asset) => asset.file)).toEqual([
      'AgentRelay-macOS-arm64.dmg',
      'AgentRelay-macOS-x64.dmg',
      'AgentRelay-Linux-x64.deb',
      'AgentRelay-Linux-arm64.deb',
      'AgentRelay-Linux-x64.tar.gz',
      'AgentRelay-Linux-arm64.tar.gz',
      'AgentRelay-Windows-x64-Setup.exe',
      'AgentRelay-Windows-arm64-Setup.exe',
      'AgentRelay-Windows-x64.zip',
      'AgentRelay-Windows-arm64.zip',
    ]);
    expect(desktopAssetUrl('AgentRelay-macOS-arm64.dmg.sha256')).toBe(
      'https://github.com/AgentWorkforce/relay-desktop-releases/releases/latest/download/AgentRelay-macOS-arm64.dmg.sha256',
    );
  });
});

describe('download client hints', () => {
  it('requests architecture on /download before the page is shown', async () => {
    // A variable keeps the untyped config out of the TypeScript module graph,
    // the same way the dashboard header test loads it.
    const configPath: string = '../../next.config.mjs';
    const nextConfig = (await import(configPath)).default;
    const rules = await (await nextConfig('phase-production-server')).headers();
    const rule = rules.find((entry: { source: string }) => entry.source === '/download');
    const headers = Object.fromEntries(
      rule.headers.map((header: { key: string; value: string }) => [header.key, header.value]),
    );
    expect(headers).toEqual(DOWNLOAD_CLIENT_HINT_HEADERS);
  });
});
