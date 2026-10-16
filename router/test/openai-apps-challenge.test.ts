import { afterEach, describe, expect, it, vi } from "vitest";

import worker from "../index.js";

// OpenAI verifies the ChatGPT app's domain by fetching this path on the MCP
// host's parent domain and comparing the bare token (app submission).
const PATH = "/.well-known/openai-apps-challenge";

function buildEnv(token?: string) {
  return {
    CLOUD_APP_ORIGIN: "https://origin.test.invalid",
    ...(token === undefined ? {} : { OPENAI_APPS_CHALLENGE_TOKEN: token }),
  } as unknown as Parameters<typeof worker.fetch>[1];
}

const ctx = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
} as unknown as ExecutionContext;

afterEach(() => vi.restoreAllMocks());

describe("OpenAI apps domain challenge", () => {
  it("serves the configured token as bare text on the apex", async () => {
    const response = await worker.fetch(new Request(`https://agentrelay.com${PATH}`), buildEnv(" tok_123abc \n"), ctx);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("tok_123abc");
  });

  it("answers HEAD without a body", async () => {
    const response = await worker.fetch(new Request(`https://agentrelay.com${PATH}`, { method: "HEAD" }), buildEnv("tok_123abc"), ctx);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  it("leaves the path to the site when no token is configured, other hosts and other methods", async () => {
    const upstream = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("site", { status: 404 }));
    for (const [url, init, env] of [
      [`https://agentrelay.com${PATH}`, undefined, buildEnv()],
      [`https://agentrelay.com${PATH}`, undefined, buildEnv("   ")],
      [`https://www.agentrelay.com${PATH}`, undefined, buildEnv("tok_123abc")],
      [`https://agentrelay.com${PATH}`, { method: "POST" }, buildEnv("tok_123abc")],
      [`https://agentrelay.com${PATH}/x`, undefined, buildEnv("tok_123abc")],
    ] as const) {
      const response = await worker.fetch(new Request(url, init), env, ctx);
      expect(await response.text(), url).not.toBe("tok_123abc");
    }
    expect(upstream).toHaveBeenCalled();
  });
});
