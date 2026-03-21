interface Env {
  NEXT_APP_ORIGIN: string;
}

const FALLBACK_PROXY_ORIGIN = "https://agentrelay.net";
const PRIMARY_HOST = "agentrelay.dev";
const WWW_HOST = "www.agentrelay.dev";

function getOrigin(hostname: string, env: Env): string {
  if (hostname === PRIMARY_HOST) {
    return env.NEXT_APP_ORIGIN;
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
    const originUrl = new URL(getOrigin(url.hostname, env));

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
      return new Response(
        JSON.stringify({ error: (error as Error).message }),
        { status: 500 },
      );
    }
  },
};
