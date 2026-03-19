interface Env {
  NEXT_APP_ORIGIN: string;
}

const proxyRoutes: Record<string, string> = {
  "/observer": "https://observer.relaycast.dev",
  "/openclaw": "https://agentrelay.net",
};

function getOrigin(pathname: string, env: Env): string {
  for (const [prefix, origin] of Object.entries(proxyRoutes)) {
    if (pathname.startsWith(prefix)) {
      return origin;
    }
  }
  return env.NEXT_APP_ORIGIN;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === "www.agentrelay.dev") {
      url.hostname = "agentrelay.dev";
      return Response.redirect(url.toString(), 301);
    }

    const requestHost = request.headers.get("Host") || url.hostname;
    const originUrl = new URL(getOrigin(url.pathname, env));

    url.hostname = originUrl.hostname;
    url.port = "";
    url.protocol = "https:";

    const headers = new Headers(request.headers);
    headers.set("X-Forwarded-Host", requestHost);
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
      return new Response(
        JSON.stringify({ error: (error as Error).message }),
        { status: 500 },
      );
    }
  },
};
