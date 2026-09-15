import { describe, expect, it } from 'vitest';

import { getWebsiteAnalyticsPage } from '../site-analytics';

describe('getWebsiteAnalyticsPage', () => {
  it('tracks the landing page and every onboarding route', () => {
    for (const pathname of ['/flows', '/flows/onboarding', ...['sources', 'agents', 'task', 'connections'].map(stage => `/flows/onboarding/${stage}`)]) {
      expect(getWebsiteAnalyticsPage(pathname)).toEqual({ pageGroup: 'flows', pathname });
    }
  });
  it('tracks docs routes', () => {
    expect(getWebsiteAnalyticsPage('/docs/quickstart')).toEqual({
      pageGroup: 'docs',
      pathname: '/docs/quickstart',
    });
  });

  it('tracks blog routes', () => {
    expect(getWebsiteAnalyticsPage('/blog/go-to-bed-wake-up-to-a-finished-product')).toEqual({
      pageGroup: 'blog',
      pathname: '/blog/go-to-bed-wake-up-to-a-finished-product',
    });
  });

  it('tracks public catalog-style routes', () => {
    expect(getWebsiteAnalyticsPage('/skill')).toEqual({
      pageGroup: 'skill',
      pathname: '/skill',
    });

    expect(getWebsiteAnalyticsPage('/openclaw/skill')).toEqual({
      pageGroup: 'openclaw',
      pathname: '/openclaw/skill',
    });
  });

  it('does not track invite-token routes', () => {
    expect(getWebsiteAnalyticsPage('/openclaw/skill/invite/rk_live_example')).toBeNull();
  });

  it('does not track unrelated routes', () => {
    expect(getWebsiteAnalyticsPage('/telemetry')).toBeNull();
  });
});
