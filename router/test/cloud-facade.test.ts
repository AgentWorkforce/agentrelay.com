import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../index.js";
import { CLOUD_FACADE_KEY, decodedFacadePath, isSafeShadowGet, parseFacadeRoutes } from "../src/cloud-facade.js";
import { startEdgeTiming } from "../src/edge-timing.js";

const RC = "https://api.prod-aws.agentrelay.com";
const WEB = "https://prod-aws.agentrelay.com";
const PATH = "/cloud/api/v1/workspaces/rw_private/sessions";
const url = (path = PATH) => "https://agentrelay.com" + path;
const rule = (overrides: Record<string, unknown> = {}) => ({ prefix: PATH, origin: RC, mode: "on", ...overrides });

function setup(raw: string | null = null) {
  const cloud = vi.fn(async (_request: Request) => new Response("cloud answer", {
    status: 200, headers: { "content-type": "application/json", "x-cloud": "present", "set-cookie": "old=cloud; Domain=agentrelay.com; Secure" },
  }));
  const get = vi.fn(async (key: string) => key === CLOUD_FACADE_KEY ? raw : null);
  const env = { CLOUD_APP_ORIGIN: "https://origin.test.invalid", CLOUD_WEB_WORKER: { fetch: cloud },
    ROUTER_CONFIG: { get } } as unknown as Parameters<typeof worker.fetch>[1];
  const tasks: Promise<unknown>[] = [];
  const waitUntil = vi.fn((promise: Promise<unknown>) => { tasks.push(promise); });
  const ctx = { waitUntil, passThroughOnException() {} } as unknown as ExecutionContext;
  const target = vi.fn(async (_request: Request) => new Response("target answer", {
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
    expect(await response.text()).toBe("cloud answer");
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
  it.each([PATH, PATH + "/", PATH + "/session_1", PATH.replace("sessions", "%73essions"), PATH.replace("/sessions", "%2Fsessions")])("matches decoded path %s without rewriting its wire path", async path => {
    const s = setup(JSON.stringify([rule()]));
    await s.run(new Request(url(path) + "?cursor=a%2Fb&cursor=next"));
    const forwarded = new URL(s.target.mock.calls[0][0].url);
    expect(forwarded.pathname).toBe(new URL(url(path)).pathname);
    expect(forwarded.search).toBe("?cursor=a%2Fb&cursor=next");
  });
  it("normalizes decoded slash/dot segments before choosing the rule", () => {
    expect(decodedFacadePath("/cloud//api/./v1%2F..%2Fsessions/")).toBe("/cloud/api/sessions");
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
  it("keeps double-slash paths on the allowlisted host", async () => {
    const s = setup(JSON.stringify([rule({ prefix: "/" })]));
    await s.run(new Request(url("//evil.invalid/cloud")));
    expect(new URL(s.target.mock.calls[0][0].url).origin).toBe(RC);
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
  it("returns Cloud immediately and compares a deferred copy in waitUntil without reading bodies or logging credentials", async () => {
    const s = setup(JSON.stringify([rule({ mode: "shadow" })]));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    let resolve!: (value: Response) => void;
    s.target.mockImplementation(() => new Promise<Response>(r => { resolve = r; }));
    const response = await s.run(new Request(url() + "?search=private-query", { headers: {
      cookie: "session=private-cookie", authorization: "Bearer private-token", "x-request-id": "private-id",
    } }));
    expect(await response.text()).toBe("cloud answer");
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
    const shadow = new Response("private-target-body", { headers: { "content-type": "application/json", "set-cookie": "new=private-target-cookie" } });
    const text = vi.spyOn(shadow, "text");
    const json = vi.spyOn(shadow, "json");
    resolve(shadow);
    await s.drain();
    expect(text).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
    const line = log.mock.calls.map(call => String(call[0])).find(line => line.includes("cloud_facade_shadow"))!;
    expect(JSON.parse(line)).toEqual({ event: "cloud_facade_shadow", route: "/cloud/api", origin: "rc", outcome: "match",
      statusMatch: true, shapeMatch: true, cloudStatus: 200, shadowStatus: 200 });
    expect(line).not.toContain("private");
    expect(response.headers.get("set-cookie")).not.toContain("private-target-cookie");
  });
  it.each([
    [404, "application/json", false, true], [200, "text/html", true, false], [503, "text/plain", false, false],
  ])("logs a mismatch for status %s and media shape %s", async (status, contentType, statusMatch, shapeMatch) => {
    const s = setup(JSON.stringify([rule({ mode: "shadow" })]));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    s.target.mockResolvedValue(new Response("private body", { status, headers: { "content-type": contentType } }));
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
  it.each(["POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])("never shadows %s", async method => {
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
    [PATH, { range: "bytes=0-10" }], ["/cloud/api/v1/workspaces/rw_private/relayhistory/reset", {}],
  ])("does not shadow unsafe or streaming GET %s", async (path, headers) => {
    const s = setup(JSON.stringify([rule({ prefix: "/cloud", mode: "shadow" })]));
    await s.run(new Request(url(path), { headers }));
    expect(s.target).not.toHaveBeenCalled();
    expect(s.waitUntil).not.toHaveBeenCalled();
  });
  it("accepts audited History reads, but no arbitrary GET mutation route", () => {
    expect(isSafeShadowGet(new Request(url("/cloud/api/v1/workspaces/rw_1/reflex/sessions/s_1/brief")))).toBe(true);
    expect(isSafeShadowGet(new Request(url("/cloud/api/v1/arbitrary-get-action")))).toBe(false);
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
