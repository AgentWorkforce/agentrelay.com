import { maybeRecord, type RecorderEnv } from "./src/recorder.js";
import { maybeRateLimit, type RateLimitEnv } from "./src/rate-limit.js";

interface Env {
  CLOUD_APP_ORIGIN: string;
  CLOUD_WEB_WORKER?: {
    fetch(request: Request): Promise<Response>;
  };
  FILE_OBSERVER_ORIGIN?: string;
  TRAFFIC_RECORDER?: RecorderEnv["TRAFFIC_RECORDER"];
  ROUTER_CONFIG?: RecorderEnv["ROUTER_CONFIG"];
  RATE_LIMIT_COUNTERS?: RateLimitEnv["RATE_LIMIT_COUNTERS"];
  RELAY_AGENT_WORKER?: {
    fetch(request: Request): Promise<Response>;
  };
  RELAY_AGENT_ORIGIN?: string;
  WEBHOOK_WORKER?: {
    fetch(request: Request): Promise<Response>;
  };
  WEBHOOK_WORKER_ORIGIN?: string;
}

function hasRecorderEnv(env: Env): env is Env & RecorderEnv {
  return Boolean(env.TRAFFIC_RECORDER && env.ROUTER_CONFIG);
}

// The apex agentrelay.com marketing/docs site. Served by the standalone
// agentrelay.com repo on Cloudflare Workers (OpenNext); the legacy AWS origin
// at origin.agentrelay.net is retired. See AgentWorkforce/agentrelay.com.
const FALLBACK_PROXY_ORIGIN = "https://origin-web.agentrelay.com";
const OBSERVER_ORIGIN = "https://observer.relaycast.dev";
const DEFAULT_FILE_OBSERVER_ORIGIN = "https://relayfile-file-observer.pages.dev";
const PRIMARY_HOST = "agentrelay.com";
const FILE_OBSERVER_PATH_PREFIX = "/observer/file";
const OBSERVER_PATH_PREFIX = "/observer";
const CLOUD_PATH_PREFIX = "/cloud";
// Relay Connect invite links are advertised as agentrelay.com/connect/<id>, but
// the invite route lives in the cloud app (basePath /cloud). Only the single
// opaque-ID segment (with an optional trailing slash) is claimed; /connect
// itself stays with the marketing site.
const CONNECT_INVITE_PATH = /^(\/connect\/[A-Za-z0-9_-]{32,64}(?:\.(?:json|md))?)\/?$/i;
// arelay.to is the short public front door for agent chat. It serves the same
// site, but its bare root and the signed-in cloud app send people to agentrelay.com.
const SHORT_HOST = "arelay.to";
const SHORT_HOST_WWW = "www.arelay.to";
// A visitor's coding agent chats through /<handle>/<32 hex id>. arelay.to
// accepts every handle-shaped slug and lets relay-agent's registry decide
// whether it exists. agentrelay.com retains its established agent-relay route.
const AGENT_CHAT_PATH = /^\/([a-z0-9-]+)\/([0-9a-f]{32})\/?$/;
const REGISTRY_API_PATH = /^\/api\/v1\/(?:registrations|agents)(?:\/|$)/;
const WEBHOOK_ORIGIN_FLAG_KEY = "WEBHOOK_ORIGIN";
export const WILL_CALENDAR_URL = "https://calendar.app.google/RqLuQyT3dYe5e2YdA";
export const KHALIQ_CALENDAR_URL = "https://calendly.com/khaliq-agent-relay/30min";
const VIRTUAL_OFFICE_URL = "https://meet.google.com/ijx-gpfb-brt";
const VANITY_REDIRECTS = new Map<string, string>([
  ["/meet-with-will", WILL_CALENDAR_URL],
  ["/will", WILL_CALENDAR_URL],
  ["/meet-with-khaliq", KHALIQ_CALENDAR_URL],
  ["/khaliq", KHALIQ_CALENDAR_URL],
  ["/virtual-office", VIRTUAL_OFFICE_URL],
]);

// Header set by webhook-worker's queue consumer
// (`packages/webhook-worker/src/queue-consumer.ts`'s `buildForwardHeaders`) on
// outbound forwards to cloud-web's `/api/v1/webhooks/nango`. When the
// `WEBHOOK_ORIGIN` flag is `"worker"`, the router would otherwise redirect
// every `/api/v1/webhooks/nango` POST back to webhook-worker — including
// webhook-worker's own outbound forwards, producing an infinite redelivery
// loop bounded only by `maxRetries`. Honouring this header lets webhook-worker
// reach cloud-web's `routeForwardEvent` → `handleGitHubForward` path which is
// the actual destination of the forward.
const WEBHOOK_WORKER_FORWARDED_HEADER = "x-cloud-webhook-worker-forwarded";
const WEBHOOK_WORKER_FORWARDED_VALUE = "webhook-worker";
let loggedPhase5aLambdaEliminated = false;

// Exact paths the webhook worker handles. Other sub-paths under
// /api/v1/webhooks (notably /api/v1/webhooks/composio/connect/callback, an
// OAuth callback served by Next.js) must continue to route to the Lambda even
// when WEBHOOK_ORIGIN=worker, otherwise they 404 against the Worker.
const WEBHOOK_WORKER_PATHS = new Set<string>([
  "/api/v1/webhooks/composio",
  "/api/v1/webhooks/github",
  "/api/v1/webhooks/hookdeck",
  "/api/v1/webhooks/nango",
]);
const NANGO_WEBHOOK_WORKER_PATH = "/api/v1/webhooks/nango";

function isPathWithinPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isObserverPath(pathname: string): boolean {
  return isPathWithinPrefix(pathname, OBSERVER_PATH_PREFIX);
}

function isFileObserverPath(pathname: string): boolean {
  return isPathWithinPrefix(pathname, FILE_OBSERVER_PATH_PREFIX);
}

function isPrimaryFileObserverPath(hostname: string, pathname: string): boolean {
  return hostname === PRIMARY_HOST && isFileObserverPath(pathname);
}

function isCloudPath(pathname: string): boolean {
  return isPathWithinPrefix(pathname, CLOUD_PATH_PREFIX);
}

// Returns the cloud-app path serving a Relay Connect invite link, or undefined
// when the request is not an apex invite read.
export function getConnectInviteCloudPath(
  hostname: string,
  pathname: string,
  method: string,
): string | undefined {
  if (hostname !== PRIMARY_HOST || (method !== "GET" && method !== "HEAD")) {
    return undefined;
  }

  const invitePath = CONNECT_INVITE_PATH.exec(pathname)?.[1];
  return invitePath ? `${CLOUD_PATH_PREFIX}${invitePath}` : undefined;
}

// Returns the cloud-app path for an agent chat conversation POST, or undefined.
// www.arelay.to is accepted here so a chat POST is never sent to its redirect,
// which curl would not follow and which would turn the POST into a GET.
export function getAgentChatCloudPath(
  hostname: string,
  pathname: string,
  method: string,
): string | undefined {
  if (method !== "POST") {
    return undefined;
  }
  if (hostname !== PRIMARY_HOST && hostname !== SHORT_HOST && hostname !== SHORT_HOST_WWW) {
    return undefined;
  }

  const match = AGENT_CHAT_PATH.exec(pathname);
  if (!match || (hostname === PRIMARY_HOST && match[1] !== "agent-relay")) {
    return undefined;
  }
  return `${CLOUD_PATH_PREFIX}/api/v1/agent-chat/${match[1]}/${match[2]}`;
}

// Agent pages live under /u/<handle> on agentrelay.com, so company handles never
// collide with the site's own pages, and at the root on arelay.to. Agents told
// to "go to arelay.to/agent-relay" fetch it with curl (Accept: */*) or a
// web-fetch tool (Accept: text/markdown); both get the agent-readable guide.
// Browsers, which prefer text/html, get the page. HEAD always gets the page, so
// uptime probes and `curl -I` neither change content type nor mint a guide.
export function getAgentPagePath(
  hostname: string,
  pathname: string,
  method: string,
  accept: string | null,
): string | undefined {
  if (method !== "GET" && method !== "HEAD") {
    return undefined;
  }
  let agent: string | undefined;
  if (hostname === SHORT_HOST || hostname === SHORT_HOST_WWW) {
    agent = /^\/([a-z0-9-]+)\/?$/.exec(pathname)?.[1];
  } else if (hostname === PRIMARY_HOST) {
    agent = /^\/u\/([a-z0-9-]+)\/?$/.exec(pathname)?.[1];
  }
  if (!agent) {
    return undefined;
  }
  const wantsHtml = method === "HEAD" || prefersHtmlOverMarkdown(accept);
  if (wantsHtml && hostname === SHORT_HOST_WWW) {
    // Browsers on the www alias are canonicalized by getShortHostRedirect.
    return undefined;
  }
  return wantsHtml ? `/u/${agent}` : `/u/${agent}/agent.md`;
}

// Quality the Accept header gives one media type, using the most specific
// matching range (exact, then type/*, then */*), per RFC 9110 section 12.5.1.
function acceptQuality(accept: string, mediaType: string): number {
  const [type] = mediaType.split("/");
  let best = -1;
  let quality = 0;
  for (const part of accept.split(",")) {
    const [range, ...params] = part.trim().toLowerCase().split(";");
    const name = range.trim();
    const specificity = name === mediaType ? 2 : name === `${type}/*` ? 1 : name === "*/*" ? 0 : -1;
    if (specificity <= best) {
      continue;
    }
    const q = params
      .map((param) => /^\s*q\s*=\s*([0-9.]+)\s*$/.exec(param)?.[1])
      .find((value) => value !== undefined);
    const parsed = q === undefined ? 1 : Number(q);
    best = specificity;
    quality = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1) : 0;
  }
  return quality;
}

// HTML only when the client rates it strictly above markdown. Ties (curl's
// */*, no Accept, text/plain) go to the agent guide.
export function prefersHtmlOverMarkdown(accept: string | null): boolean {
  if (!accept) {
    return false;
  }
  return acceptQuality(accept, "text/html") > acceptQuality(accept, "text/markdown");
}

// Any /u/<handle> page or guide, on any host, after the rewrite above.
export function isAgentPageRequestPath(pathname: string): boolean {
  return /^\/u\/[^/]+(?:\/agent\.md)?\/?$/i.test(pathname);
}

// The page first shipped at agentrelay.com/agent-relay; keep that link working.
export function getLegacyAgentPageRedirect(url: URL): string | undefined {
  if (url.hostname !== PRIMARY_HOST) {
    return undefined;
  }
  const agent = /^\/([a-z0-9-]+)\/?$/.exec(url.pathname)?.[1];
  return agent === "agent-relay"
    ? `https://${PRIMARY_HOST}/u/${agent}${url.search}`
    : undefined;

// Registration and management are served directly by relay-agent. The public
// API matcher is prefix-bounded so lookalikes such as /registrations-legacy do
// not escape the marketing site.
export function isRelayAgentRegistryRoute(
  hostname: string,
  pathname: string,
  method: string,
): boolean {
  if (hostname !== SHORT_HOST) return false;
  if ((pathname === "/register" || pathname === "/register/")
    && (method === "GET" || method === "HEAD")) {
    return true;
  }
  return REGISTRY_API_PATH.test(pathname);
}

// arelay.to only fronts agent chat: its root, its www alias and the signed-in
// cloud app redirect to the primary host.
export function getShortHostRedirect(url: URL): string | undefined {
  if (url.hostname === SHORT_HOST_WWW) {
    return `https://${SHORT_HOST}${url.pathname}${url.search}`;
  }
  if (url.hostname !== SHORT_HOST) {
    return undefined;
  }
  if (url.pathname === "/" || isCloudPath(url.pathname)) {
    return `https://${PRIMARY_HOST}${url.pathname}${url.search}`;
  }
  return undefined;
}

export function getVanityRedirect(hostname: string, pathname: string): string | undefined {
  if (hostname !== PRIMARY_HOST) {
    return undefined;
  }

  const normalizedPathname = (pathname.length > 1
    ? pathname.replace(/\/$/, "")
    : pathname).toLowerCase();
  return VANITY_REDIRECTS.get(normalizedPathname);
}

// True only for the exact paths the webhook worker knows how to handle. Used
// to gate worker forwarding so unrelated routes under /api/v1/webhooks/* (e.g.
// the Composio OAuth callback) still reach the Lambda.
export function isWebhookWorkerPath(pathname: string): boolean {
  return WEBHOOK_WORKER_PATHS.has(stripPathPrefix(pathname, CLOUD_PATH_PREFIX));
}

function isNangoWebhookWorkerPath(pathname: string): boolean {
  return stripPathPrefix(pathname, CLOUD_PATH_PREFIX) === NANGO_WEBHOOK_WORKER_PATH;
}

function stripPathPrefix(pathname: string, prefix: string): string {
  if (pathname === prefix) {
    return "/";
  }

  if (pathname.startsWith(`${prefix}/`)) {
    return pathname.slice(prefix.length);
  }

  return pathname;
}

function addPathPrefix(pathname: string, prefix: string): string {
  if (!prefix) {
    return pathname;
  }

  if (pathname === "/") {
    return prefix;
  }

  if (pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`)) {
    return pathname;
  }

  return `${prefix}${pathname}`;
}

function hostnameFromHost(host: string, protocol: string): string {
  try {
    return new URL(`${protocol}//${host}`).hostname;
  } catch {
    return host.split(":")[0] ?? host;
  }
}

function isPublicFileObserverLocation(hostname: string, pathname: string): boolean {
  return isPrimaryFileObserverPath(hostname, pathname);
}

export function getUpstreamPath(hostname: string, pathname: string): string {
  if (isPrimaryFileObserverPath(hostname, pathname)) {
    return stripPathPrefix(pathname, FILE_OBSERVER_PATH_PREFIX);
  }

  return pathname;
}

export function getMountPrefix(hostname: string, pathname: string): string {
  if (isCloudPath(pathname)) {
    return CLOUD_PATH_PREFIX;
  }

  if (isPrimaryFileObserverPath(hostname, pathname)) {
    return FILE_OBSERVER_PATH_PREFIX;
  }

  return "";
}

export function rewriteLocation(
  location: string,
  originUrl: URL,
  requestHost: string,
  requestProtocol: string,
  mountPrefix = "",
): string {
  if (!location) {
    return location;
  }

  try {
    const absolute = new URL(location);
    if (isPublicFileObserverLocation(absolute.hostname, absolute.pathname)) {
      return location;
    }

    if (absolute.hostname !== originUrl.hostname) {
      return location;
    }

    absolute.hostname = requestHost;
    absolute.port = "";
    absolute.protocol = requestProtocol;
    absolute.pathname = addPathPrefix(absolute.pathname, mountPrefix);
    return absolute.toString();
  } catch {
    if (location.startsWith("/")) {
      try {
        const requestHostname = hostnameFromHost(requestHost, requestProtocol);
        const locationUrl = new URL(location, `${requestProtocol}//${requestHost}`);
        if (isPublicFileObserverLocation(requestHostname, locationUrl.pathname)) {
          return location;
        }
      } catch {
        // Fall through to the normal mount-prefix rewrite.
      }

      return addPathPrefix(location, mountPrefix);
    }

    return location;
  }
}

export function getOrigin(hostname: string, pathname: string, env: Env): string {
  // /cloud* defaults to the Next.js cloud app regardless of host. Requests only
  // reach this fallback when the cloud-web Worker service binding is absent.
  if (isCloudPath(pathname)) {
    return env.CLOUD_APP_ORIGIN;
  }

  // The production agentrelay.com apex is a split router:
  //   1. /observer/file* goes to the RelayFile file observer app
  //   2. /observer* stays on the Relaycast observer app
  //   3. everything else falls back to the relay web origin
  if (hostname === PRIMARY_HOST) {
    if (isPrimaryFileObserverPath(hostname, pathname)) {
      return env.FILE_OBSERVER_ORIGIN ?? DEFAULT_FILE_OBSERVER_ORIGIN;
    }

    if (isObserverPath(pathname)) {
      return OBSERVER_ORIGIN;
    }
  }

  return FALLBACK_PROXY_ORIGIN;
}

async function shouldUseCloudWebWorker(
  pathname: string,
  request: Request,
  env: Env,
): Promise<boolean> {
  if (!isCloudPath(pathname)) {
    return false;
  }

  if (await shouldUseWebhookWorker(pathname, request, env)) {
    return false;
  }

  return true;
}

function logPhase5aLambdaEliminatedOnce(): void {
  if (loggedPhase5aLambdaEliminated) {
    return;
  }

  loggedPhase5aLambdaEliminated = true;
  console.log(JSON.stringify({ router_phase: "5a_lambda_eliminated" }));
}

export async function readWebhookOriginFlag(env: Env): Promise<string | null> {
  try {
    return (await env.ROUTER_CONFIG?.get(WEBHOOK_ORIGIN_FLAG_KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function shouldUseNangoWebhookWorkerRoute(
  pathname: string,
  env: Env,
): Promise<boolean> {
  if (!isNangoWebhookWorkerPath(pathname)) {
    return false;
  }

  const configured = await readWebhookOriginFlag(env);
  return configured?.trim().toLowerCase() === "worker";
}

async function shouldUseWebhookWorker(
  pathname: string,
  request: Request,
  env: Env,
): Promise<boolean> {
  // Break the redelivery loop: webhook-worker's queue consumer forwards the
  // raw envelope back to the same `/api/v1/webhooks/nango` route on
  // `origin.agentrelay.cloud` so cloud-web's `handleGitHubForward` can run.
  // Without this header check, the router catches that forward and redirects
  // it back to webhook-worker, which re-enqueues, ad infinitum (or until
  // `maxRetries`).
  if (request.headers.get(WEBHOOK_WORKER_FORWARDED_HEADER) === WEBHOOK_WORKER_FORWARDED_VALUE) {
    return false;
  }
  return shouldUseNangoWebhookWorkerRoute(pathname, env);
}

function buildWebhookWorkerRequest(
  request: Request,
  requestUrl: URL,
  workerOrigin?: string,
): Request {
  const targetUrl = new URL(requestUrl.toString());
  targetUrl.pathname = stripPathPrefix(targetUrl.pathname, CLOUD_PATH_PREFIX);

  if (workerOrigin) {
    const originUrl = new URL(workerOrigin);
    targetUrl.protocol = originUrl.protocol;
    targetUrl.hostname = originUrl.hostname;
    targetUrl.port = originUrl.port;
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "manual",
    duplex: "half",
  };

  return new Request(targetUrl.toString(), init);
}

function relayAgentOrigin(env: Env): string | undefined {
  const origin = env.RELAY_AGENT_ORIGIN?.trim();
  return origin || undefined;
}

class RelayAgentOriginError extends Error {}

function validatedRelayAgentOrigin(origin: string): string {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new RelayAgentOriginError("RELAY_AGENT_ORIGIN is not a valid URL");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new RelayAgentOriginError("RELAY_AGENT_ORIGIN must be an HTTPS origin without credentials, path, query, or fragment");
  }
  return url.origin;
}

function relayAgentEnabled(env: Env): boolean {
  return Boolean(env.RELAY_AGENT_WORKER || relayAgentOrigin(env));
}

function buildRelayAgentRequest(request: Request, requestUrl: URL, origin: string): Request {
  const target = new URL(requestUrl.pathname + requestUrl.search, origin);
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "manual",
    duplex: "half",
  };
  return new Request(target.toString(), init);
}

async function fetchRelayAgent(request: Request, url: URL, env: Env): Promise<Response> {
  if (env.RELAY_AGENT_WORKER) {
    return env.RELAY_AGENT_WORKER.fetch(request);
  }

  const origin = relayAgentOrigin(env);
  if (!origin) throw new Error("relay agent upstream is not configured");
  return globalThis.fetch(buildRelayAgentRequest(request, url, validatedRelayAgentOrigin(origin)));
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const vanityRedirect = getVanityRedirect(url.hostname, url.pathname);
    if (vanityRedirect) {
      const redirectUrl = new URL(vanityRedirect);
      url.searchParams.forEach((value, key) => {
        redirectUrl.searchParams.set(key, value);
      });
      return Response.redirect(redirectUrl.toString(), 302);
    }

    const agentChatCloudPath = getAgentChatCloudPath(
      url.hostname,
      url.pathname,
      request.method,
    );
    // Agents fetching the www alias get the guide directly: plain curl does
    // not follow the canonicalizing redirect.
    const agentPagePath = getAgentPagePath(
      url.hostname,
      url.pathname,
      request.method,
      request.headers.get("accept"),
    );
    const registryRoute = isRelayAgentRegistryRoute(
      url.hostname,
      url.pathname,
      request.method,
    );
    const registryOwnedChatRoute = Boolean(
      agentChatCloudPath && AGENT_CHAT_PATH.exec(url.pathname)?.[1] !== "agent-relay",
    );
    const relayAgentRoute = Boolean(agentChatCloudPath || registryRoute);
    const shortHostRedirect = relayAgentRoute || agentPagePath
      ? undefined
      : getShortHostRedirect(url);
    if (shortHostRedirect) {
      return Response.redirect(shortHostRedirect, 302);
    }

    const legacyAgentPage = getLegacyAgentPageRedirect(url);
    if (legacyAgentPage && (request.method === "GET" || request.method === "HEAD")) {
      return Response.redirect(legacyAgentPage, 301);
    }

    if (agentPagePath && agentPagePath !== url.pathname.replace(/\/$/, "")) {
      url.pathname = agentPagePath;
      request = new Request(url.toString(), request);
    }

    // Per-key rate limiting runs BEFORE any worker routing so a runaway
    // workspace gets bounded everywhere — including webhook ingress and
    // /cloud* traffic. The bypass list inside maybeRateLimit exempts
    // health and observer paths. See packages/router/src/rate-limit.ts
    // and docs/security/rate-limiting.md.
    const rateLimited = await maybeRateLimit(request, env);
    if (rateLimited) {
      return rateLimited;
    }

    // Clone the request up front so any branch that returns early (cloud-web
    // Worker service binding, webhook Worker service binding, etc.) can
    // still feed the recorder the original payload. Without this clone, the
    // /cloud Worker path bypasses the recorder entirely and the replay
    // harness has no corpus to prove equivalence during Phase 4 cutover.
    // See Codex P2.6 on bundle PR #647.
    const recorderEnv = hasRecorderEnv(env) ? env : null;
    // Conversation URLs are bearer secrets and request bodies are private chat
    // content, so neither the new route nor the existing Cloud fallback belongs
    // in the replay corpus. Agent pages and guides mint a conversation URL in
    // every response, so they stay out too, however they were reached.
    const recorderRequestClone = recorderEnv && !relayAgentRoute && !isAgentPageRequestPath(url.pathname)
      ? (request.clone() as unknown as Request)
      : null;

    // Production config includes the service binding. Removing it (and any
    // origin alternative) is the rollback flag that restores the Cloud route.
    if (relayAgentRoute && relayAgentEnabled(env)) {
      try {
        const workerResponse = await fetchRelayAgent(request, url, env);
        return workerResponse;
      } catch (error) {
        console.error(JSON.stringify({
          error: error instanceof RelayAgentOriginError
            ? "relay_agent_origin_invalid"
            : "relay_agent_upstream_failed",
          message: error instanceof Error ? error.message : "unknown error",
        }));
        const unavailableMessage = registryRoute
          ? "The agent registry is unavailable. Retry shortly.\n"
          : "The agent chat is unavailable. Retry the same command shortly.\n";
        return new Response(unavailableMessage, {
          status: 503,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "no-store",
            "referrer-policy": "no-referrer",
            "x-content-type-options": "nosniff",
          },
        });
      }
    }

    // Unlike the legacy agent-relay chat route, registry endpoints have no
    // Cloud fallback. Keep them off the marketing origin when the dedicated
    // Worker is absent during a rollback or unavailable environment.
    if (registryRoute || registryOwnedChatRoute) {
      const unavailableMessage = registryRoute
        ? "The agent registry is unavailable. Retry shortly.\n"
        : "The agent chat is unavailable. Retry the same command shortly.\n";
      return new Response(unavailableMessage, {
        status: 503,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
          "referrer-policy": "no-referrer",
          "x-content-type-options": "nosniff",
        },
      });
    }

    const connectInviteCloudPath = getConnectInviteCloudPath(
      url.hostname,
      url.pathname,
      request.method,
    );
    if (connectInviteCloudPath) {
      url.pathname = connectInviteCloudPath;
      request = new Request(url.toString(), request);
    }

    if (agentChatCloudPath) {
      url.pathname = agentChatCloudPath;
      request = new Request(url.toString(), request);
    }

    if (await shouldUseCloudWebWorker(url.pathname, request, env)) {
      logPhase5aLambdaEliminatedOnce();
      if (!env.CLOUD_WEB_WORKER) {
        return new Response(
          JSON.stringify({ error: "cloud web worker binding unavailable" }),
          {
            status: 503,
            headers: { "content-type": "application/json" },
          },
        );
      }

      const workerResponse = await env.CLOUD_WEB_WORKER.fetch(request);
      if (recorderRequestClone && recorderEnv) {
        ctx.waitUntil(
          maybeRecord(recorderRequestClone, workerResponse.clone(), recorderEnv, ctx),
        );
      }
      return workerResponse;
    }

    if (await shouldUseWebhookWorker(url.pathname, request, env)) {
      // Build the forwarded Request inside each branch: request.body is a
      // ReadableStream that can back only one Request, so constructing it before
      // the env.WEBHOOK_WORKER check would disturb the stream and make the
      // WEBHOOK_WORKER_ORIGIN fallback throw a TypeError.
      if (env.WEBHOOK_WORKER) {
        const workerResponse = await env.WEBHOOK_WORKER.fetch(
          buildWebhookWorkerRequest(request, url),
        );
        if (recorderRequestClone && recorderEnv) {
          ctx.waitUntil(
            maybeRecord(recorderRequestClone, workerResponse.clone(), recorderEnv, ctx),
          );
        }
        return workerResponse;
      }

      const workerOrigin = env.WEBHOOK_WORKER_ORIGIN?.trim();
      if (workerOrigin) {
        const originResponse = await globalThis.fetch(
          buildWebhookWorkerRequest(request, url, workerOrigin),
        );
        if (recorderRequestClone && recorderEnv) {
          ctx.waitUntil(
            maybeRecord(recorderRequestClone, originResponse.clone(), recorderEnv, ctx),
          );
        }
        return originResponse;
      }
    }

    const requestHost = request.headers.get("Host") || url.hostname;
    const originUrl = new URL(getOrigin(url.hostname, url.pathname, env));
    const mountPrefix = getMountPrefix(url.hostname, url.pathname);

    url.pathname = getUpstreamPath(url.hostname, url.pathname);
    url.hostname = originUrl.hostname;
    url.port = "";
    url.protocol = "https:";

    const headers = new Headers(request.headers);
    headers.set("X-Forwarded-Host", requestHost);
    headers.set("X-Original-Host", requestHost);
    headers.set("X-Forwarded-Proto", "https");
    if (mountPrefix) {
      headers.set("X-Forwarded-Prefix", mountPrefix);
    }

    // Reuse the clone made at the top of fetch() for the recorder. The
    // earlier clone covers all branches; making a second one here would
    // be wasted bytes on every request and would double-record on the
    // Lambda origin path.
    const recordingRequest = recorderRequestClone;
    const subRequest = new Request(url.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });

    try {
      // Use `globalThis.fetch` rather than a bare `fetch` identifier: Cloudflare
      // Workers can hoist bare `fetch` off `globalThis` and throw
      // `TypeError: Illegal invocation`. See sage `.claude/rules/workers-fetch.md`.
      const upstreamResponse = await globalThis.fetch(subRequest);
      const responseHeaders = new Headers(upstreamResponse.headers);

      const location = responseHeaders.get("Location");
      if (location) {
        responseHeaders.set(
          "Location",
          rewriteLocation(location, originUrl, requestHost, "https:", mountPrefix),
        );
      }

      const response = new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });

      if (recordingRequest && hasRecorderEnv(env)) {
        ctx.waitUntil(maybeRecord(recordingRequest, response.clone(), env, ctx));
      }

      return response;
    } catch (error) {
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  },
};
