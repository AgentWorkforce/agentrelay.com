import { describe, expect, it, vi } from "vitest";

import worker, { rewriteCloudOAuthWellKnownPath } from "../index.js";

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

  it("leaves every other path alone", () => {
    for (const path of [
      "/.well-known/oauth-authorization-server",
      "/.well-known/oauth-authorization-server/other",
      "/.well-known/oauth-protected-resource",
      "/.well-known/oauth-protected-resource/cloudy/x",
      "/cloud/.well-known/openid-configuration",
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
});
