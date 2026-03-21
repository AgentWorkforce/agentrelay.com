interface Env {
  NEXT_PUBLIC_APP_URL: string;
}

const FALLBACK_PROXY_ORIGIN = "https://agentrelay.net";
const OBSERVER_ORIGIN = "https://observer.relaycast.dev";
const PRIMARY_HOST = "agentrelay.dev";
const WWW_HOST = "www.agentrelay.dev";
const OBSERVER_PATH_PREFIX = "/observer";
const CLOUD_PATH_PREFIX = "/cloud";

function isPathWithinPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isObserverPath(pathname: string): boolean {
  return isPathWithinPrefix(pathname, OBSERVER_PATH_PREFIX);
}

function isCloudPath(pathname: string): boolean {
  return isPathWithinPrefix(pathname, CLOUD_PATH_PREFIX);
}

export function getOrigin(hostname: string, pathname: string, env: Env): string {
  // The agentrelay.dev apex is a split router:
  //   1. /observer* stays on the Relaycast observer app
  //   2. /cloud* goes to the Next.js cloud app
  //   3. everything else falls back to the legacy proxy target
  if (hostname === PRIMARY_HOST) {
    if (isObserverPath(pathname)) {
      return OBSERVER_ORIGIN;
    }

    if (isCloudPath(pathname)) {
      return env.NEXT_PUBLIC_APP_URL;
    }
  }

  return FALLBACK_PROXY_ORIGIN;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === WWW_HOST) {
      url.hostname = PRIMARY_HOST;
      return Response.redirect(url.toString(), 301);
    }

    const requestHost = request.headers.get("Host") || url.hostname;
    const originUrl = new URL(getOrigin(url.hostname, url.pathname, env));

    url.hostname = originUrl.hostname;
    url.port = "";
    url.protocol = "https:";

    const headers = new Headers(request.headers);
    headers.set("X-Forwarded-Host", requestHost);
    headers.set("X-Original-Host", requestHost);
    headers.set("X-Forwarded-Proto", "https");

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
        try {
          const loc = new URL(location);
          if (loc.hostname === originUrl.hostname) {
            loc.hostname = requestHost;
            responseHeaders.set("Location", loc.toString());
          }
        } catch {
          // relative URL, leave as-is
        }
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
