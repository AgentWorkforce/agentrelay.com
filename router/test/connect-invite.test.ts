import { describe, expect, it, vi } from "vitest";

import worker, { getConnectInviteCloudPath } from "../index.js";

type WorkerBinding = { fetch: ReturnType<typeof vi.fn> };

function makeBinding(): WorkerBinding {
  return {
    fetch: vi.fn(async () => new Response("ok", { status: 200 })),
  };
}

function buildEnv(cloudWebWorker?: WorkerBinding) {
  return {
    CLOUD_APP_ORIGIN: "https://origin.test.invalid",
    CLOUD_WEB_WORKER: cloudWebWorker,
  } as unknown as Parameters<typeof worker.fetch>[1];
}

function buildCtx(): ExecutionContext {
  return {
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
  } as unknown as ExecutionContext;
}

describe("router Relay Connect invite links", () => {
  it("maps an apex invite link onto the cloud app's route", () => {
    expect(getConnectInviteCloudPath("agentrelay.com", "/connect/abc123", "GET")).toBe(
      "/cloud/connect/abc123",
    );
    expect(getConnectInviteCloudPath("agentrelay.com", "/connect/abc123.json", "HEAD")).toBe(
      "/cloud/connect/abc123.json",
    );
    expect(getConnectInviteCloudPath("agentrelay.com", "/connect/abc123/", "GET")).toBe(
      "/cloud/connect/abc123",
    );
  });

  it("leaves everything that is not a single-segment apex invite read alone", () => {
    expect(getConnectInviteCloudPath("agentrelay.com", "/connect/install.sh", "GET")).toBeUndefined();
    expect(getConnectInviteCloudPath("agentrelay.com", "/connect/install.sh/", "HEAD")).toBeUndefined();
    expect(getConnectInviteCloudPath("agentrelay.com", "/connect", "GET")).toBeUndefined();
    expect(getConnectInviteCloudPath("agentrelay.com", "/connect/", "GET")).toBeUndefined();
    expect(getConnectInviteCloudPath("agentrelay.com", "/connect/abc/extra", "GET")).toBeUndefined();
    expect(getConnectInviteCloudPath("agentrelay.com", "/connected/abc", "GET")).toBeUndefined();
    expect(getConnectInviteCloudPath("agentrelay.com", "/connect/abc", "POST")).toBeUndefined();
    expect(getConnectInviteCloudPath("example.com", "/connect/abc", "GET")).toBeUndefined();
  });

  it.each(["GET", "HEAD"])("serves a %s invite from the cloud-web worker, keeping the query and headers", async (method) => {
    const cloudWebWorker = makeBinding();

    const response = await worker.fetch(
      new Request("https://agentrelay.com/connect/abc123?format=md", {
        method,
        headers: { accept: "application/json" },
      }),
      buildEnv(cloudWebWorker),
      buildCtx(),
    );

    expect(response.status).toBe(200);
    expect(cloudWebWorker.fetch).toHaveBeenCalledTimes(1);
    const forwarded = cloudWebWorker.fetch.mock.calls[0]?.[0] as Request;
    expect(forwarded.url).toBe("https://agentrelay.com/cloud/connect/abc123?format=md");
    expect(forwarded.method).toBe(method);
    expect(forwarded.headers.get("accept")).toBe("application/json");
  });

  it("does not send /connect itself to the cloud-web worker", async () => {
    const cloudWebWorker = makeBinding();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("marketing", { status: 200 }));

    try {
      await worker.fetch(
        new Request("https://agentrelay.com/connect"),
        buildEnv(cloudWebWorker),
        buildCtx(),
      );

      expect(cloudWebWorker.fetch).not.toHaveBeenCalled();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
