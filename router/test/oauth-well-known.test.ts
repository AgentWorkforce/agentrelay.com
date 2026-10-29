import { describe, expect, it, vi } from "vitest";

import worker, { rewriteCloudMcpPath, rewriteCloudOAuthWellKnownPath } from "../index.js";

function buildEnv(cloudWebWorker: { fetch: ReturnType<typeof vi.fn> }) {
  return {
    CLOUD_APP_ORIGIN: "https://origin.test.invalid",
    CLOUD_WEB_WORKER: cloudWebWorker,
  } as unknown as Parameters<typeof worker.fetch>[1];
}

const ctx = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
} as unknown as ExecutionContext;

describe("cloud OAuth well-known rewrites", () => {
  it("maps canonical discovery paths for the /cloud issuer onto cloud-web", () => {
    expect(rewriteCloudOAuthWellKnownPath("/.well-known/oauth-authorization-server/cloud"))
      .toBe("/cloud/.well-known/oauth-authorization-server");
    expect(rewriteCloudOAuthWellKnownPath("/.well-known/openid-configuration/cloud"))
      .toBe("/cloud/.well-known/openid-configuration");
    expect(rewriteCloudOAuthWellKnownPath("/.well-known/oauth-protected-resource/cloud/api/v1/mcp/relay-events"))
      .toBe("/cloud/.well-known/oauth-protected-resource/cloud/api/v1/mcp/relay-events");
  });

  it("maps the root /mcp discovery documents onto cloud-web", () => {
    expect(rewriteCloudOAuthWellKnownPath("/.well-known/oauth-protected-resource/mcp"))
      .toBe("/cloud/.well-known/oauth-protected-resource/mcp");
    // Fallbacks for clients that skip RFC 8414 / RFC 9728 path insertion.
    expect(rewriteCloudOAuthWellKnownPath("/.well-known/oauth-protected-resource"))
      .toBe("/cloud/.well-known/oauth-protected-resource/mcp");
    expect(rewriteCloudOAuthWellKnownPath("/.well-known/oauth-authorization-server"))
      .toBe("/cloud/.well-known/oauth-authorization-server");
  });

  it("maps the root /mcp endpoint, with or without a trailing slash", () => {
    expect(rewriteCloudMcpPath("/mcp")).toBe("/cloud/mcp");
    expect(rewriteCloudMcpPath("/mcp/")).toBe("/cloud/mcp");
    for (const path of ["/mcp/x", "/mcpx", "/cloud/mcp", "/"]) {
      expect(rewriteCloudMcpPath(path)).toBeNull();
    }
  });

  it("leaves every other path alone", () => {
    for (const path of [
      "/.well-known/oauth-authorization-server/other",
      "/.well-known/oauth-protected-resource/mcp/x",
      "/.well-known/oauth-protected-resource/cloudy/x",
      "/cloud/.well-known/openid-configuration",
      "/mcp",
      "/docs",
    ]) {
      expect(rewriteCloudOAuthWellKnownPath(path)).toBeNull();
    }
  });

  it("forwards canonical discovery to cloud-web with the rewritten path", async () => {
    const cloudWebWorker = {
      fetch: vi.fn(async (_request: Request) => new Response("{}", { status: 200 })),
    };

    const response = await worker.fetch(
      new Request("https://agentrelay.com/.well-known/oauth-authorization-server/cloud?client=grok"),
      buildEnv(cloudWebWorker),
      ctx,
    );

    expect(response.status).toBe(200);
    expect(cloudWebWorker.fetch).toHaveBeenCalledOnce();
    const forwarded = cloudWebWorker.fetch.mock.calls[0]?.[0] as Request;
    expect(forwarded.url).toBe(
      "https://agentrelay.com/cloud/.well-known/oauth-authorization-server?client=grok",
    );
  });

  it.each([
    "/.well-known/oauth-protected-resource/mcp",
    "/.well-known/oauth-protected-resource",
  ])("forwards %s to the /mcp protected-resource document", async (path) => {
    const cloudWebWorker = {
      fetch: vi.fn(async (_request: Request) => new Response("{}", { status: 200 })),
    };

    const response = await worker.fetch(
      new Request(`https://agentrelay.com${path}`),
      buildEnv(cloudWebWorker),
      ctx,
    );

    expect(response.status).toBe(200);
    const forwarded = cloudWebWorker.fetch.mock.calls[0]?.[0] as Request;
    expect(forwarded.url).toBe("https://agentrelay.com/cloud/.well-known/oauth-protected-resource/mcp");
  });

  it.each(["/mcp", "/mcp/"])("forwards a %s POST to cloud-web with its body and headers", async (path) => {
    const cloudWebWorker = {
      fetch: vi.fn(async (_request: Request) => new Response("{}", { status: 401 })),
    };

    const response = await worker.fetch(
      new Request(`https://agentrelay.com${path}`, {
        method: "POST",
        headers: { authorization: "Bearer cld_at_x", "content-type": "application/json" },
        body: '{"jsonrpc":"2.0","id":1,"method":"initialize"}',
      }),
      buildEnv(cloudWebWorker),
      ctx,
    );

    expect(response.status).toBe(401);
    expect(cloudWebWorker.fetch).toHaveBeenCalledOnce();
    const forwarded = cloudWebWorker.fetch.mock.calls[0]?.[0] as Request;
    expect(forwarded.url).toBe("https://agentrelay.com/cloud/mcp");
    expect(forwarded.method).toBe("POST");
    expect(forwarded.headers.get("authorization")).toBe("Bearer cld_at_x");
    expect(await forwarded.text()).toBe('{"jsonrpc":"2.0","id":1,"method":"initialize"}');
  });

  it("does not rewrite discovery documents for non-GET methods", async () => {
    const cloudWebWorker = {
      fetch: vi.fn(async (_request: Request) => new Response("{}", { status: 200 })),
    };

    const upstreamFetch = vi.fn(async (_request: Request) => new Response("Not Found", { status: 404 }));
    vi.stubGlobal("fetch", upstreamFetch);
    try {
      await worker.fetch(
        new Request("https://agentrelay.com/.well-known/oauth-authorization-server", { method: "POST" }),
        buildEnv(cloudWebWorker),
        ctx,
      );
    } finally {
      vi.unstubAllGlobals();
    }

    const forwardedUrls = [...cloudWebWorker.fetch.mock.calls, ...upstreamFetch.mock.calls]
      .map(([request]) => new URL((request as Request).url).pathname);
    expect(forwardedUrls).not.toContain("/cloud/.well-known/oauth-authorization-server");
  });
});
