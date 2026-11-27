import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../app/download/start/DownloadStatus', () => ({
  DownloadStatus: ({ asset }: { asset: { file: string } }) => <span data-download={asset.file}>Download started</span>,
}));

import DownloadStartPage from '../../app/download/start/page';
import { DESKTOP_ASSETS, desktopAssetUrl } from '../desktop-downloads';

async function render(build?: string | string[]) {
  return renderToStaticMarkup(await DownloadStartPage({ searchParams: Promise.resolve({ build }) }));
}

describe('download start page', () => {
  it.each(DESKTOP_ASSETS.filter((asset) => asset.os === 'macos'))('shows installation steps and matching retry for $label', async (asset) => {
    const html = await render(asset.file);
    expect(html).toContain('Install and open Agent Relay');
    expect(html).toContain('aria-label="Install Agent Relay on your Mac"');
    expect(html).toContain('Step 1');
    expect(html).toContain('Step 2');
    expect(html).toContain('Step 3');
    expect(html).toContain('Downloads folder');
    expect(html).toContain('Drag Agent Relay into your');
    expect(html).toContain('then sign in to connect your agents');
    expect(html).toContain(`data-download="${asset.file}"`);
    expect(html).toContain(`href="${desktopAssetUrl(asset.file)}"`);
    expect(html).not.toContain('Runs quietly in the background');
  });

  it.each(DESKTOP_ASSETS.filter((asset) => asset.os !== 'macos'))('retains the existing page for $label $kind', async (asset) => {
    const html = await render(asset.file);
    expect(html).toContain('Let your agents talk to each other');
    expect(html).toContain('Runs quietly in the background');
    expect(html).toContain('Shares only what you choose');
    expect(html).toContain(`data-download="${asset.file}"`);
    expect(html).toContain(`href="${desktopAssetUrl(asset.file)}"`);
    expect(html).not.toContain('Install and open Agent Relay');
  });

  it.each([undefined, 'unknown.dmg', ['AgentRelay-macOS-arm64.dmg']])('retains the fallback for invalid build %s', async (build) => {
    const html = await render(build);
    expect(html).toContain('Let your agents talk to each other');
    expect(html).toContain('Get the app for your machine');
    expect(html).not.toContain('data-download=');
    expect(html).not.toContain('Download again');
  });
});
