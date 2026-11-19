import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../index.js";
import { withMcpGatewayErrors } from "../src/mcp-gateway-errors.js";

const ctx = { waitUntil: () => undefined, passThroughOnException: () => undefined } as unknown as ExecutionContext;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const body = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_team_activity","arguments":{"max_agents":1}}}';
const paths = ["/mcp", "/mcp/", "/cloud/mcp", "/cloud/api/v1/mcp/shared-sessions", "/cloud/api/v1/mcp/relay-events", "/cloud/api/v1/replicas/mcp"];

function call(path: string, fetch: (request: Request) => Promise<Response>, method = "POST") {
  return worker.fetch(new Request(`https://agentrelay.com${path}?secret=SECRET_query`, {
    method, headers: { authorization: "Bearer SECRET_token", cookie: "session=SECRET_cookie", "content-type": "application/json",
      "cf-ray": "0123456789abcdef-OSL" }, ...(method === "POST" ? { body } : {}),
  }), { CLOUD_APP_ORIGIN: "https://origin.test.invalid", CLOUD_WEB_WORKER: { fetch } } as Parameters<typeof worker.fetch>[1], ctx);
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("hosted MCP gateway failures", () => {
  it("keeps other hosts outside the MCP fallback, including an arelay.to handle named mcp", async () => {
    const original = new Response("chat failure", { status: 503 });
    const response = await withMcpGatewayErrors(new Request("https://arelay.to/mcp", { method: "POST" }), async () => original);
    expect(response).toBe(original);
    expect(response.headers.get("x-correlation-id")).toBeNull();
    expect(await response.text()).toBe("chat failure");
  });
  it.each(paths)("gives a blank platform 503 at %s a useful body and one correlation ID", async path => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const upstream = vi.fn(async (request: Request) => {
      expect(request.headers.get("authorization")).toBe("Bearer SECRET_token");
      expect(await request.text()).toBe(body);
      return new Response(null, { status: 503, headers: { "content-length": "0", "retry-after": "5" } });
    });
    const response = await call(path, upstream);
    expect(response.status).toBe(503);
    const id = response.headers.get("x-correlation-id");
    expect(id).toMatch(uuid);
    const error = await response.json() as { error: { code: number; message: string; data: { correlation_id: string } } };
    expect(error.error.code).toBe(-32603);
    expect(error.error.message).toContain(id);
    expect(error.error.data.correlation_id).toBe(id);
    expect(response.headers.get("retry-after")).toBe("5");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("server-timing")).toContain("edge-up");
    expect(upstream).toHaveBeenCalledOnce();
    const entries = log.mock.calls.map(([line]) => JSON.parse(String(line)));
    expect(entries).toEqual([expect.objectContaining({ correlationId: id, cfRay: "0123456789abcdef", status: 503 })]);
    expect(JSON.stringify([error, log.mock.calls])).not.toContain("SECRET");
  });

  it("correlates a failed binding without echoing the exception or replaying the request", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const upstream = vi.fn(async () => { throw new Error("SECRET binding failure"); });
    const response = await call("/mcp", upstream);
    expect(response.status).toBe(503);
    const id = response.headers.get("x-correlation-id");
    expect(id).toMatch(uuid);
    expect(await response.text()).toContain(id);
    expect(upstream).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain("SECRET");
  });

  it("preserves the MCP facade fence while correlating a legacy binding failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetch = vi.fn(async () => new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    const legacy = vi.fn(async () => new Response(null, { status: 503 }));
    const response = await worker.fetch(new Request("https://agentrelay.com/cloud/api/v1/mcp/shared-sessions", {
      method: "POST", body,
    }), { CLOUD_APP_ORIGIN: "https://origin.test.invalid", CLOUD_WEB_WORKER: { fetch: legacy },
      ROUTER_CONFIG: { get: async (key: string) => key === "cloud-facade-routes" ? JSON.stringify([
        { prefix: "/cloud/api/v1/mcp", methods: ["POST"], origin: "https://api.prod-aws.agentrelay.com", mode: "on" },
      ]) : null },
    } as unknown as Parameters<typeof worker.fetch>[1], ctx);
    expect(response.status).toBe(503);
    const id = response.headers.get("x-correlation-id");
    expect(id).toMatch(uuid);
    expect((await response.json() as { error: { data: { correlation_id: string } } }).error.data.correlation_id).toBe(id);
    expect(fetch).not.toHaveBeenCalled();
    expect(legacy).toHaveBeenCalledOnce();
  });

  it("isolates concurrent failure IDs", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const responses = await Promise.all([call("/mcp", async () => new Response(null, { status: 503 })),
      call("/cloud/api/v1/mcp/relay-events", async () => new Response(null, { status: 503 }))]);
    const ids = responses.map(response => response.headers.get("x-correlation-id"));
    expect(new Set(ids).size).toBe(2);
    for (let index = 0; index < responses.length; index += 1) {
      const result = await responses[index]!.json() as { error: { data: { correlation_id: string } } };
      expect(result.error.data.correlation_id).toBe(ids[index]);
    }
  });

  it("never logs an unrecognized ray header as diagnostic metadata", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const env = { CLOUD_APP_ORIGIN: "https://origin.test.invalid",
      CLOUD_WEB_WORKER: { fetch: async () => new Response(null, { status: 503 }) } } as Parameters<typeof worker.fetch>[1];
    await worker.fetch(new Request("https://agentrelay.com/mcp", {
      method: "POST", headers: { "cf-ray": "SECRET_ray_value" },
    }), env, ctx);
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.parse(String(log.mock.calls[0]![0])).cfRay).toBeNull();
    expect(JSON.stringify(log.mock.calls)).not.toContain("SECRET");
  });

  it("cancels an undiagnosed failure body without reading or waiting for it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const cancel = vi.fn(() => new Promise<void>(() => undefined));
    const pull = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ pull, cancel }, { highWaterMark: 0 });
    const response = await call("/mcp", async () => new Response(stream, { status: 502, headers: {
      "content-type": "text/html", "content-length": "999", "content-encoding": "gzip", etag: "old",
    } }));
    expect(response.status).toBe(502);
    expect(response.headers.get("x-correlation-id")).toMatch(uuid);
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get("content-encoding")).toBeNull();
    expect(response.headers.get("etag")).toBeNull();
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(pull).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("preserves an already-correlated application failure byte for byte", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const original = ' {"jsonrpc":"2.0","id":1,"error":{"code":-32603,"message":"existing error"}}\n';
    const response = await call("/mcp", async () => new Response(original, {
      status: 500, headers: { "x-correlation-id": "existing-handler-id", "content-type": "application/json" },
    }));
    expect(response.status).toBe(500);
    expect(response.headers.get("x-correlation-id")).toBe("existing-handler-id");
    expect(await response.text()).toBe(original);
    expect(log).not.toHaveBeenCalled();
  });

  it.each([200, 202, 400, 401, 403, 429])("preserves status %s, its body and OAuth headers", async status => {
    const response = await call("/mcp", async () => new Response("original", { status, headers: {
      "www-authenticate": 'Bearer resource_metadata="https://metadata.test/mcp"', "retry-after": "30",
    } }));
    expect(response.status).toBe(status);
    expect(await response.text()).toBe("original");
    expect(response.headers.get("x-correlation-id")).toBeNull();
    expect(response.headers.get("www-authenticate")).toContain("resource_metadata");
    expect(response.headers.get("retry-after")).toBe("30");
  });

  it("leaves a successful 1 MiB body unread until its caller consumes it", async () => {
    const text = "x".repeat(1024 * 1024);
    const pull = vi.fn((controller: ReadableStreamDefaultController<Uint8Array>) => {
      controller.enqueue(new TextEncoder().encode(text)); controller.close();
    });
    const response = await call("/mcp", async () => new Response(new ReadableStream({ pull }, { highWaterMark: 0 }), {
      headers: { "content-type": "application/json" },
    }));
    expect(pull).not.toHaveBeenCalled();
    expect(await response.text()).toBe(text);
    expect(pull).toHaveBeenCalledOnce();
  });

  it.each(["/cloud/api/internal/mcp-events/pump", "/cloud/api/v1/sessions"])("keeps non-MCP failure %s unchanged", async path => {
    const response = await call(path, async () => new Response("original failure", { status: 503 }));
    expect(response.status).toBe(503);
    expect(response.headers.get("x-correlation-id")).toBeNull();
    expect(await response.text()).toBe("original failure");
  });

  it("keeps MCP GET failures unchanged", async () => {
    const response = await call("/mcp", async () => new Response("original failure", { status: 503 }), "GET");
    expect(response.status).toBe(503);
    expect(response.headers.get("x-correlation-id")).toBeNull();
    expect(await response.text()).toBe("original failure");
  });

  it.each([
    ["x-agent-relay-database-read-only", "enabled", "database_read_only_cutover"],
    ["x-agent-relay-database-target", "unavailable", "database_target_unavailable"],
  ])("preserves maintenance contract %s and adds a diagnostic header", async (header, value, code) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const original = JSON.stringify({ error: "Database maintenance", code });
    const response = await call("/mcp", async () => new Response(original, {
      status: 503, headers: { [header]: value, "retry-after": "30", "content-type": "application/json" },
    }));
    expect(response.status).toBe(503);
    expect(response.headers.get(header)).toBe(value);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(response.headers.get("x-correlation-id")).toMatch(uuid);
    expect(await response.text()).toBe(original);
  });
});
