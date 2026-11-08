import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../components/SiteFooter', () => ({ SiteFooter: () => null }));
vi.mock('../../components/SiteNav', () => ({ SiteNav: () => null }));
vi.mock('../use-desktop-platform', () => ({ useDesktopPlatform: vi.fn() }));

import DownloadPage from '../../app/download/page';
import { DownloadButton } from '../../app/download/DownloadButton';
import { DESKTOP_ASSETS, desktopAssetUrl, desktopStartHref, type DesktopPlatform } from '../desktop-downloads';
import { useDesktopPlatform } from '../use-desktop-platform';

const platformMock = vi.mocked(useDesktopPlatform);

function expectInstallerLink(html: string, file: string, macos: boolean) {
  expect(html).toContain(`href="${macos ? desktopStartHref(file) : desktopAssetUrl(file)}"`);
  if (macos) expect(html).not.toContain(`href="${desktopAssetUrl(file)}"`);
}

describe('public download page links', () => {
  beforeEach(() => platformMock.mockReturnValue(undefined));

  it('routes both Mac catalog builds through the guide and retains other installers and checksums', () => {
    const html = renderToStaticMarkup(<DownloadPage />);
    for (const asset of DESKTOP_ASSETS) {
      expectInstallerLink(html, asset.file, asset.os === 'macos');
      expect(html).toContain(`href="${desktopAssetUrl(`${asset.file}.sha256`)}"`);
    }
  });

  it.each([undefined, null])('routes the fallback Mac choice through the guide for %s detection', (platform) => {
    platformMock.mockReturnValue(platform);
    const html = renderToStaticMarkup(<DownloadButton />);
    for (const os of ['macos', 'linux', 'windows']) {
      const asset = DESKTOP_ASSETS.find((asset) => asset.os === os)!;
      expectInstallerLink(html, asset.file, os === 'macos');
    }
  });

  it.each<DesktopPlatform>([
    { os: 'macos', arch: 'arm64' }, { os: 'macos', arch: 'x64' },
    { os: 'windows', arch: 'x64' }, { os: 'linux', arch: 'arm64' },
  ])('preserves detected $os $arch primary and alternate destinations', (platform) => {
    platformMock.mockReturnValue(platform);
    const html = renderToStaticMarkup(<DownloadButton />);
    const assets = platform.os === 'linux'
      ? DESKTOP_ASSETS.filter((asset) => asset.os === 'linux' && asset.arch === platform.arch)
      : DESKTOP_ASSETS.filter((asset) => asset.os === platform.os && (platform.os === 'macos' || asset.kind === 'installer'));
    for (const asset of assets) expectInstallerLink(html, asset.file, asset.os === 'macos');
    expect(html).toContain('.sha256"');
  });
});
