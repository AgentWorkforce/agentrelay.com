interface Env {
  CLOUD_APP_ORIGIN: string;
  FILE_OBSERVER_ORIGIN?: string;
}

const FALLBACK_PROXY_ORIGIN = "https://orgin.agentrelay.net";
const OBSERVER_ORIGIN = "https://observer.relaycast.dev";
const DEFAULT_FILE_OBSERVER_ORIGIN = "https://relayfile-file-observer.pages.dev";
const PRIMARY_HOST = "agentrelay.com";
const FILE_OBSERVER_PATH_PREFIX = "/observer/file";
const OBSERVER_PATH_PREFIX = "/observer";
const CLOUD_PATH_PREFIX = "/cloud";

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
      return addPathPrefix(location, mountPrefix);
    }

    return location;
  }
}

export function getOrigin(hostname: string, pathname: string, env: Env): string {
  // /cloud* always goes to the Next.js cloud app regardless of host
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
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

    const subRequest = new Request(url.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });

    try {
      const response = await fetch(subRequest);
      const responseHeaders = new Headers(response.headers);

      const location = responseHeaders.get("Location");
      if (location) {
        responseHeaders.set(
          "Location",
          rewriteLocation(location, originUrl, requestHost, "https:", mountPrefix),
        );
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 500,
      });
    }
  },
};
