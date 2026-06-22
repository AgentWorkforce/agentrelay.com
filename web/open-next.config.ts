import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Marketing/docs site: static + SSG pages (docs MDX is read from disk at BUILD
// time) plus a few dynamic routes and the PostHog proxy middleware.
//
// The static-assets incremental cache serves all prerendered/SSG pages straight
// from the deployed ASSETS binding, so the Worker never re-renders them at
// request time. This is essential here: the docs pages read content/docs from
// the filesystem, and the Cloudflare Workers runtime stubs Node `fs`
// (unenv) — so any runtime re-render of a docs page would fail. Serving the
// prerendered output from assets avoids that entirely. No R2/KV needed.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
