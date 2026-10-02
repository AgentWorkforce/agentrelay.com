// Next.js 16.3.8 scopes response-cache keys to the route that owns them: a
// prerendered page is looked up as
//
//   /route-cache/<ROUTE_KIND>/<sha256 of the source route>/$<page path>
//
// (see next/dist/server/lib/route-cache-key.js). The OpenNext static-assets
// incremental cache still stores build-time prerenders by plain page path
// (<build id>/<page path>.cache), so the scoped key never matches a file and
// every page falls through to a runtime render — which 500s for pages that
// cannot render in the Workers runtime.
//
// This maps a scoped key back to the plain page path the cache is stored under.
// Keys in any other shape (older Next versions, fetch cache) pass through.
const ROUTE_CACHE_KEY = /^\/?route-cache\/[^/]+\/[0-9a-f]{64}\/\$(.*)$/;

export function toPrerenderCacheKey(key: string): string {
  const match = ROUTE_CACHE_KEY.exec(key);
  return match ? match[1] : key;
}
