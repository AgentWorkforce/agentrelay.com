// Per-request edge timing for the router.
//
// Every response the router returns carries a `Server-Timing` header
// that splits the edge's share of latency into its phases:
//
//   edge-up     time until the upstream returned response headers
//   edge-total  time from request arrival until the router returned
//   cf-colo     the Cloudflare colo that served the request (desc only)
//
// Requests slower than `SLOW_REQUEST_LOG_MS` also log one structured
// line. Neither the header nor the log carries ids, tokens, keys,
// cookies, query strings or full paths: the path is reduced to a
// coarse route class.

export type EdgePhase = "up";

export const SLOW_REQUEST_LOG_MS = 500;

const KNOWN_TOP_LEVEL = new Set(["_next", "api", "cloud", "health", "observer", "u"]);
const KNOWN_CLOUD_SECOND_LEVEL = new Set(["_next", "api", "dashboard"]);

/** Coarse, id-free route class for logs: `/cloud/api`, `/observer`, `/`. */
export function routeClass(pathname: string): string {
  const [, first = "", second = ""] = pathname.split("/");
  if (!KNOWN_TOP_LEVEL.has(first)) {
    return "/";
  }
  if (first === "cloud" && KNOWN_CLOUD_SECOND_LEVEL.has(second)) {
    return `/cloud/${second}`;
  }
  return `/${first}`;
}

function coloOf(request: Request): string | undefined {
  const colo = (request as Request & { cf?: { colo?: unknown } }).cf?.colo;
  return typeof colo === "string" && /^[A-Z]{3}$/.test(colo) ? colo : undefined;
}

function ms(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface EdgeTiming {
  /** Times `operation` as `phase`; the last measurement of a phase wins. */
  measure<T>(phase: EdgePhase, operation: () => Promise<T>): Promise<T>;
  /** Adds `Server-Timing` to the response and logs it when slow. */
  finish(response: Response): Response;
  /** Logs a request whose handler threw; the error name only, never its message. */
  fail(error: unknown): void;
}

export function startEdgeTiming(
  request: Request,
  clock: () => number = () => performance.now(),
): EdgeTiming {
  const startedAt = clock();
  const route = routeClass(new URL(request.url).pathname);
  const method = request.method;
  const colo = coloOf(request);
  const phases: Partial<Record<EdgePhase, number>> = {};

  return {
    async measure(phase, operation) {
      const start = clock();
      try {
        return await operation();
      } finally {
        phases[phase] = clock() - start;
      }
    },

    fail(error) {
      console.log(JSON.stringify({
        event: "router_request_failed",
        route,
        method,
        colo: colo ?? null,
        error: error instanceof Error ? error.name : typeof error,
        upMs: phases.up === undefined ? null : ms(phases.up),
        totalMs: ms(clock() - startedAt),
      }));
    },

    finish(response) {
      const totalMs = clock() - startedAt;
      const segments: string[] = [];
      if (phases.up !== undefined) segments.push(`edge-up;dur=${ms(phases.up)}`);
      segments.push(`edge-total;dur=${ms(totalMs)}`);
      if (colo) segments.push(`cf-colo;desc="${colo}"`);

      if (totalMs > SLOW_REQUEST_LOG_MS) {
        console.log(JSON.stringify({
          event: "router_slow_request",
          route,
          method,
          status: response.status,
          colo: colo ?? null,
          upMs: phases.up === undefined ? null : ms(phases.up),
          totalMs: ms(totalMs),
        }));
      }

      // A WebSocket upgrade must be returned as-is; re-wrapping would
      // drop the socket.
      if (response.status === 101 || (response as Response & { webSocket?: unknown }).webSocket) {
        return response;
      }
      // Upstream and redirect responses can have immutable headers, so
      // copy into a new Response. The body stream passes through.
      const timed = new Response(response.body, response);
      timed.headers.append("server-timing", segments.join(", "));
      return timed;
    },
  };
}
