// On public.agentrelay.com and public-staging.agentrelay.com, sign-in, the
// dashboard and every Cloud path go to the new EKS stack (relay-webapp, with
// relay-control behind it), never to the old Cloud. They are REDIRECTS, not
// proxied: the new Control accepts browser sign-in and cookie writes only from
// its canonical origin (https://app.public.agentrelay.com), so a Worker proxy
// would present the wrong Origin and be refused.
//
// agentrelay.com, www.agentrelay.com and arelay.to never take this path.
import { PUBLIC_HOST, STAGING_HOST } from "./hosts.js";

// The dashboard origin each alias sends people to. PUBLIC_APP_ORIGIN (set in
// router/wrangler.jsonc per environment) overrides it only for the alias that
// environment serves: production for public.*, ROUTER_ENV=staging for
// public-staging.*. So staging can never be sent to the production dashboard.
export const DEFAULT_PUBLIC_APP_ORIGINS: Readonly<Record<string, string>> = {
  [PUBLIC_HOST]: "https://app.public.agentrelay.com",
  [STAGING_HOST]: "https://app.public-staging.agentrelay.com",
};

export type PublicAppEnv = { PUBLIC_APP_ORIGIN?: string; ROUTER_ENV?: string };

function validOrigin(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

export function publicAppOrigin(env: PublicAppEnv, hostname: string): string | undefined {
  const fallback = DEFAULT_PUBLIC_APP_ORIGINS[hostname];
  if (!fallback) return undefined;
  const envServesHost = hostname === STAGING_HOST ? env.ROUTER_ENV === "staging" : env.ROUTER_ENV !== "staging";
  return (envServesHost ? validOrigin(env.PUBLIC_APP_ORIGIN) : undefined) ?? fallback;
}

function within(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// Paths the dashboard host routes to relay-control at the ALB (the infra
// chart's eksDefaultControlPaths), kept as they are.
const CONTROL_PATHS = [
  "/cloud/api", "/cloud/mcp", "/cloud/.well-known", "/cloud/oauth", "/mcp", "/login",
  "/.well-known/oauth-protected-resource", "/.well-known/oauth-authorization-server",
  "/.well-known/openid-configuration",
];
// Cloud APIs the marketing site itself calls same-origin with a bearer token
// (web/lib/teams-cloud.ts teamsCloudUrl): the webhook inbox in
// EventsShimTry and the Flows/agent signup journey in AgentSignupJourney.
// They are never redirected: fetch drops Authorization when it follows a
// redirect to another origin, so those calls would fail. They keep their
// pre-redirect routing.
const SAME_ORIGIN_CLOUD_API_PATHS = ["/cloud/api/v1/events-shim", "/cloud/api/v1/signup/agent"];
// Old Cloud invite links (agentrelay.com/connect/<id>, served by Cloud).
const CONNECT_INVITE_PATH = /^\/connect\/[A-Za-z0-9_-]{32,64}(?:\.(?:json|md))?\/?$/i;

/**
 * The dashboard-host path for a request path on an alias, or undefined when
 * the path stays with the marketing site.
 *
 *   /login                          -> /login            (Control sign-in)
 *   /cloud/api/**, /cloud/mcp, /cloud/.well-known/**, /cloud/oauth/**,
 *   /mcp, /.well-known/oauth-*, /.well-known/openid-configuration*
 *                                   -> same path         (Control at the ALB)
 *   /cloud, /cloud/                 -> /
 *   /cloud/dashboard[/<rest>]       -> /<rest>
 *   /cloud/<rest>                   -> /<rest>           (relay-webapp)
 *   /dashboard[/<rest>]             -> /<rest>
 *   /connect/<id>                   -> /connect/<id>     (same as /cloud/connect/<id>)
 *   /cloud/api/v1/events-shim/**, /cloud/api/v1/signup/agent/**
 *                                   -> undefined         (same-origin site APIs, not redirected)
 */
export function publicAppPath(pathname: string): string | undefined {
  if (SAME_ORIGIN_CLOUD_API_PATHS.some((prefix) => within(pathname, prefix))) return undefined;
  if (pathname === "/login/") return "/login";
  if (CONTROL_PATHS.some((prefix) => within(pathname, prefix))) return pathname;
  if (CONNECT_INVITE_PATH.test(pathname)) return pathname;
  for (const mount of ["/cloud/dashboard", "/dashboard", "/cloud"]) {
    if (within(pathname, mount)) return pathname.slice(mount.length) || "/";
  }
  return undefined;
}

/**
 * GET/HEAD get a 302. Other methods get a 307, which keeps the method and
 * body (a 302/303 would turn a POST into a GET). no-store throughout, so no
 * cache pins a visitor to a target during the cutover.
 */
export function publicAppRedirect(url: URL, method: string, env: PublicAppEnv, pathname = url.pathname): Response | undefined {
  const origin = publicAppOrigin(env, url.hostname);
  if (!origin) return undefined;
  const path = publicAppPath(pathname);
  if (path === undefined) return undefined;
  return new Response(null, {
    status: method === "GET" || method === "HEAD" ? 302 : 307,
    headers: { Location: `${origin}${path}${url.search}`, "Cache-Control": "no-store" },
  });
}
