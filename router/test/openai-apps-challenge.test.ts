import { describe, expect, it, vi } from "vitest";

import worker from "../index.js";

const TOKEN = "test-challenge-token-not-real";

function buildEnv(overrides: Record<string, unknown> = {}) {
  return {
    CLOUD_APP_ORIGIN: "https://origin.test.invalid",
    CLOUD_WEB_WORKER: { fetch: vi.fn(async () => new Response("cloud", { status: 200 })) },
    ...overrides,
  } as unknown as Parameters<typeof worker.fetch>[1];
}

const ctx = { waitUntil: () => undefined, passThroughOnException: () => undefined } as unknown as ExecutionContext;

const CHALLENGE_URL = "https://agentrelay.com/.well-known/openai-apps-challenge";

describe("OpenAI apps domain challenge", () => {
  it("returns only the token as text/plain with a 200 when the secret is set", async () => {
    const env = buildEnv({ OPENAI_APPS_CHALLENGE_TOKEN: TOKEN });
    const response = await worker.fetch(new Request(CHALLENGE_URL), env, ctx);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("location")).toBeNull();
    expect(await response.text()).toBe(TOKEN);
    expect((env as unknown as { CLOUD_WEB_WORKER: { fetch: ReturnType<typeof vi.fn> } })
      .CLOUD_WEB_WORKER.fetch).not.toHaveBeenCalled();
  });

  it("trims surrounding whitespace from the secret value", async () => {
    const response = await worker.fetch(
      new Request(CHALLENGE_URL),
      buildEnv({ OPENAI_APPS_CHALLENGE_TOKEN: `  ${TOKEN}\n` }),
      ctx,
    );
    expect(await response.text()).toBe(TOKEN);
  });

  it("answers HEAD with a 200 and no body", async () => {
    const response = await worker.fetch(
      new Request(CHALLENGE_URL, { method: "HEAD" }),
      buildEnv({ OPENAI_APPS_CHALLENGE_TOKEN: TOKEN }),
      ctx,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  it.each([undefined, "", "   "])("returns 404 when the secret is %j", async (value) => {
    const response = await worker.fetch(
      new Request(CHALLENGE_URL),
      buildEnv({ OPENAI_APPS_CHALLENGE_TOKEN: value }),
      ctx,
    );
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(TOKEN);
  });

  it("rejects non-GET methods without leaking the token", async () => {
    const response = await worker.fetch(
      new Request(CHALLENGE_URL, { method: "POST" }),
      buildEnv({ OPENAI_APPS_CHALLENGE_TOKEN: TOKEN }),
      ctx,
    );
    expect(response.status).toBe(405);
    expect(await response.text()).not.toContain(TOKEN);
  });

  it("only answers on the agentrelay.com apex", async () => {
    const upstream = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("upstream", { status: 404 }));
    const response = await worker.fetch(
      new Request("https://arelay.to/.well-known/openai-apps-challenge"),
      buildEnv({ OPENAI_APPS_CHALLENGE_TOKEN: TOKEN }),
      ctx,
    );
    expect(await response.text()).not.toBe(TOKEN);
    upstream.mockRestore();
  });

  it("does not serve the token on neighbouring paths", async () => {
    const upstream = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("upstream", { status: 404 }));
    for (const path of [
      "/.well-known/openai-apps-challenge/",
      "/.well-known/openai-apps-challenge/x",
      "/cloud/.well-known/openai-apps-challenge",
    ]) {
      const response = await worker.fetch(
        new Request(`https://agentrelay.com${path}`),
        buildEnv({ OPENAI_APPS_CHALLENGE_TOKEN: TOKEN }),
        ctx,
      );
      expect(await response.text()).not.toBe(TOKEN);
    }
    upstream.mockRestore();
  });
});
