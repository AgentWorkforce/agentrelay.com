type McpEndpoint = "shared-sessions" | "relay-events" | "replicas";

function endpointFor(request: Request): McpEndpoint | null {
  if (request.method !== "POST") return null;
  const path = new URL(request.url).pathname.replace(/^\/cloud(?=\/)/, "").replace(/\/+$/, "");
  if (path === "/mcp" || path === "/api/v1/mcp/shared-sessions") return "shared-sessions";
  if (path === "/api/v1/mcp/relay-events") return "relay-events";
  return path === "/api/v1/replicas/mcp" ? "replicas" : null;
}

function rayFor(request: Request): string | null {
  const ray = request.headers.get("cf-ray");
  return ray && /^[a-f0-9]{16,32}(?:-[a-z]{3})?$/i.test(ray) ? ray.split("-")[0]! : null;
}

function logFailure(request: Request, endpoint: McpEndpoint, status: number, correlationId: string,
  failure: "response_error" | "request_error" | "maintenance"): void {
  // The ray joins this diagnostic to the platform event even when a runtime
  // kill prevented the application from writing any of its own diagnostics.
  console.error(JSON.stringify({ event: "hosted_mcp_gateway_failure", endpoint, status, correlationId,
    cfRay: rayFor(request), failure }));
}

function unavailable(request: Request, endpoint: McpEndpoint, response?: Response): Response {
  const status = response?.status ?? 503;
  const id = crypto.randomUUID();
  const headers = new Headers(response?.headers);
  headers.set("x-correlation-id", id);
  headers.set("cache-control", "no-store");
  const maintenance = headers.get("x-agent-relay-database-read-only") === "enabled"
    || headers.get("x-agent-relay-database-target") === "unavailable";
  logFailure(request, endpoint, status, id, maintenance ? "maintenance" : response ? "response_error" : "request_error");
  if (maintenance && response) {
    // The lifecycle's retry/code/header contract must survive the gateway.
    return new Response(response.body, { status, statusText: response.statusText, headers });
  }
  // Never read or copy a failed upstream body: it may be empty, private HTML,
  // or stalled. Cancellation is cleanup, not a prerequisite to the response.
  void response?.body?.cancel().catch(() => undefined);
  for (const name of ["content-length", "content-encoding", "content-range", "content-md5", "etag", "last-modified"]) {
    headers.delete(name);
  }
  headers.set("content-type", "application/json");
  return Response.json({ jsonrpc: "2.0", id: null, error: {
    code: -32603,
    message: `Hosted MCP is temporarily unavailable (HTTP ${status}). Correlation ID: ${id}.`,
    data: { correlation_id: id },
  } }, { status, headers });
}

/** Correlate transport failures outside the app isolate; never replay a call. */
export async function withMcpGatewayErrors(request: Request, forward: () => Promise<Response>): Promise<Response> {
  const endpoint = endpointFor(request);
  if (!endpoint) return forward();
  let response: Response;
  try {
    response = await forward();
  } catch {
    return unavailable(request, endpoint);
  }
  if (response.status < 500 || response.headers.get("x-correlation-id")) return response;
  return unavailable(request, endpoint, response);
}
