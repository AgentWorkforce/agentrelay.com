// Differential harness: replays a request matrix through a router build with
// production-shaped mocked bindings and captures everything observable — the
// response (status, every header, body), every outbound fetch and
// service-binding call (URL, method, every header, body), KV reads, R2 writes,
// analytics data points and console output. Two builds are equivalent on a
// case when their observations are deep-equal.
//
// Non-determinism is pinned so equal code gives equal observations:
// performance.now (Server-Timing), Date, Math.random (/founder, recorder
// sampling) and crypto.randomUUID (correlation and record ids).
import { vi } from "vitest";

export type RouterModule = {
  fetch(request: Request, env: never, ctx: ExecutionContext): Promise<Response>;
};

export type MatrixCase = {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
};

type Headers2 = Array<[string, string]>;

type Call = {
  via: string;
  method: string;
  url: string;
  headers: Headers2;
  body: string;
};

export type Observation = {
  status: number;
  statusText: string;
  headers: Headers2;
  body: string;
  calls: Call[];
  kvReads: string[];
  r2Puts: Array<{ key: string; value: string }>;
  dataPoints: unknown[];
  logs: string[];
  threw?: string;
};

// The existing production hosts. public.* and public-staging.* are new and
// covered by public-hosts.test.ts instead.
export const EXISTING_HOSTS = ["agentrelay.com", "www.agentrelay.com", "arelay.to", "www.arelay.to"] as const;

const ID32 = "abcdefghijklmnopqrstuvwxyz012345";
const HEX32 = "0123456789abcdef0123456789abcdef";

export const PATHS = [
  // Marketing / docs / SEO
  "/", "/docs", "/docs/quickstart", "/blog", "/blog/some-post", "/robots.txt", "/sitemap.xml",
  "/llms.txt", "/download", "/download/", "/agents", "/agents/register",
  // Sign-in and dashboard entry points (redirected on the public.* aliases only)
  "/login", "/login/", "/login?next=%2Fcloud%2Fdashboard", "/signup/teams", "/dashboard",
  "/dashboard/sessions", "/cloud/dashboard/sessions", "/cloud/teams/connect", "/cloud/login",
  "/.well-known/openid-configuration",
  // Cloud app and its API, OAuth, well-known, webhooks, facade, recorder exclusions
  "/cloud", "/cloud/", "/cloud/dashboard", "/cloud/api/v1/me", "/cloud/api/v1/me/selfhost-docs",
  "/cloud/api/v1/workspaces/rw_example/sessions", "/cloud/api/v1/workspaces/rw_on/sessions",
  "/cloud/oauth/authorize?client_id=x&redirect_uri=y", "/cloud/.well-known/oauth-authorization-server",
  "/cloud/api/v1/webhooks/nango", "/cloud/api/v1/webhooks/github",
  "/cloud/api/v1/webhooks/composio/connect/callback", "/api/v1/webhooks/nango",
  "/cloud/redirect-me",
  "/cloud/api/auth/google/start", "/cloud/api/auth/microsoft/start?returnTo=%2Fcloud",
  "/cloud/api/auth/oidc/start/", "/cloud/api/auth/google/callback?state=x",
  // MCP gateway
  "/mcp", "/cloud/mcp", "/cloud/api/v1/mcp/shared-sessions", "/cloud/api/v1/mcp/relay-events",
  "/cloud/api/v1/replicas/mcp", "/cloud/api/v1/mcp/relay-events?fail=1",
  // OAuth discovery outside /cloud
  "/.well-known/oauth-authorization-server", "/.well-known/oauth-authorization-server/cloud",
  "/.well-known/openid-configuration/cloud", "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
  "/.well-known/oauth-protected-resource/cloud/api/v1/mcp/shared-sessions",
  "/.well-known/openai-apps-challenge", "/.well-known/mcp-webhook-receiver.json",
  // Relay Connect
  `/connect/${ID32}`, `/connect/${ID32}.json`, `/connect/${ID32}/`, "/connect",
  // Observers
  "/observer", "/observer/abc", "/observer/file", "/observer/file/abc", "/observer/file/redirect-me",
  // Agent pages, directory, legacy redirect
  "/u/agent-relay", "/u/agent-relay/", "/u/agent-relay/agent.md", "/u/acme", "/u/register",
  "/u/agent-relay?grant=secret", "/agent-relay", "/agent-relay/", "/acme", "/directory",
  "/directory/", "/directory.md",
  // Registry and agent chat
  "/register", "/register/", "/register?format=md", "/api/v1/registrations",
  "/api/v1/registrations/abc", "/api/v1/agents/acme", "/api/v1/registrations-legacy",
  `/agent-relay/${HEX32}`, `/acme/${HEX32}`,
  // Vanity redirects
  "/will", "/meet-with-will", "/khaliq", "/meet-with-khaliq", "/founder", "/virtual-office",
  "/WILL/",
  // Random
  "/redirect-me", "/random/a/b?x=1&x=2", "/%2e%2e/etc", "/nope.html", "/cloud%2Fadmin",
] as const;

const VARIANTS: Array<{ name: string; method: string; headers: Record<string, string>; body?: string }> = [
  { name: "GET", method: "GET", headers: {} },
  { name: "GET curl", method: "GET", headers: { accept: "*/*", "user-agent": "curl/8.7.1" } },
  {
    name: "GET html",
    method: "GET",
    headers: { accept: "text/html,application/xhtml+xml,*/*;q=0.8", "user-agent": "Mozilla/5.0" },
  },
  { name: "GET markdown", method: "GET", headers: { accept: "text/markdown" } },
  { name: "HEAD", method: "HEAD", headers: {} },
  {
    name: "POST",
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: '{"jsonrpc":"2.0","id":1,"method":"ping"}',
  },
];

export function buildMatrix(hosts: readonly string[] = EXISTING_HOSTS): MatrixCase[] {
  const cases: MatrixCase[] = [];
  for (const host of hosts) {
    for (const scheme of ["https", "http"]) {
      // Plain HTTP only matters where the router itself redirects (arelay.to);
      // sample it on the root and a chat path for every host.
      const paths = scheme === "https" ? PATHS : ["/", `/agent-relay/${HEX32}`, "/register"];
      for (const path of paths) {
        for (const variant of VARIANTS) {
          cases.push({
            id: `${variant.name} ${scheme}://${host}${path}`,
            url: `${scheme}://${host}${path}`,
            method: variant.method,
            headers: { ...variant.headers, host },
            body: variant.body,
          });
        }
      }
    }
  }
  return cases;
}

function sortedHeaders(headers: Headers): Headers2 {
  const entries: Headers2 = [];
  headers.forEach((value, key) => entries.push([key, value]));
  return entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

async function readRequest(via: string, input: RequestInfo | URL, init?: RequestInit): Promise<Call> {
  const request = input instanceof Request && !init ? input : new Request(input as RequestInfo, init);
  let body = "";
  try {
    body = request.body ? await request.text() : "";
  } catch (error) {
    body = `<unreadable: ${(error as Error).message}>`;
  }
  return { via, method: request.method, url: request.url, headers: sortedHeaders(request.headers), body };
}

// Upstream mock: deterministic, echoes the target, and exercises Location
// rewriting (paths containing "redirect-me") and MCP failure handling
// (fail=1 answers 502).
function upstreamResponse(via: string, call: Call): Response {
  const url = new URL(call.url);
  if (url.searchParams.get("fail") === "1") {
    return new Response("upstream failed", { status: 502, headers: { "content-type": "text/plain" } });
  }
  if (url.pathname.includes("redirect-me")) {
    return new Response(null, {
      status: 302,
      headers: { location: `${url.origin}/landing?from=${encodeURIComponent(url.pathname)}` },
    });
  }
  return new Response(`${via} ${call.method} ${call.url}\n${call.body}`, {
    status: 200,
    headers: {
      "content-type": url.pathname.endsWith(".md") ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8",
      "cache-control": "public, max-age=60",
      "x-upstream": via,
    },
  });
}

function buildEnv(observation: Observation): Record<string, unknown> {
  const binding = (via: string) => ({
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const call = await readRequest(via, input, init);
      observation.calls.push(call);
      return upstreamResponse(via, call);
    },
  });
  const kv = new Map<string, string>([
    ["WEBHOOK_ORIGIN", "worker"],
    ["RECORDER_SAMPLE_RATE", "100"],
    [
      "cloud-facade-routes",
      JSON.stringify([
        {
          prefix: "/cloud/api/v1/workspaces/rw_example/sessions",
          methods: ["GET"],
          origin: "https://api.prod-aws.agentrelay.com",
          mode: "shadow",
        },
        {
          prefix: "/cloud/api/v1/workspaces/rw_on",
          origin: "https://prod-aws.agentrelay.com",
          mode: "on",
        },
      ]),
    ],
  ]);
  // Production config (router/wrangler.jsonc top level) plus deploy secrets.
  // No staging vars.
  return {
    CLOUD_APP_ORIGIN: "https://origin.agentrelay.cloud",
    FILE_OBSERVER_ORIGIN: "https://relayfile-file-observer.pages.dev",
    WEBHOOK_WORKER_ORIGIN: "https://incoming-webhooks.agentrelay.com",
    CLOUD_WEB_WORKER: binding("CLOUD_WEB_WORKER"),
    RELAY_AGENT_WORKER: binding("RELAY_AGENT_WORKER"),
    ROUTER_CONFIG: {
      get: async (key: string) => {
        observation.kvReads.push(key);
        return kv.get(key) ?? null;
      },
    },
    TRAFFIC_RECORDER: {
      put: async (key: string, value: string) => {
        observation.r2Puts.push({ key, value });
        return null;
      },
    },
    ARELAY_ANALYTICS: { writeDataPoint: (point: unknown) => observation.dataPoints.push(point) },
    ANALYTICS_VISITOR_HASH_SECRET: "test-visitor-hash-secret",
    OPENAI_APPS_CHALLENGE_TOKEN: "test-openai-token",
  };
}

export async function observe(router: RouterModule, testCase: MatrixCase): Promise<Observation> {
  const observation: Observation = {
    status: 0, statusText: "", headers: [], body: "", calls: [], kvReads: [], r2Puts: [], dataPoints: [], logs: [],
  };
  let uuid = 0;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-22T12:00:00.000Z"));
  vi.spyOn(performance, "now").mockReturnValue(1000);
  vi.spyOn(Math, "random").mockReturnValue(0);
  vi.spyOn(crypto, "randomUUID").mockImplementation(
    () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, "0")}` as `${string}-${string}-${string}-${string}-${string}`,
  );
  const log = (level: string) => (...args: unknown[]) => {
    observation.logs.push(`${level} ${args.map((arg) => (typeof arg === "string" ? arg : String(arg))).join(" ")}`);
  };
  vi.spyOn(console, "log").mockImplementation(log("log"));
  vi.spyOn(console, "error").mockImplementation(log("error"));
  vi.spyOn(console, "warn").mockImplementation(log("warn"));
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = await readRequest("fetch", input, init);
    observation.calls.push(call);
    return upstreamResponse("fetch", call);
  });

  const pending: Promise<unknown>[] = [];
  const ctx = {
    waitUntil: (promise: Promise<unknown>) => {
      pending.push(promise);
    },
    passThroughOnException: () => undefined,
  } as unknown as ExecutionContext;

  try {
    const request = new Request(testCase.url, {
      method: testCase.method,
      headers: testCase.headers,
      body: testCase.body,
    });
    const response = await router.fetch(request, buildEnv(observation) as never, ctx);
    observation.status = response.status;
    observation.statusText = response.statusText;
    observation.headers = sortedHeaders(response.headers);
    observation.body = response.body ? await response.text() : "";
    // waitUntil work can enqueue more waitUntil work (recorder → R2 put).
    for (let drained = 0; drained < pending.length; drained++) {
      await Promise.allSettled([pending[drained]]);
    }
  } catch (error) {
    observation.threw = String(error);
  } finally {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  }
  return observation;
}
