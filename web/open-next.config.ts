import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";
import type { IncrementalCache } from "@opennextjs/aws/types/overrides.js";

import { toPrerenderCacheKey } from "./lib/prerender-cache-key";

// Marketing/docs site: static + SSG pages (docs MDX is read from disk at BUILD
// time) plus a few dynamic routes and the PostHog proxy middleware.
//
// The static-assets incremental cache serves all prerendered/SSG pages straight
// from the deployed ASSETS binding, so the Worker never re-renders them at
// request time. This is essential here: the docs pages read content/docs from
// the filesystem, and the Cloudflare Workers runtime stubs Node `fs`
// (unenv) — so any runtime re-render of a docs page would fail. Serving the
// prerendered output from assets avoids that entirely. No R2/KV needed.
//
// Next 16.3.8 asks for prerendered pages under a route-scoped key the
// static-assets cache does not store them under, so translate the key back to
// the page path before the lookup. Without this every page misses the cache.
const incrementalCache: IncrementalCache = {
  name: staticAssetsIncrementalCache.name,
  get: (key, cacheType) => staticAssetsIncrementalCache.get(toPrerenderCacheKey(key), cacheType),
  set: (key, value, cacheType) => staticAssetsIncrementalCache.set(toPrerenderCacheKey(key), value, cacheType),
  // Read-only cache: delete takes no key and only logs.
  delete: () => staticAssetsIncrementalCache.delete(),
};

export default defineCloudflareConfig({
  incrementalCache,
});
