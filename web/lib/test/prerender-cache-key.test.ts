import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';
// The real key builder, so this fails if a Next upgrade changes the key shape
// again instead of silently missing the prerender cache in production.
import { getRouteCacheKey } from 'next/dist/server/lib/route-cache-key';
import type { RouteKind } from 'next/dist/server/route-kind';

import { toPrerenderCacheKey } from '../prerender-cache-key';

// RouteKind is a const enum, which isolatedModules cannot import as a value.
const appPage = (page: string) => ({ kind: 'APP_PAGE' as RouteKind, sourceRoute: page });

describe('toPrerenderCacheKey', () => {
  it('maps a static page key to its page path', () => {
    expect(toPrerenderCacheKey(getRouteCacheKey('/flows', appPage('/flows/page')))).toBe('/flows');
  });

  it('maps a generateStaticParams page key to its concrete path', () => {
    const key = getRouteCacheKey('/docs/introduction', appPage('/docs/[slug]/page'));
    expect(toPrerenderCacheKey(key)).toBe('/docs/introduction');
  });

  it('maps the root page to /index, matching the stored index.cache', () => {
    expect(toPrerenderCacheKey(getRouteCacheKey('/', appPage('/page')))).toBe('/index');
  });

  it('accepts the documented key shape literally', () => {
    const hash = createHash('sha256').update('/flows/page').digest('hex');
    expect(toPrerenderCacheKey(`/route-cache/APP_PAGE/${hash}/$/flows`)).toBe('/flows');
  });

  it('passes through keys that are not route-scoped', () => {
    expect(toPrerenderCacheKey('/flows')).toBe('/flows');
    expect(toPrerenderCacheKey('docs/introduction')).toBe('docs/introduction');
    expect(toPrerenderCacheKey('44fe800491717aa4131a86c6f5e0985967ffe4edf6c95db62d6512d94188fd5f')).toBe(
      '44fe800491717aa4131a86c6f5e0985967ffe4edf6c95db62d6512d94188fd5f',
    );
  });
});
