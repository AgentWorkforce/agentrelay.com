interface Env {
  NEXT_APP_ORIGIN: string;
}

const proxyRoutes: Record<string, string> = {
  "/observer": "https://observer.relaycast.dev",
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

    const origin = getOrigin(url.pathname, env);

    url.hostname = new URL(origin).hostname;
    url.port = "";
    url.protocol = "https:";

    const subRequest = new Request(url.toString(), request);

    try {
      const response = await fetch(subRequest);

      if (!response.body) {
        return response;
      }

      const { readable, writable } = new TransformStream();
      response.body.pipeTo(writable);

      return new Response(readable, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: (error as Error).message }),
        { status: 500 },
      );
    }
  },
};
