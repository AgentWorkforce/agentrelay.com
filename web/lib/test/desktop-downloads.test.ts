import { describe, expect, it } from 'vitest';
import {
  DESKTOP_RELEASES_URL,
  desktopBuilds,
  detectPlatform,
  parseLatestRelease,
  recommendedBuild,
  type PlatformSignals,
} from '../desktop-downloads';

const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const S3TC_SRGB = 'WEBGL_compressed_texture_s3tc_srgb';

function mac(extra: Partial<PlatformSignals>): PlatformSignals {
  return { userAgent: MAC_UA, platform: 'MacIntel', maxTouchPoints: 0, ...extra };
}

describe('desktop distribution links', () => {
  it('downloads every build from the public distribution repo by stable name', () => {
    expect(desktopBuilds.map(({ href }) => href)).toEqual([
      `${DESKTOP_RELEASES_URL}/latest/download/AgentRelay-macOS-arm64.dmg`,
      `${DESKTOP_RELEASES_URL}/latest/download/AgentRelay-macOS-x64.dmg`,
      `${DESKTOP_RELEASES_URL}/latest/download/AgentRelay-Linux-x64.deb`,
      `${DESKTOP_RELEASES_URL}/latest/download/AgentRelay-Linux-arm64.deb`,
      `${DESKTOP_RELEASES_URL}/latest/download/AgentRelay-Linux-x64.tar.gz`,
      `${DESKTOP_RELEASES_URL}/latest/download/AgentRelay-Linux-arm64.tar.gz`,
    ]);
    expect(DESKTOP_RELEASES_URL).toBe('https://github.com/AgentWorkforce/relay-desktop-releases/releases');
  });
});

describe('detectPlatform', () => {
  it('trusts UA client hints for the Mac architecture', () => {
    expect(detectPlatform(mac({ uaArchitecture: 'arm' }))).toEqual({ os: 'mac', arch: 'arm64', confident: true });
    expect(detectPlatform(mac({ uaArchitecture: 'x86' }))).toEqual({ os: 'mac', arch: 'x64', confident: true });
  });

  it('reads the WebGL renderer when it is unmasked', () => {
    expect(detectPlatform(mac({ webglRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)' })).arch).toBe('arm64');
    expect(detectPlatform(mac({ webglRenderer: 'ANGLE (Intel Inc., Intel(R) Iris(TM) Plus Graphics 655, OpenGL 4.1)' })).arch).toBe('x64');
  });

  it('uses S3TC sRGB support when Safari masks the renderer', () => {
    expect(detectPlatform(mac({ webglRenderer: 'Apple GPU', webglExtensions: ['OES_texture_float'] })).arch).toBe('arm64');
    expect(detectPlatform(mac({ webglRenderer: 'Apple GPU', webglExtensions: ['OES_texture_float', S3TC_SRGB] })).arch).toBe('x64');
  });

  it('defaults an undetectable Mac to Apple silicon without claiming confidence', () => {
    expect(detectPlatform(mac({}))).toEqual({ os: 'mac', arch: 'arm64', confident: false });
  });

  it('separates phones, iPads, Windows and Linux', () => {
    expect(detectPlatform({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' }).os).toBe('mobile');
    expect(detectPlatform(mac({ maxTouchPoints: 5 })).os).toBe('mobile');
    expect(detectPlatform({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32' }).os).toBe('windows');
    expect(detectPlatform({ userAgent: 'Mozilla/5.0 (X11; Linux aarch64)', platform: 'Linux aarch64' })).toEqual({ os: 'linux', arch: 'arm64', confident: true });
    expect(detectPlatform({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', platform: 'Linux x86_64' })).toEqual({ os: 'linux', arch: 'x64', confident: true });
  });
});

describe('recommendedBuild', () => {
  it('offers the matching installer, falling back to Apple silicon', () => {
    expect(recommendedBuild({ os: 'mac', arch: 'x64', confident: true })?.id).toBe('mac-x64');
    expect(recommendedBuild({ os: 'linux', arch: 'arm64', confident: true })?.id).toBe('linux-arm64-deb');
    expect(recommendedBuild({ os: 'mac', arch: 'arm64', confident: false })?.id).toBe('mac-arm64');
  });

  it('recommends nothing on platforms the app does not run on', () => {
    expect(recommendedBuild({ os: 'windows', arch: null, confident: false })).toBeNull();
    expect(recommendedBuild({ os: 'mobile', arch: null, confident: false })).toBeNull();
    expect(recommendedBuild({ os: 'unknown', arch: null, confident: false })).toBeNull();
  });
});

describe('parseLatestRelease', () => {
  it('maps stable asset sizes and strips the tag prefix', () => {
    const release = parseLatestRelease({
      tag_name: 'v2026.09.17',
      published_at: '2026-09-30T15:51:38Z',
      html_url: `${DESKTOP_RELEASES_URL}/tag/v2026.09.17`,
      assets: [
        { name: 'AgentRelay-2026.09.17-macOS-arm64.dmg', size: 1 },
        { name: 'AgentRelay-macOS-arm64.dmg', size: 9633775 },
        { name: 'AgentRelay-Linux-x64.deb', size: 3890000 },
      ],
    });
    expect(release.version).toBe('2026.09.17');
    expect(release.sizes).toEqual({ 'mac-arm64': 9633775, 'linux-x64-deb': 3890000 });
  });
});
