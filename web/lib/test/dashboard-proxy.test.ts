import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Match the existing Next config tests: the server phase avoids build-time
// package lookups, and a variable path permits importing the untyped JS config.
async function dashboardRewrites() {
  const configPath: string = '../../next.config.mjs';
  const config = await (await import(configPath)).default('phase-production-server');
  const { beforeFiles } = await config.rewrites();
  return beforeFiles.filter((rule: { source: string }) => rule.source.startsWith('/dashboard'));
}

describe('development dashboard proxy', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CLOUD_DEV_ORIGIN', undefined);
    vi.stubEnv('DASHBOARD_DEV_ORIGIN', undefined);
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each(['http://localhost:5173', 'http://127.0.0.1:5173', 'http://[::1]:5173'])(
    'proxies the root and nested Vite paths through %s',
    async (origin) => {
      vi.stubEnv('DASHBOARD_DEV_ORIGIN', origin);
      expect(await dashboardRewrites()).toEqual([
        { source: '/dashboard', destination: `${origin}/dashboard/index.html` },
        { source: '/dashboard/:path+', destination: `${origin}/dashboard/:path+` },
      ]);
    },
  );

  it.each([
    'https://localhost:5173',
    'http://example.com:5173',
    'http://localhost.example.com:5173',
    'http://user:password@localhost:5173',
    'http://localhost:5173/path',
    'http://localhost:5173/?query=1',
    'http://localhost:5173/#fragment',
  ])('rejects the unsafe origin %s', async (origin) => {
    vi.stubEnv('DASHBOARD_DEV_ORIGIN', origin);
    await expect(dashboardRewrites()).rejects.toThrow(/loopback/);
  });

  it('leaves the proxy absent when no origin is configured', async () => {
    expect(await dashboardRewrites()).toEqual([]);
  });

  it.each(['production', 'test'])('never enables the proxy in %s mode', async (mode) => {
    vi.stubEnv('NODE_ENV', mode);
    vi.stubEnv('DASHBOARD_DEV_ORIGIN', 'http://127.0.0.1:5173');
    expect(await dashboardRewrites()).toEqual([]);
    vi.stubEnv('DASHBOARD_DEV_ORIGIN', 'https://example.com');
    expect(await dashboardRewrites()).toEqual([]);
  });
});
