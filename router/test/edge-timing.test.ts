import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "../index.js";
import { routeClass, startEdgeTiming } from "../src/edge-timing.js";

const SERVER_TIMING_SHAPE =
  /^(?:edge-(?:up|total);dur=\d+(?:\.\d)?|cf-colo;desc="[A-Z]{3}")(?:, (?:edge-(?:up|total);dur=\d+(?:\.\d)?|cf-colo;desc="[A-Z]{3}"))*$/;

function withColo(request: Request, colo: string): Request {
  Object.defineProperty(request, "cf", { value: { colo } });
  return request;
}

function buildCtx(): ExecutionContext {
  return {
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
  } as unknown as ExecutionContext;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("routeClass", () => {
  it.each([
    ["/cloud/api/v1/workspaces/ws_secret/sandboxes", "/cloud/api"],
    ["/cloud/_next/static/chunks/a.js", "/cloud/_next"],
    ["/cloud/dashboard/sessions/sess_123", "/cloud/dashboard"],
    ["/cloud/login", "/cloud"],
    ["/u/some-handle/agent.md", "/u"],
    ["/observer/file/x", "/observer"],
    ["/blog/some-post", "/"],
  ])("%s -> %s", (path, expected) => {
    expect(routeClass(path)).toBe(expected);
  });
});

describe("router Server-Timing", () => {
  it("adds edge timing to a /cloud response without leaking request secrets", async () => {
    const cloudWebWorker = {
      fetch: vi.fn(async () =>
        new Response("ok", { status: 200, headers: { "x-upstream": "1" } }),
      ),
    };
    const env = {
      CLOUD_APP_ORIGIN: "https://origin.test.invalid",
      CLOUD_WEB_WORKER: cloudWebWorker,
    } as unknown as Parameters<typeof worker.fetch>[1];
    const request = withColo(
      new Request(
        "https://agentrelay.com/cloud/api/v1/workspaces/ws_secret123/sandboxes?token=querysecret",
        {
          headers: {
            authorization: "Bearer bearersecret",
            cookie: "agent_relay_session=cookiesecret",
            "cf-connecting-ip": "203.0.113.9",
          },
        },
      ),
      "SJC",
    );

    const response = await worker.fetch(request, env, buildCtx());

    expect(response.status).toBe(200);
    expect(response.headers.get("x-upstream")).toBe("1");
    expect(await response.text()).toBe("ok");
    const timing = response.headers.get("server-timing");
    expect(timing).not.toBeNull();
    expect(timing).toMatch(SERVER_TIMING_SHAPE);
    expect(timing).toContain("edge-up;dur=");
    expect(timing).toContain("edge-total;dur=");
    expect(timing).toContain('cf-colo;desc="SJC"');
    for (const secret of ["ws_secret123", "querysecret", "bearersecret", "cookiesecret", "203.0.113.9"]) {
      expect(timing).not.toContain(secret);
    }
  });

  it("adds edge timing to static assets and early redirects", async () => {
    const env = {
      CLOUD_APP_ORIGIN: "https://origin.test.invalid",
      CLOUD_WEB_WORKER: { fetch: vi.fn(async () => new Response("js")) },
    } as unknown as Parameters<typeof worker.fetch>[1];

    const asset = await worker.fetch(
      new Request("https://agentrelay.com/cloud/_next/static/chunks/a.js"),
      env,
      buildCtx(),
    );
    expect(asset.headers.get("server-timing")).toMatch(SERVER_TIMING_SHAPE);

    const redirect = await worker.fetch(
      new Request("https://agentrelay.com/will"),
      env,
      buildCtx(),
    );
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("location")).toBeTruthy();
    expect(redirect.headers.get("server-timing")).toMatch(SERVER_TIMING_SHAPE);
  });
});

describe("slow request log", () => {
  it("logs one id-free line when the request exceeds the threshold", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    let now = 0;
    const timing = startEdgeTiming(
      withColo(
        new Request("https://agentrelay.com/cloud/api/v1/workspaces/ws_secret/x?grant=g_secret"),
        "SJC",
      ),
      () => now,
    );
    now += 20;
    await timing.measure("up", async () => {
      now += 600;
    });
    const response = timing.finish(new Response("ok", { status: 200 }));

    expect(response.headers.get("server-timing")).toBe(
      'edge-up;dur=600, edge-total;dur=620, cf-colo;desc="SJC"',
    );
    expect(log).toHaveBeenCalledOnce();
    const line = String(log.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toEqual({
      event: "router_slow_request",
      route: "/cloud/api",
      method: "GET",
      status: 200,
      colo: "SJC",
      upMs: 600,
      totalMs: 620,
    });
    expect(line).not.toContain("secret");
  });

  it("logs a thrown handler with the error name only, then rethrows", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    let now = 0;
    const timing = startEdgeTiming(
      withColo(new Request("https://agentrelay.com/cloud/api/v1/workspaces/ws_secret/x"), "SJC"),
      () => now,
    );
    const failure = new TypeError("binding failed for ws_secret");
    await expect(
      timing.measure("up", async () => {
        now += 40;
        throw failure;
      }),
    ).rejects.toBe(failure);
    timing.fail(failure);

    expect(log).toHaveBeenCalledOnce();
    const line = String(log.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toEqual({
      event: "router_request_failed",
      route: "/cloud/api",
      method: "GET",
      colo: "SJC",
      error: "TypeError",
      upMs: 40,
      totalMs: 40,
    });
    expect(line).not.toContain("secret");
  });

  it("stays quiet under the threshold", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    let now = 0;
    const timing = startEdgeTiming(new Request("https://agentrelay.com/cloud"), () => now);
    now = 120;
    timing.finish(new Response("ok"));
    expect(log).not.toHaveBeenCalled();
  });
});
