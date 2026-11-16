import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../index.js";
import { CLOUD_FACADE_KEY, decodedFacadePath, isSafeShadowRequest, parseFacadeRoutes, fetchFacade, type FacadeRoute } from "../src/cloud-facade.js";
import { startEdgeTiming } from "../src/edge-timing.js";

const RC = "https://api.prod-aws.agentrelay.com";
const WEB = "https://prod-aws.agentrelay.com";
const CLOUD_BODY = JSON.stringify({ items: [{ id: "cloud-id", name: "Cloud" }] });
const PATH = "/cloud/api/v1/workspaces/rw_private/sessions";
const url = (path = PATH) => "https://agentrelay.com" + path;
const rule = (overrides: Record<string, unknown> = {}) => ({ prefix: PATH, origin: RC, mode: "on", ...overrides });

function setup(raw: string | null = null) {
  const cloud = vi.fn(async (_request: Request) => new Response(_request.method === "HEAD" ? null : CLOUD_BODY, {
    status: 200, headers: { "content-type": "application/json", "x-cloud": "present", "set-cookie": "old=cloud; Domain=agentrelay.com; Secure" },
  }));
  const get = vi.fn(async (key: string) => key === CLOUD_FACADE_KEY ? raw : null);
  const env = { CLOUD_APP_ORIGIN: "https://origin.test.invalid", CLOUD_WEB_WORKER: { fetch: cloud },
    ROUTER_CONFIG: { get } } as unknown as Parameters<typeof worker.fetch>[1];
  const tasks: Promise<unknown>[] = [];
  const waitUntil = vi.fn((promise: Promise<unknown>) => { tasks.push(promise); });
  const ctx = { waitUntil, passThroughOnException() {} } as unknown as ExecutionContext;
  const target = vi.fn(async (_request: Request) => new Response(_request.method === "HEAD" ? null : JSON.stringify({ items: [{ id: "target-id", name: "Target" }] }), {
    headers: { "content-type": "application/json" },
  }));
  vi.stubGlobal("fetch", target);
  return { env, cloud, get, ctx, target, waitUntil, tasks,
    run: (request = new Request(url())) => worker.fetch(request, env, ctx),
    drain: () => Promise.all(tasks) };
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("facade config fail-safe", () => {
  it.each([
    ["missing", null], ["empty", ""], ["blank", " \n "], ["empty table", "[]"],
    ["invalid JSON", "["], ["object", "{}"], ["null", "null"], ["missing fields", "[{}]"],
    ["unknown mode", JSON.stringify([rule({ mode: "enabled" })])],
    ["empty methods", JSON.stringify([rule({ methods: [] })])],
    ["invalid method", JSON.stringify([rule({ methods: ["get"] })])],
    ["methods not strings", JSON.stringify([rule({ methods: [null] })])],
    ["methods not an array", JSON.stringify([rule({ methods: "GET" })])],
    ["wildcard", JSON.stringify([rule({ prefix: "/cloud/*" })])],
    ["route template", JSON.stringify([rule({ prefix: "/cloud/[id]" })])],
    ["encoded prefix", JSON.stringify([rule({ prefix: "/cloud/%61pi" })])],
    ["relative prefix", JSON.stringify([rule({ prefix: "cloud" })])],
    ["noncanonical prefix", JSON.stringify([rule({ prefix: "/cloud/../api" })])],
    ["trailing slash prefix", JSON.stringify([rule({ prefix: PATH + "/" })])],
    ["query prefix", JSON.stringify([rule({ prefix: "/cloud?token=x" })])],
    ["fragment prefix", JSON.stringify([rule({ prefix: "/cloud#x" })])],
    ["mixed invalid table", JSON.stringify([rule(), { ...rule(), origin: "https://evil.invalid" }])],
  ])("retains today's Cloud response for %s", async (_name, raw) => {
    const s = setup(raw);
    const response = await s.run();
    expect(s.cloud).toHaveBeenCalledOnce();
    expect(s.target).not.toHaveBeenCalled();
    expect(await response.text()).toBe(CLOUD_BODY);
    expect(response.headers.get("x-cloud")).toBe("present");
    expect(response.headers.get("set-cookie")).toBe("old=cloud; Domain=agentrelay.com; Secure");
    expect(response.headers.has("x-ar-origin")).toBe(false);
    expect(s.waitUntil).not.toHaveBeenCalled();
  });

  it("ignores an unreadable KV key without changing Cloud dispatch", async () => {
    const s = setup();
    s.get.mockRejectedValue(new Error("KV unavailable; private details"));
    expect((await s.run()).status).toBe(200);
    expect(s.cloud).toHaveBeenCalledOnce();
    expect(s.target).not.toHaveBeenCalled();
  });

  it("works without ROUTER_CONFIG and preserves a missing Cloud binding's 503", async () => {
    const s = setup();
    delete s.env.ROUTER_CONFIG;
    expect((await s.run()).status).toBe(200);
    delete s.env.CLOUD_WEB_WORKER;
    const response = await s.run();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "cloud web worker binding unavailable" });
    expect(s.target).not.toHaveBeenCalled();
  });

  it.each([
    "http://api.prod-aws.agentrelay.com", "https://evil.invalid", "https://api.prod-aws.agentrelay.com.evil.invalid",
    "https://api.prod-aws.agentrelay.com@evil.invalid", "https://user:pass@api.prod-aws.agentrelay.com",
    RC + "/", RC + "/path", RC + "?token=x", RC + "#fragment", RC + ":444", "//api.prod-aws.agentrelay.com",
  ])("refuses non-allowlisted origin %s", async origin => {
    const s = setup(JSON.stringify([rule({ origin })]));
    await s.run();
    expect(s.cloud).toHaveBeenCalledOnce();
    expect(s.target).not.toHaveBeenCalled();
  });

  it("also refuses an invalid origin on an off entry", () => {
    expect(parseFacadeRoutes(JSON.stringify([rule(), rule({ mode: "off", origin: "https://evil.invalid" })]))).toEqual([]);
  });
});

describe("decoded segment-boundary matching", () => {
  it.each([
    "/cloud/api/auth%2F..%2Fsessions", "/cloud/api/v1/auth%2f..%2fflows/x",
    PATH.replace("/sessions", "%2fsessions"), "/cloud/api//sessions", "/cloud/api/%252fauth",
    "/cloud/api/v1/sessions%2ejson",
  ])("keeps ambiguous path %s on Cloud even inside a broad on rule", async path => {
    const s = setup(JSON.stringify([rule({ prefix: "/cloud" }), rule({ prefix: "/cloud/api/auth", mode: "off" })]));
    await s.run(new Request(url(path)));
    expect(s.cloud).toHaveBeenCalledOnce();
    expect(s.target).not.toHaveBeenCalled();
  });
  it("uses the longest matching prefix regardless of list order", async () => {
    for (const reverse of [false, true]) {
      const entries = [rule({ prefix: "/cloud", origin: WEB }), rule()];
      const s = setup(JSON.stringify(reverse ? entries.reverse() : entries));
      await s.run();
      expect(new URL(s.target.mock.calls[0][0].url).origin).toBe(RC);
      expect(s.cloud).not.toHaveBeenCalled();
    }
  });
  it("retains ordered first-entry precedence for equal prefixes", async () => {
    const s = setup(JSON.stringify([rule({ origin: WEB }), rule()]));
    await s.run();
    expect(new URL(s.target.mock.calls[0][0].url).origin).toBe(WEB);
  });
  it("allows a narrower off rule to fence an on subtree", async () => {
    const s = setup(JSON.stringify([rule({ prefix: "/cloud" }), rule({ mode: "off" })]));
    await s.run();
    expect(s.cloud).toHaveBeenCalledOnce();
    expect(s.target).not.toHaveBeenCalled();
  });
  it.each([PATH + "-foo", PATH + "foo", "/cloud/api/v1/workspaces/other/sessions"])("does not prefix-match lookalike %s", async path => {
    const s = setup(JSON.stringify([rule()]));
    await s.run(new Request(url(path)));
    expect(s.cloud).toHaveBeenCalledOnce();
    expect(s.target).not.toHaveBeenCalled();
  });
  it.each([PATH, PATH + "/", PATH + "/session_1", PATH.replace("sessions", "%73essions"), PATH.replace("sessions", "s%65ssions")])("matches decoded path %s without rewriting its wire path", async path => {
    const s = setup(JSON.stringify([rule()]));
    await s.run(new Request(url(path) + "?cursor=a%2Fb&cursor=next"));
    const forwarded = new URL(s.target.mock.calls[0][0].url);
    expect(forwarded.pathname).toBe(new URL(url(path)).pathname);
    expect(forwarded.search).toBe("?cursor=a%2Fb&cursor=next");
  });
  it("rejects ambiguous slash/dot segments before choosing the rule", () => {
    expect(decodedFacadePath("/cloud//api/./v1%2F..%2Fsessions/")).toBeNull();
    expect(decodedFacadePath("/cloud/%GG")).toBeNull();
    expect(decodedFacadePath("/cloud/%5Csecret")).toBeNull();
    expect(decodedFacadePath("/cloud/%00secret")).toBeNull();
  });
  it("keeps a malformed encoded request on the legacy path", async () => {
    const s = setup(JSON.stringify([rule({ prefix: "/cloud" })]));
    await s.run(new Request(url("/cloud/%GG")));
    expect(s.cloud).toHaveBeenCalledOnce();
    expect(s.target).not.toHaveBeenCalled();
  });
  it("filters by methods before longest-prefix selection", async () => {
    const s = setup(JSON.stringify([rule({ prefix: "/cloud", mode: "off" }), rule({ methods: ["GET"] })]));
    await s.run(new Request(url(), { method: "POST", body: "mutation" }));
    expect(s.cloud).toHaveBeenCalledOnce();
    expect(s.target).not.toHaveBeenCalled();
    await s.run();
    expect(s.target).toHaveBeenCalledOnce();
  });
  it("leaves arelay.to redirects independent of apex configuration", async () => {
    const s = setup(JSON.stringify([rule({ prefix: "/" })]));
    const response = await s.run(new Request("https://arelay.to" + PATH));
    expect(response.status).toBe(302);
    expect(s.target).not.toHaveBeenCalled();
  });
});

describe("on-mode forwarding", () => {
  it("enforces the origin allowlist in the forwarder when parsing is bypassed", async () => {
    const s = setup();
    const response = await fetchFacade(new Request(url()), rule({ origin: "https://evil.invalid" }) as FacadeRoute);
    expect(response.status).toBe(502);
    expect(s.target).not.toHaveBeenCalled();
  });
  it("sanitizes forwarding headers and derives XFF only from Cloudflare's client IP", async () => {
    const s = setup(JSON.stringify([rule()]));
    await s.run(new Request(url(), { headers: { "x-forwarded-for": "spoof", "x-real-ip": "spoof",
      "x-forwarded-prefix": "/evil", forwarded: "for=spoof", "cf-connecting-ip": "203.0.113.7" } }));
    const forwarded = s.target.mock.calls[0][0].headers;
    expect(forwarded.get("x-forwarded-for")).toBe("203.0.113.7");
    for (const name of ["x-real-ip", "x-forwarded-prefix", "forwarded"]) expect(forwarded.has(name)).toBe(false);
  });
  it("drops a spoofed XFF when Cloudflare's client IP is unavailable", async () => {
    const s = setup(JSON.stringify([rule()]));
    await s.run(new Request(url(), { headers: { "x-forwarded-for": "spoof" } }));
    expect(s.target.mock.calls[0][0].headers.has("x-forwarded-for")).toBe(false);
  });
  it("suppresses agent_relay_session cookies until the identity cookie contract is migrated", async () => {
    const s = setup(JSON.stringify([rule()]));
    const headers = new Headers();
    headers.append("set-cookie", "agent_relay_session=new-control-session; Domain=prod-aws.agentrelay.com; Path=/cloud; HttpOnly");
    headers.append("set-cookie", "agent_relay_session=; Domain=agentrelay.com; Path=/; Max-Age=0");
    headers.append("set-cookie", "other=keep; Domain=prod-aws.agentrelay.com; Secure");
    s.target.mockResolvedValue(new Response("ok", { headers }));
    const response = await s.run(new Request(url(), { headers: { cookie: "agent_relay_session=legacy-cloud" } }));
    expect(response.headers.getSetCookie()).toEqual(["other=keep; Secure"]);
    expect(s.target.mock.calls[0][0].headers.get("cookie")).toBe("agent_relay_session=legacy-cloud");
  });
  it.each([RC, WEB, "//prod-aws.agentrelay.com"])("rewrites approved redirect host %s back to the apex", async origin => {
    const s = setup(JSON.stringify([rule()]));
    s.target.mockResolvedValue(new Response(null, { status: 302, headers: { location: origin + "/cloud/dashboard?next=%2Fcloud#section" } }));
    expect((await s.run()).headers.get("location")).toBe("https://agentrelay.com/cloud/dashboard?next=%2Fcloud#section");
  });
  it.each(["/cloud/dashboard?next=x", "../dashboard", "https://elsewhere.invalid/page"])("preserves relative or foreign redirect %s", async location => {
    const s = setup(JSON.stringify([rule()]));
    s.target.mockResolvedValue(new Response(null, { status: 302, headers: { location } }));
    expect((await s.run()).headers.get("location")).toBe(location);
  });
  it("forwards a real streaming body without recording or awaiting an unused recorder tee", async () => {
    const s = setup(JSON.stringify([rule()]));
    const put = vi.fn();
    s.env.TRAFFIC_RECORDER = { put } as unknown as R2Bucket;
    s.target.mockImplementation(async request => new Response(await request.text()));
    const body = new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode("streamed payload"));
      controller.close();
    } });
    const response = await s.run(new Request(url(), { method: "POST", body, duplex: "half" } as RequestInit & { duplex: "half" }));
    expect(await response.text()).toBe("streamed payload");
    expect(s.get).not.toHaveBeenCalledWith("RECORDER_SAMPLE_RATE");
    expect(s.waitUntil).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });
  it.each([RC, WEB])("uses allowlisted origin %s and forwards auth, cookies, request id and streaming body", async origin => {
    const s = setup(JSON.stringify([rule({ origin })]));
    s.target.mockImplementation(async request => {
      expect(request.method).toBe("POST");
      expect(request.headers.get("cookie")).toBe("session=private-cookie");
      expect(request.headers.get("authorization")).toBe("Bearer private-token");
      expect(request.headers.get("x-request-id")).toBe("request-123");
      expect(request.headers.get("x-forwarded-host")).toBe("agentrelay.com");
      expect(request.headers.get("x-original-host")).toBe("agentrelay.com");
      expect(request.headers.get("x-forwarded-proto")).toBe("https");
      expect(request.headers.has("host")).toBe(false);
      expect(request.redirect).toBe("manual");
      expect(await request.text()).toBe("mutation payload");
      expect(new URL(request.url).origin).toBe(origin);
      return new Response("created", { status: 201 });
    });
    const response = await s.run(new Request(url() + "?a=1&a=2", { method: "POST", body: "mutation payload", headers: {
      cookie: "session=private-cookie", authorization: "Bearer private-token", "x-request-id": "request-123",
      host: "spoof.invalid", "x-forwarded-host": "spoof.invalid",
    } }));
    expect(response.status).toBe(201);
    expect(await response.text()).toBe("created");
    expect(response.headers.get("x-ar-origin")).toBe("rc");
    expect(s.cloud).not.toHaveBeenCalled();
  });
  it("strips Domain from each cookie while preserving Expires, security attributes and host-only cookies", async () => {
    const s = setup(JSON.stringify([rule()]));
    const headers = new Headers();
    headers.append("set-cookie", "session=one; Domain=.prod-aws.agentrelay.com; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Wed, 21 Oct 2030 07:28:00 GMT");
    headers.append("set-cookie", "other=two; domain=api.prod-aws.agentrelay.com; Secure");
    headers.append("set-cookie", "host=three; Path=/cloud; Secure");
    s.target.mockResolvedValue(new Response("ok", { headers }));
    const response = await s.run();
    expect(response.headers.getSetCookie()).toEqual([
      "session=one; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Wed, 21 Oct 2030 07:28:00 GMT",
      "other=two; Secure", "host=three; Path=/cloud; Secure",
    ]);
  });
  it("supports Workers getAll for separate Set-Cookie headers", async () => {
    const s = setup(JSON.stringify([rule()]));
    const upstream = new Response("ok", { headers: { "set-cookie": "cookie=one; Domain=prod-aws.agentrelay.com; Secure" } });
    Object.defineProperty(upstream.headers, "getSetCookie", { value: undefined });
    Object.defineProperty(upstream.headers, "getAll", { value: () => ["cookie=one; Domain=prod-aws.agentrelay.com; Secure", "second=two; Domain=prod-aws.agentrelay.com; HttpOnly"] });
    s.target.mockResolvedValue(upstream);
    expect((await s.run()).headers.getSetCookie()).toEqual(["cookie=one; Secure", "second=two; HttpOnly"]);
  });
  it.each([
    ["/cloud/api/v1/flows/listeners", "rfc"], ["/cloud/api/v1/workers", "rfc"],
    ["/cloud/api/v1/workflows/runs", "rfc"], ["/cloud/dashboard", "web"],
  ])("labels the gateway cohort %s as %s", async (path, label) => {
    const s = setup(JSON.stringify([rule({ prefix: "/cloud", origin: WEB })]));
    expect((await s.run(new Request(url(path)))).headers.get("x-ar-origin")).toBe(label);
  });
  it("does not follow redirects carrying credentials to another origin", async () => {
    const s = setup(JSON.stringify([rule()]));
    s.target.mockResolvedValue(new Response(null, { status: 302, headers: { location: "https://elsewhere.invalid/callback" } }));
    const response = await s.run();
    expect(response.status).toBe(302);
    expect(s.target).toHaveBeenCalledOnce();
    expect(s.target.mock.calls[0][0].redirect).toBe("manual");
  });
  it("refuses ambiguous double-slash paths even with a manually constructed route", async () => {
    const s = setup();
    const response = await fetchFacade(new Request(url("//evil.invalid/cloud")), rule() as FacadeRoute);
    expect(response.status).toBe(502);
    expect(s.target).not.toHaveBeenCalled();
  });
  it("returns a generic 502 on target failure without replaying a mutation into Cloud or logging secrets", async () => {
    const s = setup(JSON.stringify([rule()]));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    s.target.mockRejectedValue(new Error("private-token private-body"));
    const response = await s.run(new Request(url(), { method: "POST", body: "private-body" }));
    expect(response.status).toBe(502);
    expect(await response.text()).toBe("Facade upstream unavailable");
    expect(response.headers.get("x-ar-origin")).toBe("rc");
    expect(s.cloud).not.toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-");
  });
});

describe("safe asynchronous shadows", () => {
  it("compares a KV-selected legacy web path without a hard-coded Cloud cohort", async () => {
    const s = setup(JSON.stringify([rule({ prefix: "/pricing", mode: "shadow" })]));
    s.target.mockImplementation(async request => new Response(new URL(request.url).origin === RC ? "new web" : "old web"));
    const response = await s.run(new Request(url("/pricing")));
    expect(await response.text()).toBe("old web");
    await s.drain();
    expect(s.target.mock.calls.map(([request]) => new URL(request.url).origin)).toEqual(["https://origin-web.agentrelay.com", RC]);
  });
  it("logs a missing Cloud binding as a skip instead of silently implying shadow matches", async () => {
    const s = setup(JSON.stringify([rule({ mode: "shadow" })]));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    delete s.env.CLOUD_WEB_WORKER;
    expect((await s.run()).status).toBe(503);
    expect(s.target).not.toHaveBeenCalled();
    expect(log.mock.calls.some(call => String(call[0]).includes('"reason":"cloud_binding_unavailable"'))).toBe(true);
  });
  it.each(["GET", "HEAD"])("shadows KV-selected %s reads outside the Sessions fixture", async method => {
    const s = setup(JSON.stringify([rule({ prefix: "/cloud/api/v1/catalog", mode: "shadow" })]));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const response = await s.run(new Request(url("/cloud/api/v1/catalog"), { method }));
    expect(await response.text()).toBe(method === "HEAD" ? "" : CLOUD_BODY);
    await s.drain();
    expect(s.target).toHaveBeenCalledOnce();
    expect(s.target.mock.calls[0][0].method).toBe(method);
    expect(log.mock.calls.some(call => String(call[0]).includes('"outcome":"match"'))).toBe(true);
  });
  it("compares JSON types/keys rather than only status and content type", async () => {
    const s = setup(JSON.stringify([rule({ mode: "shadow" })]));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    s.target.mockResolvedValue(new Response(JSON.stringify({ items: [{ id: "private-id", name: 42 }] }), {
      headers: { "content-type": "application/json" },
    }));
    const response = await s.run();
    expect(await response.text()).toBe(CLOUD_BODY);
    await s.drain();
    const entry = log.mock.calls.map(call => JSON.parse(String(call[0]))).find(e => e.event === "cloud_facade_shadow");
    expect(entry).toMatchObject({ outcome: "mismatch", comparison: "json_shape", statusMatch: true, shapeMatch: false });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-id");
  });
  it("hashes bounded non-JSON bodies without logging either body or digest", async () => {
    const s = setup(JSON.stringify([rule({ mode: "shadow" })]));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    s.cloud.mockResolvedValue(new Response("private same bytes", { headers: { "content-type": "text/plain" } }));
    s.target.mockResolvedValue(new Response("private same bytes", { headers: { "content-type": "text/plain" } }));
    await s.run();
    await s.drain();
    const entry = log.mock.calls.map(call => JSON.parse(String(call[0]))).find(e => e.event === "cloud_facade_shadow");
    expect(entry).toMatchObject({ outcome: "match", comparison: "body_hash", shapeMatch: true });
    expect(entry).not.toHaveProperty("hash");
    expect(JSON.stringify(log.mock.calls)).not.toContain("private same bytes");
  });
  it.each(["cookie", "authorization"])("labels authenticated 401s as identity_unmigrated for %s", async header => {
    const s = setup(JSON.stringify([rule({ mode: "shadow" })]));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const target = new Response("private denial body", { status: 401 });
    const read = vi.spyOn(target.body!, "getReader");
    s.target.mockResolvedValue(target);
    await s.run(new Request(url(), { headers: { [header]: "private-credential" } }));
    await s.drain();
    const entry = log.mock.calls.map(call => JSON.parse(String(call[0]))).find(e => e.event === "cloud_facade_shadow");
    expect(entry).toMatchObject({ outcome: "identity_unmigrated", baselineStatus: 200, shadowStatus: 401 });
    expect(read).not.toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain("private");
  });
  it("retains mismatch classification for an unauthenticated 401", async () => {
    const s = setup(JSON.stringify([rule({ mode: "shadow" })]));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    s.target.mockResolvedValue(new Response(CLOUD_BODY, { status: 401, headers: { "content-type": "application/json" } }));
    await s.run(); await s.drain();
    const entry = log.mock.calls.map(call => JSON.parse(String(call[0]))).find(e => e.event === "cloud_facade_shadow");
    expect(entry).toMatchObject({ outcome: "mismatch", statusMatch: false });
  });
  it("caps body comparison without changing the client's large Cloud response", async () => {
    const s = setup(JSON.stringify([rule({ mode: "shadow" })]));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const large = "p".repeat(70 * 1024);
    s.cloud.mockResolvedValue(new Response(large));
    s.target.mockResolvedValue(new Response(large));
    const response = await s.run();
    expect(await response.text()).toBe(large);
    await s.drain();
    expect(log.mock.calls.some(call => String(call[0]).includes('"outcome":"error"'))).toBe(true);
  });
  it("times out a stalled comparison copy while preserving the client's body stream", async () => {
    vi.useFakeTimers();
    try {
      const s = setup(JSON.stringify([rule({ mode: "shadow" })]));
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      let source!: ReadableStreamDefaultController<Uint8Array>;
      s.cloud.mockResolvedValue(new Response(new ReadableStream<Uint8Array>({ start(controller) { source = controller; } })));
      const response = await s.run();
      await vi.advanceTimersByTimeAsync(5_001);
      await s.drain();
      expect(log.mock.calls.some(call => String(call[0]).includes('"outcome":"error"'))).toBe(true);
      source.enqueue(new TextEncoder().encode("client still owns this"));
      source.close();
      expect(await response.text()).toBe("client still owns this");
    } finally {
      vi.useRealTimers();
    }
  });
  it("does not start a shadow when Cloud's response is an event stream", async () => {
    const s = setup(JSON.stringify([rule({ mode: "shadow" })]));
    s.cloud.mockResolvedValue(new Response("event: private", { headers: { "content-type": "text/event-stream" } }));
    const response = await s.run();
    expect(await response.text()).toBe("event: private");
    await s.drain();
    expect(s.target).not.toHaveBeenCalled();
  });
  it("bounds the shadow fetch with a five-second abort signal", async () => {
    const s = setup(JSON.stringify([rule({ mode: "shadow" })]));
    vi.spyOn(console, "log").mockImplementation(() => {});
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    s.target.mockImplementation(request => new Promise((_resolve, reject) => {
      request.signal.addEventListener("abort", () => reject(new Error("private timeout details")));
    }));
    expect((await s.run()).status).toBe(200);
    expect(timeout).toHaveBeenCalledWith(5_000);
    controller.abort();
    await expect(s.drain()).resolves.toBeDefined();
  });
  it("returns Cloud immediately and compares a deferred copy in waitUntil without returning target data or logging credentials", async () => {
    const s = setup(JSON.stringify([rule({ mode: "shadow" })]));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    let resolve!: (value: Response) => void;
    s.target.mockImplementation(() => new Promise<Response>(r => { resolve = r; }));
    const response = await s.run(new Request(url() + "?search=private-query", { headers: {
      cookie: "session=private-cookie", authorization: "Bearer private-token", "x-request-id": "private-id",
    } }));
    expect(await response.text()).toBe(CLOUD_BODY);
    expect(response.headers.get("set-cookie")).toContain("old=cloud");
    expect(s.cloud).toHaveBeenCalledOnce();
    expect(s.waitUntil).toHaveBeenCalledOnce();
    const request = s.target.mock.calls[0][0];
    expect(request.method).toBe("GET");
    expect(request.headers.get("authorization")).toBe("Bearer private-token");
    expect(request.headers.get("cookie")).toBe("session=private-cookie");
    expect(request.headers.get("x-forwarded-host")).toBe("agentrelay.com");
    expect(request.redirect).toBe("manual");
    expect(request.signal).toBeDefined();
    const shadow = new Response(JSON.stringify({ items: [{ name: "private-target-name", id: "private-target-id" }] }), { headers: { "content-type": "application/json", "set-cookie": "new=private-target-cookie" } });
    const text = vi.spyOn(shadow, "text");
    const json = vi.spyOn(shadow, "json");
    resolve(shadow);
    await s.drain();
    expect(text).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
    const line = log.mock.calls.map(call => String(call[0])).find(line => line.includes("cloud_facade_shadow"))!;
    expect(JSON.parse(line)).toEqual({ event: "cloud_facade_shadow", route: "/cloud/api", origin: "rc", outcome: "match",
      comparison: "json_shape", statusMatch: true, shapeMatch: true, baselineStatus: 200, shadowStatus: 200 });
    expect(line).not.toContain("private");
    expect(response.headers.get("set-cookie")).not.toContain("private-target-cookie");
  });
  it.each([
    [404, "application/json", false, true], [200, "text/html", true, false], [503, "text/plain", false, false],
  ])("logs a mismatch for status %s and media shape %s", async (status, contentType, statusMatch, shapeMatch) => {
    const s = setup(JSON.stringify([rule({ mode: "shadow" })]));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    s.target.mockResolvedValue(new Response(contentType === "application/json" ? CLOUD_BODY : "private body", { status, headers: { "content-type": contentType } }));
    await s.run();
    await s.drain();
    const entry = log.mock.calls.map(call => JSON.parse(String(call[0]))).find(e => e.event === "cloud_facade_shadow");
    expect(entry).toMatchObject({ outcome: "mismatch", statusMatch, shapeMatch });
  });
  it("contains shadow errors and logs no error text", async () => {
    const s = setup(JSON.stringify([rule({ mode: "shadow" })]));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    s.target.mockRejectedValue(new Error("private-token private-url"));
    expect((await s.run()).status).toBe(200);
    await expect(s.drain()).resolves.toBeDefined();
    expect(log.mock.calls.some(call => String(call[0]).includes('"outcome":"error"'))).toBe(true);
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-");
  });
  it.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])("never shadows %s", async method => {
    const s = setup(JSON.stringify([rule({ mode: "shadow" })]));
    await s.run(new Request(url(), { method }));
    expect(s.cloud).toHaveBeenCalledOnce();
    expect(s.target).not.toHaveBeenCalled();
    expect(s.waitUntil).not.toHaveBeenCalled();
  });
  it.each([
    ["/cloud/api/auth/callback/google?code=private", {}], ["/cloud/oauth/authorize", {}],
    [PATH + "?grant=one-use", {}], [PATH + "?access_token=private", {}],
    [PATH, { accept: "text/event-stream" }], [PATH, { upgrade: "websocket" }],
    ["/cloud/api/v1/workspaces/rw_private/relayfile/mount-session", {}],
  ])("does not shadow unsafe or streaming GET %s", async (path, headers) => {
    const s = setup(JSON.stringify([rule({ prefix: "/cloud", mode: "shadow" })]));
    await s.run(new Request(url(path), { headers }));
    expect(s.target).not.toHaveBeenCalled();
    expect(s.waitUntil).not.toHaveBeenCalled();
  });
  it("lets KV select any non-denied GET/HEAD cohort", () => {
    expect(isSafeShadowRequest(new Request(url("/cloud/api/v1/workspaces/rw_1/reflex/sessions/s_1/brief")))).toBe(true);
    expect(isSafeShadowRequest(new Request(url("/cloud/api/v1/catalog")))).toBe(true);
    expect(isSafeShadowRequest(new Request(url("/cloud/api/v1/catalog"), { method: "HEAD" }))).toBe(true);
  });
});

describe("KV-independent denylist", () => {
  const denied = [
    "/cloud/api/auth/session", "/cloud/login", "/cloud/logout", "/cloud/callback/google",
    "/cloud/oauth/authorize", "/cloud/.well-known/openid-configuration", "/cloud/api/v1/grants",
    "/cloud/api/v1/token/mint", "/cloud/api/v1/credential/mint", "/cloud/api/v1/auth/device/start",
    "/cloud/api/v1/webhooks/nango", "/cloud/mcp", "/cloud/api/v1/provider-credentials/byok",
    "/cloud/api/v1/setup-token", "/cloud/api/v1/workers/register", "/cloud/api/v1/relayfile/mount-session",
    "/cloud/api/v1/workflows/local-run", "/cloud/api/v1/workflows/runs/run/clone/archive-lease",
    "/cloud/api/v1/auth%2Fdevice", "/cloud/api/v1/%6fAuth/authorize", "/cloud/api/v1/MCP/relay-events",
    "/cloud/api/v1/catalog?grant=single-use",
  ];
  for (const mode of ["on", "shadow"]) {
    it.each(denied)(`never overrides denied path %s in ${mode} mode`, async path => {
      const s = setup(JSON.stringify([rule({ prefix: "/cloud", mode })]));
      await s.run(new Request(url(path)));
      await s.drain();
      expect(s.cloud).toHaveBeenCalledOnce();
      expect(s.target).not.toHaveBeenCalled();
    });
    it.each([
      ["accept", "text/event-stream"], ["content-type", "text/event-stream"], ["upgrade", "websocket"],
    ])(`never overrides streaming request headers in ${mode} mode`, async (name, value) => {
      const s = setup(JSON.stringify([rule({ prefix: "/cloud", mode })]));
      await s.run(new Request(url(), { headers: { [name]: value } }));
      await s.drain();
      expect(s.cloud).toHaveBeenCalledOnce();
      expect(s.target).not.toHaveBeenCalled();
    });
  }
  it("denies grant-minting share-link POSTs despite a broad on entry", async () => {
    const s = setup(JSON.stringify([rule({ prefix: "/cloud", mode: "on" })]));
    await s.run(new Request(url("/cloud/api/v1/workspaces/rw_1/session-share-links"), { method: "POST" }));
    expect(s.target).not.toHaveBeenCalled();
  });
  it.each(["/mcp", "/.well-known/oauth-authorization-server/cloud"])("retains the canonical Cloud alias for denied %s", async path => {
    const s = setup(JSON.stringify([rule({ prefix: "/cloud", mode: "on" })]));
    await s.run(new Request(url(path)));
    expect(s.cloud).toHaveBeenCalledOnce();
    expect(s.target).not.toHaveBeenCalled();
  });
  it("refuses an unexpected event-stream on response without returning or replaying it", async () => {
    const s = setup(JSON.stringify([rule()]));
    s.target.mockResolvedValue(new Response("event: private", { headers: { "content-type": "text/event-stream" } }));
    const response = await s.run();
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private");
    expect(s.cloud).not.toHaveBeenCalled();
  });
});

describe("facade timing provenance", () => {
  it("adds an ingress label to slow logs without widening the route class", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    let now = 0;
    const timing = startEdgeTiming(new Request(url() + "?token=private"), () => now);
    timing.setOrigin("rfc");
    now = 600;
    timing.finish(new Response("ok"));
    expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({ origin: "rfc", route: "/cloud/api" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private");
  });
});
