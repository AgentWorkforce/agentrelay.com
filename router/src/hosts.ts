// The apex marketing/docs site host. Redirects that leave arelay.to, and other
// absolute URLs the router mints for people, keep pointing here.
export const PRIMARY_HOST = "agentrelay.com";

// Hosts that serve exactly what agentrelay.com serves, through the same routing
// rules. public.agentrelay.com is a custom domain on the production router;
// public-staging.agentrelay.com is a custom domain on the staging router
// (wrangler `env.staging`), which serves a separate staging web build. The
// production router never receives public-staging traffic and vice versa, so
// one list serves both deployments.
//
// public-staging.agentrelay.com also gets staging routing (isStagingRouting in
// index.ts): its /cloud* never reaches production Cloud.
//
// These aliases are not indexed: every response on them carries
// `X-Robots-Tag: noindex` (see withAliasHostHeaders), and the site's canonical
// URLs, sitemap and robots.txt already name https://agentrelay.com.
export const PRIMARY_HOST_ALIASES: ReadonlySet<string> = new Set([
  "public.agentrelay.com",
  "public-staging.agentrelay.com",
]);

export const PUBLIC_HOST = "public.agentrelay.com";
export const STAGING_HOST = "public-staging.agentrelay.com";

export function isStagingHost(hostname: string): boolean {
  return hostname === STAGING_HOST;
}

// True for agentrelay.com and every alias that must behave identically to it.
export function isPrimaryHost(hostname: string): boolean {
  return hostname === PRIMARY_HOST || PRIMARY_HOST_ALIASES.has(hostname);
}

export function isPrimaryHostAlias(hostname: string): boolean {
  return PRIMARY_HOST_ALIASES.has(hostname);
}

// Keeps the aliases out of search results so they never compete with
// agentrelay.com. agentrelay.com responses are returned untouched.
export function withAliasHostHeaders(request: Request, response: Response): Response {
  if (!isPrimaryHostAlias(new URL(request.url).hostname)) {
    return response;
  }
  // A WebSocket upgrade must be returned as-is; re-wrapping would drop it.
  if (response.status === 101 || (response as Response & { webSocket?: unknown }).webSocket) {
    return response;
  }
  const tagged = new Response(response.body, response);
  tagged.headers.set("x-robots-tag", "noindex");
  return tagged;
}
