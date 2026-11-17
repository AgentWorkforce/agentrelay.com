import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { captureDesktopDownload } from '../desktop-download-analytics';
import { desktopAssetByFile } from '../desktop-downloads';

const asset = desktopAssetByFile('AgentRelay-macOS-arm64.dmg')!;

function fakePostHog(optedOut = false) {
  return { capture: vi.fn(), has_opted_out_capturing: () => optedOut } as unknown as Parameters<typeof captureDesktopDownload>[0] & {
    capture: ReturnType<typeof vi.fn>;
  };
}

describe('captureDesktopDownload', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    vi.stubGlobal('window', { location: { pathname: '/blog' } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends the click with the build, OS, architecture, placement and page, by beacon', () => {
    const ph = fakePostHog();
    captureDesktopDownload(ph, 'clicked', asset, { placement: 'nav' });
    expect(ph.capture).toHaveBeenCalledWith(
      'desktop_download_clicked',
      { build: 'AgentRelay-macOS-arm64.dmg', os: 'macos', arch: 'arm64', path: '/blog', placement: 'nav' },
      { transport: 'sendBeacon' },
    );
  });

  it('sends the start without a placement', () => {
    const ph = fakePostHog();
    captureDesktopDownload(ph, 'started', asset);
    expect(ph.capture).toHaveBeenCalledWith(
      'desktop_download_started',
      { build: 'AgentRelay-macOS-arm64.dmg', os: 'macos', arch: 'arm64', path: '/blog' },
      { transport: 'sendBeacon' },
    );
  });

  it('sends nothing when the visitor opted out or PostHog is not configured', () => {
    const optedOut = fakePostHog(true);
    captureDesktopDownload(optedOut, 'clicked', asset, { placement: 'hero' });
    expect(optedOut.capture).not.toHaveBeenCalled();

    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    const unconfigured = fakePostHog();
    captureDesktopDownload(unconfigured, 'clicked', asset, { placement: 'hero' });
    expect(unconfigured.capture).not.toHaveBeenCalled();
  });
});
