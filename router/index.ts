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
  WEBHOOK_WORKER?: {
    fetch(request: Request): Promise<Response>;
  };
  WEBHOOK_WORKER_ORIGIN?: string;
}

function hasRecorderEnv(env: Env): env is Env & RecorderEnv {
  return Boolean(env.TRAFFIC_RECORDER && env.ROUTER_CONFIG);
}

const FALLBACK_PROXY_ORIGIN = "https://orgin.agentrelay.net";
const OBSERVER_ORIGIN = "https://observer.relaycast.dev";
const DEFAULT_FILE_OBSERVER_ORIGIN = "https://relayfile-file-observer.pages.dev";
const PRIMARY_HOST = "agentrelay.com";
const FILE_OBSERVER_PATH_PREFIX = "/observer/file";
const OBSERVER_PATH_PREFIX = "/observer";
const CLOUD_PATH_PREFIX = "/cloud";
const CLOUD_ORIGIN_FLAG_KEY = "cloudOrigin";
const WEBHOOK_ORIGIN_FLAG_KEY = "WEBHOOK_ORIGIN";

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

// True only for the exact paths the webhook worker knows how to handle. Used
// to gate worker forwarding so unrelated routes under /api/v1/webhooks/* (e.g.
// the Composio OAuth callback) still reach the Lambda.
export function isWebhookWorkerPath(pathname: string): boolean {
  return WEBHOOK_WORKER_PATHS.has(pathname);
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
  // reach this branch when the KV flag has not already forwarded them to the
  // cloud-web Worker.
  if (isCloudPath(pathname)) {
    return env.CLOUD_APP_ORIGIN;
  }

  // The production agentrelay.com apex is a split router:
  //   1. /observer/file* goes to the RelayFile file observer app
  //   2. /observer* stays on the Relaycast observer app
  //   3. everything else falls back to the legacy proxy target
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

async function shouldUseCloudWebWorker(pathname: string, env: Env): Promise<boolean> {
  if (!isCloudPath(pathname)) {
    return false;
  }

  try {
    const configured = await env.ROUTER_CONFIG?.get(CLOUD_ORIGIN_FLAG_KEY);
    return configured?.trim().toLowerCase() === "workers";
  } catch {
    return false;
  }
}

async function shouldUseWebhookWorker(pathname: string, env: Env): Promise<boolean> {
  if (!isWebhookWorkerPath(pathname)) {
    return false;
  }

  try {
    const configured = await env.ROUTER_CONFIG?.get(WEBHOOK_ORIGIN_FLAG_KEY);
    return configured?.trim().toLowerCase() === "worker";
  } catch {
    return false;
  }
}

function buildWorkerOriginRequest(request: Request, requestUrl: URL, workerOrigin: string): Request {
  const targetUrl = new URL(requestUrl.toString());
  const originUrl = new URL(workerOrigin);
  targetUrl.protocol = originUrl.protocol;
  targetUrl.hostname = originUrl.hostname;
  targetUrl.port = originUrl.port;

  return new Request(targetUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "manual",
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

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
    const recorderRequestClone = hasRecorderEnv(env)
      ? (request.clone() as unknown as Request)
      : null;

    if ((await shouldUseCloudWebWorker(url.pathname, env)) && env.CLOUD_WEB_WORKER) {
      const workerResponse = await env.CLOUD_WEB_WORKER.fetch(request);
      if (recorderRequestClone) {
        ctx.waitUntil(
          maybeRecord(recorderRequestClone, workerResponse.clone(), env, ctx),
        );
      }
      return workerResponse;
    }

    if (await shouldUseWebhookWorker(url.pathname, env)) {
      if (env.WEBHOOK_WORKER) {
        const workerResponse = await env.WEBHOOK_WORKER.fetch(request);
        if (recorderRequestClone) {
          ctx.waitUntil(
            maybeRecord(recorderRequestClone, workerResponse.clone(), env, ctx),
          );
        }
        return workerResponse;
      }

      const workerOrigin = env.WEBHOOK_WORKER_ORIGIN?.trim();
      if (workerOrigin) {
        const originResponse = await globalThis.fetch(
          buildWorkerOriginRequest(request, url, workerOrigin),
        );
        if (recorderRequestClone) {
          ctx.waitUntil(
            maybeRecord(recorderRequestClone, originResponse.clone(), env, ctx),
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
      });
    }
  },
};
