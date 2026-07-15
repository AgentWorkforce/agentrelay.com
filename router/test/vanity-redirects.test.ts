import { describe, expect, it, vi } from "vitest";

import worker, { getVanityRedirect } from "../index.js";

const redirects = [
  ["/meet-with-will", "https://calendar.app.google/RqLuQyT3dYe5e2YdA"],
  ["/meet-with-khaliq", "https://calendly.com/khaliq-agent-relay/30min"],
  ["/virtual-office", "https://meet.google.com/ijx-gpfb-brt"],
] as const;

function buildCtx(): ExecutionContext {
  return {
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
  } as unknown as ExecutionContext;
}

describe("router vanity redirects", () => {
  it.each(redirects)("redirects %s at the edge", async (path, destination) => {
    const cloudWebWorker = { fetch: vi.fn() };
    const response = await worker.fetch(
      new Request(`https://agentrelay.com${path}?utm_source=test`),
      {
        CLOUD_APP_ORIGIN: "https://origin.test.invalid",
        CLOUD_WEB_WORKER: cloudWebWorker,
      },
      buildCtx(),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(destination);
    expect(cloudWebWorker.fetch).not.toHaveBeenCalled();
  });

  it.each(redirects)("accepts a trailing slash for %s", (path, destination) => {
    expect(getVanityRedirect("agentrelay.com", `${path}/`)).toBe(destination);
  });

  it("does not redirect another hostname or a nested path", () => {
    expect(getVanityRedirect("origin-web.agentrelay.com", "/meet-with-will")).toBeUndefined();
    expect(getVanityRedirect("agentrelay.com", "/meet-with-will/details")).toBeUndefined();
  });
});
