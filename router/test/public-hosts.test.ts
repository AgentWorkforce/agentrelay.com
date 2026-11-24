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

  // Cases whose request ends up on a /cloud* path (directly or via a rewrite):
  // on the aliases these go to the new stack instead (see below).
  const cloudCases = new Set(["cloud app", "connect invite", "OAuth well-known", "root MCP endpoint"]);
  const siteCases = cases.filter(([name]) => !cloudCases.has(name));

  it.each(siteCases)("routes %s on both aliases the same as agentrelay.com", async (_name, path, init) => {
    const apex = await routeOf(APEX, path, init);
    for (const host of [PUBLIC, PUBLIC_STAGING]) {
      const alias = await routeOf(host, path, init);
      expect(alias.status).toBe(apex.status);
      expect(alias.location).toBe(apex.location);
      expect(alias.upstream).toBe(apex.upstream);
      expect(alias.cloudPath).toBe(apex.cloudPath);
      if (apex.forwardedHost) expect(alias.forwardedHost).toBe(host);
      expect(alias.response.headers.get("x-robots-tag")).toBe("noindex");
    }
  });

  it("sends representative site paths where agentrelay.com sends them", async () => {
    expect((await routeOf(PUBLIC, "/docs")).upstream).toBe("https://origin-web.agentrelay.com/docs");
    expect((await routeOf(PUBLIC, "/blog")).upstream).toBe("https://origin-web.agentrelay.com/blog");
    expect((await routeOf(PUBLIC, "/signup/teams")).upstream).toBe("https://origin-web.agentrelay.com/signup/teams");
    expect((await routeOf(PUBLIC, "/observer/file/x")).upstream).toBe("https://file-observer.test.invalid/x");
    expect((await routeOf(PUBLIC, "/observer/x")).upstream).toBe("https://observer.relaycast.dev/observer/x");
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
  // public-staging's own /cloud* redirects to the staging dashboard host (see
  // "new-stack redirects"); these cover any other host the staging Worker
  // answers, such as a preview URL.
  const PREVIEW = "agentrelay-router-staging.example.workers.dev";
  const cloudPaths = ["/cloud", "/cloud/x", "/cloud/api/v1/webhooks/nango"];

  it.each(cloudPaths)("answers 503 for %s on a non-alias host with no staging Cloud target", async (path) => {
    const result = await routeOf(PREVIEW, path, {}, { ...STAGING_ENV, CLOUD_WEB_WORKER: undefined, CLOUD_APP_ORIGIN: undefined });
    expect(result.status).toBe(503);
    expect(result.upstream).toBeNull();
  });

  it.each(cloudPaths)("never reaches production Cloud for %s, even with every prod path bound", async (path) => {
    const env = { ...STAGING_ENV, ...prodCloudEverywhere() };
    const upstream = stubUpstream();
    const response = await worker.fetch(new Request(`https://${PREVIEW}${path}`), env as unknown as Env, buildCtx());
    expect(response.status).toBe(503);
    expect(env.CLOUD_WEB_WORKER.fetch).not.toHaveBeenCalled();
    expect(env.WEBHOOK_WORKER.fetch).not.toHaveBeenCalled();
    expect(upstream).not.toHaveBeenCalled();
  });

  it("proxies a non-alias host's /cloud* to the staging CLOUD_PROXY_ORIGIN only", async () => {
    const env = { ...STAGING_ENV, ...prodCloudEverywhere(), CLOUD_PROXY_ORIGIN: STAGING_CLOUD };
    const upstream = stubUpstream();
    const response = await worker.fetch(new Request(`https://${PREVIEW}/cloud/api/v1/webhooks/nango`), env as unknown as Env, buildCtx());
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

  it("ignores the staging-only and public-app vars on existing hosts", async () => {
    const env = {
      WEB_ORIGIN: "https://origin-web-staging.agentrelay.com",
      CLOUD_PROXY_ORIGIN: STAGING_CLOUD,
      PUBLIC_APP_ORIGIN: "https://app.public.agentrelay.com",
    };
    expect((await routeOf(APEX, "/docs", {}, env)).upstream).toBe("https://origin-web.agentrelay.com/docs");
    expect((await routeOf(PUBLIC, "/docs", {}, env)).upstream).toBe("https://origin-web.agentrelay.com/docs");
    for (const path of ["/cloud/x", "/cloud/api/auth/google/start?next=%2F", "/cloud/dashboard"]) {
      const apex = await routeOf(APEX, path, {}, env);
      expect(apex.location).toBeNull();
      expect(apex.cloudPath).toBe(new URL(path, "https://x").pathname);
    }
    const login = await routeOf(APEX, "/login", {}, env);
    expect(login.location).toBeNull();
    expect(login.upstream).toBe("https://origin-web.agentrelay.com/login");
    const unbound = await routeOf(APEX, "/cloud/x", {}, { ...env, CLOUD_WEB_WORKER: undefined });
    expect(unbound.status).toBe(503);
    expect(unbound.upstream).toBeNull();
  });
});

// [request path, dashboard-host path] for the mapping in src/public-app.ts.
const APP_MAPPING: Array<[string, string]> = [
  ["/login", "/login"],
  ["/login/", "/login"],
  ["/cloud", "/"],
  ["/cloud/", "/"],
  ["/cloud/api/auth/google/start", "/cloud/api/auth/google/start"],
  ["/cloud/api/auth/microsoft/start", "/cloud/api/auth/microsoft/start"],
  ["/cloud/api/auth/oidc/start/", "/cloud/api/auth/oidc/start/"],
  ["/cloud/api/auth/google/callback", "/cloud/api/auth/google/callback"],
  ["/cloud/api/v1/me", "/cloud/api/v1/me"],
  ["/cloud/api/v1/webhooks/nango", "/cloud/api/v1/webhooks/nango"],
  ["/cloud/mcp", "/cloud/mcp"],
  ["/cloud/.well-known/oauth-authorization-server", "/cloud/.well-known/oauth-authorization-server"],
  ["/cloud/oauth/authorize", "/cloud/oauth/authorize"],
  ["/mcp", "/mcp"],
  ["/.well-known/oauth-authorization-server", "/.well-known/oauth-authorization-server"],
  ["/.well-known/oauth-protected-resource/mcp", "/.well-known/oauth-protected-resource/mcp"],
  ["/.well-known/openid-configuration/cloud", "/.well-known/openid-configuration/cloud"],
  ["/cloud/dashboard", "/"],
  ["/cloud/dashboard/sessions", "/sessions"],
  ["/cloud/teams/connect", "/teams/connect"],
  ["/cloud/login", "/login"],
  ["/dashboard", "/"],
  ["/dashboard/", "/"],
  ["/dashboard/workflows/listeners/abc", "/workflows/listeners/abc"],
  ["/connect/abcdefghijklmnopqrstuvwxyz012345", "/connect/abcdefghijklmnopqrstuvwxyz012345"],
];
const QUERY = "?next=%2Fdashboard%2Fworkflows&invite_token=abc&tag=a&tag=b";

describe("new-stack redirects on the aliases", () => {
  const targets = [
    [PUBLIC, "https://app.public.agentrelay.com", {}],
    [PUBLIC_STAGING, "https://app.public-staging.agentrelay.com", STAGING_ENV],
  ] as const;

  for (const [host, origin, env] of targets) {
    it.each(APP_MAPPING)(`${host}%s redirects to ${origin}%s, keeping the query`, async (path, target) => {
      for (const method of ["GET", "HEAD"]) {
        const result = await routeOf(host, `${path}${QUERY}`, { method }, env);
        expect(result.status).toBe(302);
        expect(result.location).toBe(`${origin}${target}${QUERY}`);
        expect(result.response.headers.get("cache-control")).toBe("no-store");
        expect(result.response.headers.get("x-robots-tag")).toBe("noindex");
        expect(result.cloudPath).toBeNull();
        expect(result.upstream).toBeNull();
      }
    });
  }

  const SAME_ORIGIN_SITE_APIS = [
    "/cloud/api/v1/events-shim/inbox",
    "/cloud/api/v1/events-shim",
    "/cloud/api/v1/signup/agent/sessions",
    "/cloud/api/v1/signup/agent/sessions/abc123",
  ];

  it.each(SAME_ORIGIN_SITE_APIS)("public.* keeps the site's same-origin bearer API %s and dispatches it to Cloud (no cross-origin redirect)", async (path) => {
    for (const method of ["GET", "POST"]) {
      const result = await routeOf(PUBLIC, path, { method, body: method === "POST" ? "{}" : undefined, headers: { authorization: "Bearer t" } });
      expect(result.location).toBeNull();
      expect([302, 307, 503]).not.toContain(result.status);
      expect(result.cloudPath ?? result.upstream).not.toBeNull();
    }
  });

  it.each(SAME_ORIGIN_SITE_APIS)("public-staging.* still redirects %s (it has no Cloud upstream)", async (path) => {
    const result = await routeOf(PUBLIC_STAGING, path, { method: "GET" }, STAGING_ENV);
    expect(result.status).toBe(302);
    expect(result.location).toBe(`https://app.public-staging.agentrelay.com${path}`);
  });

  it("uses 307 for other methods so the method and body are kept", async () => {
    for (const method of ["POST", "PUT", "DELETE"]) {
      const result = await routeOf(PUBLIC, "/cloud/api/v1/me", { method, body: method === "DELETE" ? undefined : "{}" });
      expect(result.status).toBe(307);
      expect(result.location).toBe("https://app.public.agentrelay.com/cloud/api/v1/me");
      expect(result.response.headers.get("cache-control")).toBe("no-store");
      expect(result.cloudPath).toBeNull();
      expect(result.upstream).toBeNull();
    }
  });

  it("sends the agent-chat Cloud fallback to the new stack, not the old Cloud", async () => {
    const chat = "/agent-relay/0123456789abcdef0123456789abcdef";
    const result = await routeOf(PUBLIC, chat, { method: "POST", body: "hi" }, { RELAY_AGENT_WORKER: undefined });
    expect(result.status).toBe(307);
    expect(result.location).toBe("https://app.public.agentrelay.com/cloud/api/v1/agent-chat/agent-relay/0123456789abcdef0123456789abcdef");
    expect(result.cloudPath).toBeNull();
  });

  it("never calls the old Cloud binding, facade or webhook Worker for alias Cloud paths", async () => {
    const paths = [...APP_MAPPING.map(([path]) => path), "/cloud/api/v1/workspaces/rw_on/sessions"];
    for (const host of [PUBLIC, PUBLIC_STAGING]) {
      for (const method of ["GET", "POST"]) {
        for (const path of paths) {
          const env = { ...prodCloudEverywhere(), ...(host === PUBLIC_STAGING ? STAGING_ENV : {}) };
          const upstream = stubUpstream();
          const response = await worker.fetch(
            new Request(`https://${host}${path}`, { method, body: method === "POST" ? "{}" : undefined }),
            env as unknown as Env,
            buildCtx(),
          );
          expect([302, 307]).toContain(response.status);
          expect(env.CLOUD_WEB_WORKER.fetch).not.toHaveBeenCalled();
          expect(env.WEBHOOK_WORKER.fetch).not.toHaveBeenCalled();
          expect(upstream).not.toHaveBeenCalled();
          vi.unstubAllGlobals();
        }
      }
    }
  });

  it("never sends public-staging to the production dashboard", async () => {
    // A production-shaped env (PUBLIC_APP_ORIGIN for public.*) receiving a
    // public-staging request still targets the staging dashboard host.
    for (const env of [{ PUBLIC_APP_ORIGIN: "https://app.public.agentrelay.com" }, STAGING_ENV, {}]) {
      const result = await routeOf(PUBLIC_STAGING, "/cloud/api/auth/google/start", {}, env);
      expect(result.location).toBe("https://app.public-staging.agentrelay.com/cloud/api/auth/google/start");
    }
  });

  it("applies PUBLIC_APP_ORIGIN only to the alias its environment serves", async () => {
    const custom = "https://dashboard.example.test";
    expect((await routeOf(PUBLIC, "/login", {}, { PUBLIC_APP_ORIGIN: custom })).location).toBe(`${custom}/login`);
    expect((await routeOf(PUBLIC, "/login", {}, { ...STAGING_ENV, PUBLIC_APP_ORIGIN: custom })).location)
      .toBe("https://app.public.agentrelay.com/login");
    expect((await routeOf(PUBLIC_STAGING, "/login", {}, { ...STAGING_ENV, PUBLIC_APP_ORIGIN: custom })).location)
      .toBe(`${custom}/login`);
    // Not an https origin: the default is used.
    expect((await routeOf(PUBLIC, "/login", {}, { PUBLIC_APP_ORIGIN: "http://evil.test/x" })).location)
      .toBe("https://app.public.agentrelay.com/login");
  });

  it("does not redirect sign-in, the dashboard or Cloud on agentrelay.com", async () => {
    for (const [path] of APP_MAPPING) {
      const result = await routeOf(APEX, `${path}${QUERY}`);
      expect(result.location?.startsWith("https://app.public")).not.toBe(true);
    }
    const start = await routeOf(APEX, "/cloud/api/auth/google/start?next=x");
    expect(start.location).toBeNull();
    expect(start.cloudPath).toBe("/cloud/api/auth/google/start");
  });

  it("leaves marketing pages on the aliases", async () => {
    for (const path of ["/", "/docs", "/blog", "/signup/teams", "/agents/register", "/connect", "/cloudy"]) {
      const result = await routeOf(PUBLIC, path);
      expect(result.location).toBeNull();
      expect(result.upstream).toBe(`https://origin-web.agentrelay.com${path}`);
    }
  });
});
