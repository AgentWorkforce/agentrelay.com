import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "../index.js";
import { isPrimaryHost, PRIMARY_HOST_ALIASES } from "../src/hosts.js";

type Env = Parameters<typeof worker.fetch>[1];

const APEX = "agentrelay.com";
const PUBLIC = "public.agentrelay.com";
const PUBLIC_STAGING = "public-staging.agentrelay.com";
const PRIMARY_HOSTS = [APEX, PUBLIC, PUBLIC_STAGING] as const;
// Hosts that must keep their pre-alias behaviour. app.public.agentrelay.com is
// the dashboard on EKS and is never routed here, but the router must not treat
// it (or any other subdomain) as a primary host if a request ever arrives.
const OTHER_HOSTS = ["app.public.agentrelay.com", "www.agentrelay.com", "public.agentrelay.com.evil.test"];

function buildCtx(): ExecutionContext {
  return {
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
  } as unknown as ExecutionContext;
}

function buildEnv(overrides: Record<string, unknown> = {}): Env {
  return {
    CLOUD_APP_ORIGIN: "https://origin.test.invalid",
    CLOUD_WEB_WORKER: { fetch: vi.fn(async () => new Response("cloud", { status: 200 })) },
    FILE_OBSERVER_ORIGIN: "https://file-observer.test.invalid",
    ...overrides,
  } as unknown as Env;
}

function stubUpstream() {
  const upstream = vi.fn(async (_request: Request) => new Response("web", { status: 200 }));
  vi.stubGlobal("fetch", upstream);
  return upstream;
}

// What the router did with a request, independent of the requesting host.
async function routeOf(host: string, path: string, init: RequestInit = {}, envOverrides = {}) {
  const upstream = stubUpstream();
  const env = buildEnv(envOverrides);
  const response = await worker.fetch(new Request(`https://${host}${path}`, init), env, buildCtx());
  const cloud = (env as unknown as { CLOUD_WEB_WORKER?: { fetch: ReturnType<typeof vi.fn> } }).CLOUD_WEB_WORKER;
  const proxied = upstream.mock.calls[0]?.[0] as Request | undefined;
  const cloudRequest = cloud?.fetch.mock.calls[0]?.[0] as Request | undefined;
  return {
    response,
    status: response.status,
    location: response.headers.get("location"),
    upstream: proxied ? new URL(proxied.url).origin + new URL(proxied.url).pathname : null,
    forwardedHost: proxied?.headers.get("x-forwarded-host") ?? null,
    cloudPath: cloudRequest ? new URL(cloudRequest.url).pathname : null,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("primary host aliases", () => {
  it("lists exactly the two public hosts", () => {
    expect([...PRIMARY_HOST_ALIASES].sort()).toEqual([PUBLIC_STAGING, PUBLIC].sort());
    for (const host of PRIMARY_HOSTS) expect(isPrimaryHost(host)).toBe(true);
    for (const host of [...OTHER_HOSTS, "arelay.to", "www.arelay.to"]) expect(isPrimaryHost(host)).toBe(false);
  });

  // [path, init] pairs covering each primary-host-only branch of the router.
  const cases: Array<[string, string, RequestInit?]> = [
    ["marketing root", "/"],
    ["docs page", "/docs/quickstart"],
    ["file observer", "/observer/file/abc"],
    ["relaycast observer", "/observer/abc"],
    ["cloud app", "/cloud/dashboard"],
    ["connect invite", "/connect/abcdefghijklmnopqrstuvwxyz012345"],
    ["OAuth well-known", "/.well-known/oauth-authorization-server"],
    ["root MCP endpoint", "/mcp", { method: "POST", body: "{}" }],
    ["agent page for an agent", "/u/agent-relay", { headers: { accept: "*/*" } }],
    ["agent page for a browser", "/u/agent-relay", { headers: { accept: "text/html" } }],
    ["directory for an agent", "/directory", { headers: { accept: "*/*" } }],
    ["vanity redirect", "/virtual-office"],
  ];

  it.each(cases)("routes %s on public hosts the same as agentrelay.com", async (_name, path, init) => {
    const apex = await routeOf(APEX, path, init);
    for (const host of [PUBLIC, PUBLIC_STAGING]) {
      const alias = await routeOf(host, path, init);
      expect(alias.status).toBe(apex.status);
      expect(alias.location).toBe(apex.location);
      expect(alias.upstream).toBe(apex.upstream);
      expect(alias.cloudPath).toBe(apex.cloudPath);
      if (apex.forwardedHost) expect(alias.forwardedHost).toBe(host);
    }
  });

  it("sends representative paths where agentrelay.com sends them", async () => {
    expect((await routeOf(PUBLIC, "/docs")).upstream).toBe("https://origin-web.agentrelay.com/docs");
    expect((await routeOf(PUBLIC, "/observer/file/x")).upstream).toBe("https://file-observer.test.invalid/x");
    expect((await routeOf(PUBLIC, "/observer/x")).upstream).toBe("https://observer.relaycast.dev/observer/x");
    expect((await routeOf(PUBLIC, "/cloud/x")).cloudPath).toBe("/cloud/x");
    expect((await routeOf(PUBLIC, "/mcp", { method: "POST", body: "{}" })).cloudPath).toBe("/cloud/mcp");
    expect((await routeOf(PUBLIC, "/u/agent-relay", { headers: { accept: "*/*" } })).upstream)
      .toBe("https://origin-web.agentrelay.com/u/agent-relay/agent.md");
  });

  it("keeps the legacy agent page redirect on the requesting host", async () => {
    expect((await routeOf(APEX, "/agent-relay")).location).toBe("https://agentrelay.com/u/agent-relay");
    expect((await routeOf(PUBLIC, "/agent-relay")).location).toBe("https://public.agentrelay.com/u/agent-relay");
  });

  it("marks alias responses noindex and leaves agentrelay.com untouched", async () => {
    expect((await routeOf(APEX, "/")).response.headers.get("x-robots-tag")).toBeNull();
    expect((await routeOf(PUBLIC, "/")).response.headers.get("x-robots-tag")).toBe("noindex");
    expect((await routeOf(PUBLIC_STAGING, "/")).response.headers.get("x-robots-tag")).toBe("noindex");
    // Redirects (immutable headers) are tagged too.
    expect((await routeOf(PUBLIC, "/agent-relay")).response.headers.get("x-robots-tag")).toBe("noindex");
  });

  it("answers the OpenAI apps challenge on agentrelay.com only", async () => {
    const env = { OPENAI_APPS_CHALLENGE_TOKEN: "token-123" };
    const apex = await routeOf(APEX, "/.well-known/openai-apps-challenge", {}, env);
    expect(apex.status).toBe(200);
    expect(await apex.response.text()).toBe("token-123");
    const alias = await routeOf(PUBLIC, "/.well-known/openai-apps-challenge", {}, env);
    expect(alias.upstream).toBe("https://origin-web.agentrelay.com/.well-known/openai-apps-challenge");
    expect(await alias.response.text()).toBe("web");
  });

  it.each(OTHER_HOSTS)("leaves %s unaffected", async (host) => {
    // Not primary: no file-observer split, no vanity redirect, no noindex.
    const observer = await routeOf(host, "/observer/file/x");
    expect(observer.upstream).toBe("https://origin-web.agentrelay.com/observer/file/x");
    const vanity = await routeOf(host, "/virtual-office");
    expect(vanity.status).toBe(200);
    expect(vanity.upstream).toBe("https://origin-web.agentrelay.com/virtual-office");
    expect(vanity.response.headers.get("x-robots-tag")).toBeNull();
  });

  it("still sends arelay.to people to agentrelay.com", async () => {
    expect((await routeOf("arelay.to", "/")).location).toBe("https://agentrelay.com/");
    expect((await routeOf("arelay.to", "/download")).location).toBe("https://agentrelay.com/download");
  });
});

describe("staging router configuration", () => {
  it("falls back to WEB_ORIGIN when set", async () => {
    const staging = await routeOf(PUBLIC_STAGING, "/docs", {}, {
      WEB_ORIGIN: "https://origin-web-staging.agentrelay.com",
    });
    expect(staging.upstream).toBe("https://origin-web-staging.agentrelay.com/docs");
    expect(staging.forwardedHost).toBe(PUBLIC_STAGING);
  });

  it("answers 503 for /cloud* with no cloud binding and no CLOUD_PROXY_ORIGIN", async () => {
    const result = await routeOf(PUBLIC_STAGING, "/cloud/x", {}, { CLOUD_WEB_WORKER: undefined });
    expect(result.status).toBe(503);
    expect(result.upstream).toBeNull();
  });

  it("proxies /cloud* to CLOUD_PROXY_ORIGIN when the cloud binding is absent", async () => {
    const result = await routeOf(PUBLIC_STAGING, "/cloud/x", {}, {
      CLOUD_WEB_WORKER: undefined,
      CLOUD_PROXY_ORIGIN: "https://cloud-staging.test.invalid",
    });
    expect(result.status).toBe(200);
    expect(result.upstream).toBe("https://cloud-staging.test.invalid/cloud/x");
  });

  it("prefers the cloud binding over CLOUD_PROXY_ORIGIN", async () => {
    const result = await routeOf(APEX, "/cloud/x", {}, {
      CLOUD_PROXY_ORIGIN: "https://cloud-staging.test.invalid",
    });
    expect(result.cloudPath).toBe("/cloud/x");
    expect(result.upstream).toBeNull();
  });
});
