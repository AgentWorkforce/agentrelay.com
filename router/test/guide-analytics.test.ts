import { afterEach, describe, expect, it, vi } from "vitest";

import worker, {
  carriesDashboardGrant,
  getGuideAnalyticsHandle,
  isAgentPageRequestPath,
} from "../index.js";
import {
  classifyClient,
  guideFetchedDataPoint,
  requestCountry,
  visitorPseudonym,
} from "../src/analytics.js";

const SECRET = "router-test-visitor-hash-secret-0123";

type Point = { indexes?: string[]; blobs?: string[]; doubles?: number[] };

function setup(status = 200, extra: Record<string, unknown> = {}) {
  const points: Point[] = [];
  const put = vi.fn();
  const upstream = vi.spyOn(globalThis, "fetch")
    .mockImplementation(async () => new Response("guide", { status }));
  const env = {
    CLOUD_APP_ORIGIN: "https://origin.test.invalid",
    CLOUD_WEB_WORKER: { fetch: vi.fn() },
    ARELAY_ANALYTICS: { writeDataPoint: (point: Point) => { points.push(point); } },
    ANALYTICS_VISITOR_HASH_SECRET: SECRET,
    TRAFFIC_RECORDER: { put },
    ROUTER_CONFIG: { get: vi.fn(async () => "100") },
    ...extra,
  } as unknown as Parameters<typeof worker.fetch>[1];
  const waits: Promise<unknown>[] = [];
  const ctx = {
    waitUntil: (promise: Promise<unknown>) => { waits.push(promise); },
    passThroughOnException: () => undefined,
  } as unknown as ExecutionContext;
  const fetch = async (url: string | Request, init: RequestInit = {}) => {
    const request = typeof url === "string" ? new Request(url, init) : url;
    const response = await worker.fetch(request, env, ctx);
    await Promise.all(waits);
    return response;
  };
  return { points, put, upstream, fetch };
}

const AGENT = { "user-agent": "curl/8.7.1", accept: "*/*", "cf-connecting-ip": "203.0.113.5" };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("router guide analytics", () => {
  it("writes one agent_guide_fetched per successful negotiated guide GET on either host", async () => {
    const { points, fetch } = setup();
    await fetch("https://arelay.to/agent-relay", { headers: AGENT });
    await fetch("https://www.arelay.to/acme-support", { headers: { ...AGENT, accept: "text/markdown" } });
    await fetch("https://agentrelay.com/u/agent-relay", { headers: AGENT });
    expect(points).toHaveLength(3);
    expect(points.map((point) => point.indexes?.[0])).toEqual(["agent-relay", "acme-support", "agent-relay"]);
    for (const point of points) {
      expect(point.blobs?.slice(0, 2)).toEqual(["v1", "agent_guide_fetched"]);
      expect(point.blobs?.slice(3, 7)).toEqual(["not_applicable", "curl", "unknown", "none"]);
      expect(point.blobs?.[7]).toMatch(/^[0-9a-f]{64}$/);
      expect(point.blobs?.[8]).toBe("router");
      expect(point.doubles).toEqual([1, -1]);
    }
  });

  it("records the incoming request's cf.country even though the guide path is rewritten", async () => {
    const { points, fetch } = setup();
    // Like Workers, rebuilt Requests here do not inherit the incoming cf.
    const request = new Request("https://arelay.to/agent-relay", { headers: AGENT });
    Object.defineProperty(request, "cf", { value: { country: "NZ" } });
    await fetch(request);
    expect(points).toHaveLength(1);
    expect(points[0]?.blobs?.[5]).toBe("NZ");
  });

  it("writes nothing for HTML, HEAD, direct guide paths, or Worker subrequests", async () => {
    const { points, fetch } = setup();
    await fetch("https://arelay.to/agent-relay", { headers: { ...AGENT, accept: "text/html,*/*;q=0.8" } });
    await fetch("https://arelay.to/agent-relay", { method: "HEAD", headers: AGENT });
    await fetch("https://agentrelay.com/u/agent-relay/agent.md", { headers: AGENT });
    await fetch("https://arelay.to/agent-relay", { headers: { ...AGENT, "cf-worker": "agentrelay.com" } });
    expect(points).toEqual([]);
  });

  it.each([301, 302, 404, 410, 500, 503])("writes nothing when the guide upstream answers %i", async (status) => {
    const { points, fetch } = setup(status);
    await fetch("https://arelay.to/agent-relay", { headers: AGENT });
    expect(points).toEqual([]);
  });

  it("fails closed without the visitor hash secret or the binding", async () => {
    const withoutSecret = setup(200, { ANALYTICS_VISITOR_HASH_SECRET: undefined });
    const response = await withoutSecret.fetch("https://arelay.to/agent-relay", { headers: AGENT });
    expect(response.status).toBe(200);
    expect(withoutSecret.points).toEqual([]);
    vi.restoreAllMocks();

    const withoutBinding = setup(200, { ARELAY_ANALYTICS: undefined });
    expect((await withoutBinding.fetch("https://arelay.to/agent-relay", { headers: AGENT })).status).toBe(200);
  });

  it("never changes the guide response when writeDataPoint throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { fetch } = setup(200, {
      ARELAY_ANALYTICS: { writeDataPoint: () => { throw new Error("boom"); } },
    });
    const response = await fetch("https://arelay.to/agent-relay", { headers: AGENT });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("guide");
    expect(warn).toHaveBeenCalledWith("arelay analytics: data point write failed");
  });

  it("never writes IPs, user agents, URLs, or query strings", async () => {
    const { points, fetch } = setup();
    await fetch("https://arelay.to/agent-relay?SENTINEL-QUERY=1", {
      headers: {
        accept: "*/*",
        "user-agent": "SENTINEL-UA/1.0",
        "cf-connecting-ip": "198.51.100.77",
        "cf-ipcountry": "SENTINEL-COUNTRY",
      },
    });
    expect(points).toHaveLength(1);
    const serialized = JSON.stringify(points);
    for (const sentinel of ["SENTINEL", "198.51.100.77", "arelay.to", "?", SECRET]) {
      expect(serialized).not.toContain(sentinel);
    }
  });

  it("only counts GETs negotiated to the guide", () => {
    const get = new Request("https://arelay.to/agent-relay");
    expect(getGuideAnalyticsHandle(get, "/u/agent-relay/agent.md")).toBe("agent-relay");
    expect(getGuideAnalyticsHandle(get, "/u/agent-relay")).toBeUndefined();
    expect(getGuideAnalyticsHandle(get, undefined)).toBeUndefined();
    expect(getGuideAnalyticsHandle(new Request("https://arelay.to/agent-relay", { method: "HEAD" }), "/u/agent-relay/agent.md"))
      .toBeUndefined();
  });
});

describe("router dashboard recorder exclusion", () => {
  it("never clones or records dashboard requests or their grants", async () => {
    const { points, put, upstream, fetch } = setup();
    const grant = "SENTINEL-GRANT-abc.def";
    await fetch(`https://agentrelay.com/u/acme-support/dashboard?grant=${grant}`, { headers: AGENT });
    await fetch("https://agentrelay.com/u/acme-support/dashboard", { headers: AGENT });
    await fetch("https://agentrelay.com/u/acme-support/dashboard/", { headers: AGENT });
    await fetch(`https://agentrelay.com/u/acme-support/dashboard.json?grant=${grant}`, { headers: AGENT });
    await fetch(`https://agentrelay.com/U/acme-support/Dashboard?grant=${grant}`, { headers: AGENT });
    await fetch(`https://agentrelay.com/pricing?GRANT=${grant}`, { headers: AGENT });
    expect(upstream).toHaveBeenCalledTimes(6);
    expect(put).not.toHaveBeenCalled();
    expect(JSON.stringify(put.mock.calls)).not.toContain(grant);
    expect(points).toEqual([]);
  });

  it("excludes the whole /u/ namespace and any grant-bearing URL", () => {
    expect(isAgentPageRequestPath("/u/acme/dashboard")).toBe(true);
    expect(isAgentPageRequestPath("/u/acme/dashboard/")).toBe(true);
    expect(isAgentPageRequestPath("/u/acme/dashboard/data")).toBe(true);
    expect(isAgentPageRequestPath("/u/acme/agent.md")).toBe(true);
    expect(isAgentPageRequestPath("/u/acme/dashboard.json")).toBe(true);
    expect(isAgentPageRequestPath("/U/acme/Dashboard")).toBe(true);
    expect(isAgentPageRequestPath("/pricing")).toBe(false);
    expect(isAgentPageRequestPath("/user")).toBe(false);
    expect(carriesDashboardGrant(new URL("https://agentrelay.com/x?Grant=1"))).toBe(true);
    expect(carriesDashboardGrant(new URL("https://agentrelay.com/x?granted=1"))).toBe(false);
  });
});

describe("router analytics schema parity with relay-agent", () => {
  it("uses the shared ordered v1 layout", () => {
    expect(guideFetchedDataPoint("acme", "codex", "DE", "a".repeat(64))).toEqual({
      indexes: ["acme"],
      blobs: ["v1", "agent_guide_fetched", "acme", "not_applicable", "codex", "DE", "none", "a".repeat(64), "router"],
      doubles: [1, -1],
    });
    expect(guideFetchedDataPoint("Bad Handle", "curl", "DE", "a".repeat(64))).toBeNull();
    expect(guideFetchedDataPoint("acme", "curl", "DE", "nope")).toBeNull();
  });

  it("classifies clients and reads only cf.country", () => {
    expect(classifyClient("claude-cli/2.1.0 (external, cli)")).toBe("claude-code");
    expect(classifyClient("codex_cli_rs/0.40.0")).toBe("codex");
    expect(classifyClient("Grok-Agent/1.0")).toBe("grok");
    expect(classifyClient("curl/8.7.1")).toBe("curl");
    expect(classifyClient(null)).toBe("other");
    const spoofed = new Request("https://arelay.to/", { headers: { "cf-ipcountry": "FR" } });
    expect(requestCountry(spoofed)).toBe("unknown");
    Object.defineProperty(spoofed, "cf", { value: { country: "de" } });
    expect(requestCountry(spoofed)).toBe("DE");
  });

  it("matches relay-agent's daily pseudonym: stable per UTC day, rotating, per handle", async () => {
    const day = Date.UTC(2026, 9, 7, 1);
    const first = await visitorPseudonym(SECRET, "acme", "203.0.113.9", "curl/8", day);
    // Known answer pinned identically in relay-agent's test/analytics.test.ts.
    expect(first).toBe("8eb91751cc9174b9b70b3c032b996d0d0d5d3a1d98be2451e1af72e774859dbb");
    expect(await visitorPseudonym(SECRET, "acme", "203.0.113.9", "curl/8", day + 22 * 3_600_000)).toBe(first);
    expect(await visitorPseudonym(SECRET, "acme", "203.0.113.9", "curl/8", day + 23 * 3_600_000)).not.toBe(first);
    expect(await visitorPseudonym(SECRET, "other", "203.0.113.9", "curl/8", day)).not.toBe(first);
    expect(await visitorPseudonym(undefined, "acme", "203.0.113.9", "curl/8", day)).toBeUndefined();
  });
});
