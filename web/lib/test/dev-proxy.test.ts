import { afterEach, describe, expect, it, vi } from 'vitest';

// next.config.mjs is untyped JS; load it as a plain module. The server phase
// resolves the config without the build-time npm version lookup.
async function devRewrites(env: Record<string, string>) {
  vi.stubEnv('NODE_ENV', 'development');
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const configPath: string = '../../next.config.mjs';
  const config = await (await import(configPath)).default('phase-production-server');
  return (await config.rewrites()).beforeFiles as Array<{ source: string; destination: string }>;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('next.config local development proxy', () => {
  it('proxies /cloud and the dashboard SPA to loopback dev servers', async () => {
    const rewrites = await devRewrites({
      CLOUD_DEV_ORIGIN: 'http://127.0.0.1:3201',
      DASHBOARD_DEV_ORIGIN: 'http://127.0.0.1:5173',
    });
    expect(rewrites.slice(0, 3)).toEqual([
      { source: '/cloud/:path*', destination: 'http://127.0.0.1:3201/cloud/:path*' },
      { source: '/dashboard', destination: 'http://127.0.0.1:5173/dashboard/index.html' },
      { source: '/dashboard/:path*', destination: 'http://127.0.0.1:5173/dashboard/:path*' },
    ]);
  });

  it('adds no proxy outside the development server', async () => {
    vi.stubEnv('CLOUD_DEV_ORIGIN', 'http://127.0.0.1:3201');
    vi.stubEnv('DASHBOARD_DEV_ORIGIN', 'http://127.0.0.1:5173');
    vi.stubEnv('NODE_ENV', 'production');
    const configPath: string = '../../next.config.mjs';
    const config = await (await import(configPath)).default('phase-production-server');
    const sources = (await config.rewrites()).beforeFiles.map((r: { source: string }) => r.source);
    expect(sources).not.toContain('/cloud/:path*');
    expect(sources).not.toContain('/dashboard');
    expect(sources).not.toContain('/dashboard/:path*');
  });

  it.each([
    'https://127.0.0.1:5173',
    'http://example.com:5173',
    'http://user:pass@127.0.0.1:5173',
    'http://127.0.0.1:5173/dashboard',
    'http://127.0.0.1:5173/?x=1',
  ])('rejects a non-loopback or non-origin dashboard target %s', async (value) => {
    await expect(devRewrites({ DASHBOARD_DEV_ORIGIN: value })).rejects.toThrow(
      'DASHBOARD_DEV_ORIGIN must be an HTTP loopback origin',
    );
  });
});
