import { describe, expect, it, vi } from "vitest";

import worker, { getAgentChatCloudPath, getShortHostRedirect } from "../index.js";

const ID = "0123456789abcdef0123456789abcdef";

function buildEnv(cloudWebWorker: { fetch: ReturnType<typeof vi.fn> }) {
  return {
    CLOUD_APP_ORIGIN: "https://origin.test.invalid",
    CLOUD_WEB_WORKER: cloudWebWorker,
  } as unknown as Parameters<typeof worker.fetch>[1];
}

const ctx = { waitUntil: () => undefined, passThroughOnException: () => undefined } as unknown as ExecutionContext;

describe("router agent chat", () => {
  it("maps a conversation on either host onto the cloud chat route", () => {
    for (const host of ["arelay.to", "agentrelay.com"]) {
      expect(getAgentChatCloudPath(host, `/agent-relay/${ID}`)).toBe(`/cloud/api/v1/agent-chat/agent-relay/${ID}`);
    }
  });

  it("leaves the page, the bridge script, unknown agents and other hosts alone", () => {
    expect(getAgentChatCloudPath("arelay.to", "/agent-relay")).toBeUndefined();
    expect(getAgentChatCloudPath("arelay.to", "/agent-relay/bridge.sh")).toBeUndefined();
    expect(getAgentChatCloudPath("arelay.to", `/someone-else/${ID}`)).toBeUndefined();
    expect(getAgentChatCloudPath("arelay.to", `/agent-relay/${ID.toUpperCase()}`)).toBeUndefined();
    expect(getAgentChatCloudPath("example.com", `/agent-relay/${ID}`)).toBeUndefined();
  });

  it("forwards a conversation POST, body intact, to the cloud worker", async () => {
    const cloud = { fetch: vi.fn(async (_request: Request) => new Response("agent-relay: hi", { status: 200 })) };
    const response = await worker.fetch(
      new Request(`https://arelay.to/agent-relay/${ID}`, { method: "POST", body: "hello" }),
      buildEnv(cloud),
      ctx,
    );
    expect(await response.text()).toBe("agent-relay: hi");
    const forwarded = cloud.fetch.mock.calls[0][0];
    expect(new URL(forwarded.url).pathname).toBe(`/cloud/api/v1/agent-chat/agent-relay/${ID}`);
    expect(forwarded.method).toBe("POST");
    expect(await forwarded.text()).toBe("hello");
  });

  it("sends the short host's root, www and cloud app to agentrelay.com", () => {
    expect(getShortHostRedirect(new URL("https://arelay.to/"))).toBe("https://agentrelay.com/");
    expect(getShortHostRedirect(new URL("https://arelay.to/cloud/teams?x=1"))).toBe("https://agentrelay.com/cloud/teams?x=1");
    expect(getShortHostRedirect(new URL("https://www.arelay.to/agent-relay"))).toBe("https://arelay.to/agent-relay");
    expect(getShortHostRedirect(new URL("https://arelay.to/agent-relay"))).toBeUndefined();
    expect(getShortHostRedirect(new URL("https://agentrelay.com/"))).toBeUndefined();
  });
});
