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

  // Cases whose request ends up on a /cloud* path (directly or via a rewrite).
  const cloudCases = new Set(["cloud app", "connect invite", "OAuth well-known", "root MCP endpoint"]);

  it.each(cases)("routes %s on public.agentrelay.com the same as agentrelay.com", async (_name, path, init) => {
    const apex = await routeOf(APEX, path, init);
    const alias = await routeOf(PUBLIC, path, init);
    expect(alias.status).toBe(apex.status);
    expect(alias.location).toBe(apex.location);
    expect(alias.upstream).toBe(apex.upstream);
    expect(alias.cloudPath).toBe(apex.cloudPath);
    if (apex.forwardedHost) expect(alias.forwardedHost).toBe(PUBLIC);
    expect(alias.response.headers.get("x-robots-tag")).toBe("noindex");
  });

  it.each(cases.filter(([name]) => !cloudCases.has(name)))(
    "routes %s on public-staging.agentrelay.com the same as agentrelay.com",
    async (_name, path, init) => {
      const apex = await routeOf(APEX, path, init);
      const alias = await routeOf(PUBLIC_STAGING, path, init);
      expect(alias.status).toBe(apex.status);
      expect(alias.location).toBe(apex.location);
      expect(alias.upstream).toBe(apex.upstream);
      expect(alias.cloudPath).toBe(apex.cloudPath);
      if (apex.forwardedHost) expect(alias.forwardedHost).toBe(PUBLIC_STAGING);
      expect(alias.response.headers.get("x-robots-tag")).toBe("noindex");
    },
  );

  it.each(cases.filter(([name]) => cloudCases.has(name)))(
    "never sends %s on public-staging.agentrelay.com to production Cloud",
    async (_name, path, init) => {
      const alias = await routeOf(PUBLIC_STAGING, path, init);
      expect(alias.status).toBe(503);
      expect(alias.cloudPath).toBeNull();
      expect(alias.upstream).toBeNull();
      expect(alias.response.headers.get("x-robots-tag")).toBe("noindex");
    },
  );

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

// The staging Worker's env, as `wrangler deploy --env staging` binds it.
const STAGING_ENV = {
  ROUTER_ENV: "staging",
  FILE_OBSERVER_ORIGIN: "https://relayfile-file-observer.pages.dev",
  WEB_ORIGIN: "https://origin-web-staging.agentrelay.com",
};
const PROD_CLOUD_ORIGIN = "https://origin.agentrelay.cloud";
const STAGING_CLOUD = "https://cloud-staging.test.invalid";

// Everything production Cloud could be reached through, all present at once,
// to prove staging ignores every one of them.
function prodCloudEverywhere() {
  const routerConfig = new Map([
    ["WEBHOOK_ORIGIN", "worker"],
    ["cloud-facade-routes", JSON.stringify([
      { prefix: "/cloud", origin: "https://prod-aws.agentrelay.com", mode: "on" },
    ])],
  ]);
  return {
    CLOUD_APP_ORIGIN: PROD_CLOUD_ORIGIN,
    CLOUD_WEB_WORKER: { fetch: vi.fn(async () => new Response("prod cloud")) },
    WEBHOOK_WORKER: { fetch: vi.fn(async () => new Response("prod webhook worker")) },
    WEBHOOK_WORKER_ORIGIN: "https://incoming-webhooks.agentrelay.com",
    ROUTER_CONFIG: { get: async (key: string) => routerConfig.get(key) ?? null },
  };
}

describe("staging router", () => {
  const cloudPaths = [
    "/cloud", "/cloud/x", "/cloud/api/v1/webhooks/nango", "/mcp",
    "/.well-known/oauth-authorization-server", "/connect/abcdefghijklmnopqrstuvwxyz012345",
  ];

  it.each(cloudPaths)("answers 503 for %s with no staging Cloud target", async (path) => {
    const result = await routeOf(PUBLIC_STAGING, path, {}, { ...STAGING_ENV, CLOUD_WEB_WORKER: undefined, CLOUD_APP_ORIGIN: undefined });
    expect(result.status).toBe(503);
    expect(result.upstream).toBeNull();
  });

  it.each(cloudPaths)("never reaches production Cloud for %s, even with every prod path bound", async (path) => {
    for (const env of [{ ...STAGING_ENV, ...prodCloudEverywhere() }, prodCloudEverywhere()]) {
      // Second env: a production-shaped Worker receiving a public-staging
      // request (host-based guard, no ROUTER_ENV).
      const upstream = stubUpstream();
      const response = await worker.fetch(new Request(`https://${PUBLIC_STAGING}${path}`), env as unknown as Env, buildCtx());
      expect(response.status).toBe(503);
      expect(env.CLOUD_WEB_WORKER.fetch).not.toHaveBeenCalled();
      expect(env.WEBHOOK_WORKER.fetch).not.toHaveBeenCalled();
      expect(upstream).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    }
  });

  it("guards any host on the staging Worker, not only public-staging", async () => {
    const env = { ...STAGING_ENV, ...prodCloudEverywhere() };
    const upstream = stubUpstream();
    const response = await worker.fetch(new Request("https://agentrelay-router-staging.example.workers.dev/cloud/x"), env as unknown as Env, buildCtx());
    expect(response.status).toBe(503);
    expect(env.CLOUD_WEB_WORKER.fetch).not.toHaveBeenCalled();
    expect(upstream).not.toHaveBeenCalled();
  });

  it("proxies /cloud* to the staging CLOUD_PROXY_ORIGIN only", async () => {
    const env = { ...STAGING_ENV, ...prodCloudEverywhere(), CLOUD_PROXY_ORIGIN: STAGING_CLOUD };
    const upstream = stubUpstream();
    const response = await worker.fetch(new Request(`https://${PUBLIC_STAGING}/cloud/api/v1/webhooks/nango`), env as unknown as Env, buildCtx());
    expect(response.status).toBe(200);
    expect(env.CLOUD_WEB_WORKER.fetch).not.toHaveBeenCalled();
    expect(env.WEBHOOK_WORKER.fetch).not.toHaveBeenCalled();
    const urls = upstream.mock.calls.map(([request]) => new URL((request as Request).url).origin);
    expect(urls).toEqual([STAGING_CLOUD]);
  });

  it("falls back to the staging web origin", async () => {
    const staging = await routeOf(PUBLIC_STAGING, "/docs", {}, STAGING_ENV);
    expect(staging.upstream).toBe("https://origin-web-staging.agentrelay.com/docs");
    expect(staging.forwardedHost).toBe(PUBLIC_STAGING);
  });

  it("ignores the staging-only vars on existing hosts", async () => {
    const env = { WEB_ORIGIN: "https://origin-web-staging.agentrelay.com", CLOUD_PROXY_ORIGIN: STAGING_CLOUD };
    expect((await routeOf(APEX, "/docs", {}, env)).upstream).toBe("https://origin-web.agentrelay.com/docs");
    expect((await routeOf(PUBLIC, "/docs", {}, env)).upstream).toBe("https://origin-web.agentrelay.com/docs");
    expect((await routeOf(APEX, "/cloud/x", {}, env)).cloudPath).toBe("/cloud/x");
    expect((await routeOf(PUBLIC, "/cloud/x", {}, env)).cloudPath).toBe("/cloud/x");
    const unbound = await routeOf(APEX, "/cloud/x", {}, { ...env, CLOUD_WEB_WORKER: undefined });
    expect(unbound.status).toBe(503);
    expect(unbound.upstream).toBeNull();
  });
});

describe("public.agentrelay.com sign-in start", () => {
  const starts = ["/cloud/api/auth/google/start", "/cloud/api/auth/microsoft/start", "/cloud/api/auth/oidc/start/"];

  it.each(starts)("redirects %s to agentrelay.com, keeping the query", async (path) => {
    for (const method of ["GET", "HEAD"]) {
      const result = await routeOf(PUBLIC, `${path}?returnTo=%2Fcloud%2Fapp&invite=abc`, { method });
      expect(result.status).toBe(302);
      expect(result.location).toBe(`https://agentrelay.com${path}?returnTo=%2Fcloud%2Fapp&invite=abc`);
      expect(result.response.headers.get("cache-control")).toBe("no-store");
      expect(result.cloudPath).toBeNull();
      expect(result.upstream).toBeNull();
    }
  });

  it.each(starts)("does not redirect %s on agentrelay.com", async (path) => {
    const result = await routeOf(APEX, `${path}?returnTo=x`);
    expect(result.location).toBeNull();
    expect(result.cloudPath).toBe(path);
  });

  it("leaves POST and other auth and /cloud paths on the alias with the binding", async () => {
    for (const [path, method] of [
      ["/cloud/api/auth/google/start", "POST"],
      ["/cloud/api/auth/google/callback", "GET"],
      ["/cloud/api/auth/github/start", "GET"],
      ["/cloud/api/auth/google/start/extra", "GET"],
      ["/cloud/dashboard", "GET"],
    ] as const) {
      const result = await routeOf(PUBLIC, path, { method, body: method === "POST" ? "{}" : undefined });
      expect(result.location).toBeNull();
      expect(result.cloudPath).toBe(path);
    }
  });

  it.each(starts)("never sends public-staging %s to production sign-in", async (path) => {
    for (const env of [{}, { ...STAGING_ENV, CLOUD_WEB_WORKER: undefined }]) {
      const result = await routeOf(PUBLIC_STAGING, `${path}?returnTo=x`, {}, env);
      expect(result.status).toBe(503);
      expect(result.location).toBeNull();
      expect(result.cloudPath).toBeNull();
      expect(result.upstream).toBeNull();
    }
    const proxied = await routeOf(PUBLIC_STAGING, path, {}, { ...STAGING_ENV, CLOUD_PROXY_ORIGIN: STAGING_CLOUD });
    expect(proxied.location).toBeNull();
    expect(proxied.upstream).toBe(`${STAGING_CLOUD}${path}`);
  });
});
