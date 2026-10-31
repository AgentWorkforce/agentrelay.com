import assert from 'node:assert/strict';
import test from 'node:test';
import config from '../../next.config.mjs';

test('dashboard proxy is loopback-only and development-only', async () => {
  const previousMode = process.env.NODE_ENV;
  const previousOrigin = process.env.DASHBOARD_DEV_ORIGIN;
  try {
    process.env.NODE_ENV = 'development';
    process.env.DASHBOARD_DEV_ORIGIN = 'http://127.0.0.1:5173';
    const c = await config();
    assert((await c.rewrites()).beforeFiles.some(rule =>
      rule.source === '/dashboard/:path*' && rule.destination === 'http://127.0.0.1:5173/dashboard/:path*'));
    process.env.DASHBOARD_DEV_ORIGIN = 'https://evil.example';
    await assert.rejects(() => c.rewrites(), /loopback/);
    process.env.NODE_ENV = 'production';
    assert(!(await c.rewrites()).beforeFiles.some(rule => rule.source === '/dashboard/:path*'));
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode;
    if (previousOrigin === undefined) delete process.env.DASHBOARD_DEV_ORIGIN; else process.env.DASHBOARD_DEV_ORIGIN = previousOrigin;
  }
});
