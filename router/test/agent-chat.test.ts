import { afterEach, describe, expect, it, vi } from "vitest";

import worker, { getAgentChatCloudPath, getAgentPagePath, getLegacyAgentPageRedirect, getShortHostRedirect, prefersHtmlOverMarkdown } from "../index.js";

const ID = "0123456789abcdef0123456789abcdef";

function buildEnv(
  cloudWebWorker: { fetch: ReturnType<typeof vi.fn> },
  extra: Record<string, unknown> = {},
) {
  return {
    CLOUD_APP_ORIGIN: "https://origin.test.invalid",
    CLOUD_WEB_WORKER: cloudWebWorker,
    ...extra,
  } as unknown as Parameters<typeof worker.fetch>[1];
}

const ctx = { waitUntil: () => undefined, passThroughOnException: () => undefined } as unknown as ExecutionContext;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("router agent chat", () => {
  it("maps a conversation on either host onto the cloud chat route", () => {
    for (const host of ["arelay.to", "www.arelay.to", "agentrelay.com"]) {
      expect(getAgentChatCloudPath(host, `/agent-relay/${ID}`, "POST")).toBe(`/cloud/api/v1/agent-chat/agent-relay/${ID}`);
    }
  });

  it("only claims POSTs", () => {
    for (const method of ["GET", "HEAD", "OPTIONS", "DELETE"]) {
      expect(getAgentChatCloudPath("arelay.to", `/agent-relay/${ID}`, method)).toBeUndefined();
    }
  });

  it("sends a www.arelay.to chat POST to cloud instead of redirecting it", async () => {
    const cloud = { fetch: vi.fn(async (_request: Request) => new Response("agent-relay: hi", { status: 200 })) };
    const response = await worker.fetch(
      new Request(`https://www.arelay.to/agent-relay/${ID}`, { method: "POST", body: "hello" }),
      buildEnv(cloud),
      ctx,
    );
    expect(response.status).toBe(200);
    expect(new URL(cloud.fetch.mock.calls[0][0].url).pathname).toBe(`/cloud/api/v1/agent-chat/agent-relay/${ID}`);
  });

  it("leaves the page, the bridge script, unknown agents and other hosts alone", () => {
    expect(getAgentChatCloudPath("arelay.to", "/agent-relay", "POST")).toBeUndefined();
    expect(getAgentChatCloudPath("arelay.to", "/agent-relay/bridge.sh", "POST")).toBeUndefined();
    expect(getAgentChatCloudPath("arelay.to", `/someone-else/${ID}`, "POST")).toBeUndefined();
    expect(getAgentChatCloudPath("arelay.to", `/agent-relay/${ID.toUpperCase()}`, "POST")).toBeUndefined();
    expect(getAgentChatCloudPath("example.com", `/agent-relay/${ID}`, "POST")).toBeUndefined();
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

  it("routes directly to the relay-agent service binding when configured", async () => {
    const cloud = { fetch: vi.fn(async () => new Response("wrong upstream")) };
    const relayAgent = {
      fetch: vi.fn(async (_request: Request) => new Response("agent-relay: direct\n")),
    };
    const response = await worker.fetch(
      new Request(`https://agentrelay.com/agent-relay/${ID}?source=test`, {
        method: "POST",
        body: "hello binding",
        headers: { "Idempotency-Key": "router-test" },
      }),
      buildEnv(cloud, { RELAY_AGENT_WORKER: relayAgent }),
      ctx,
    );

    expect(await response.text()).toBe("agent-relay: direct\n");
    expect(cloud.fetch).not.toHaveBeenCalled();
    expect(relayAgent.fetch).toHaveBeenCalledOnce();
    const forwarded = relayAgent.fetch.mock.calls[0][0];
    expect(new URL(forwarded.url).pathname).toBe(`/agent-relay/${ID}`);
    expect(new URL(forwarded.url).search).toBe("?source=test");
    expect(forwarded.headers.get("idempotency-key")).toBe("router-test");
    expect(await forwarded.text()).toBe("hello binding");
  });

  it("routes directly to RELAY_AGENT_ORIGIN when configured", async () => {
    const cloud = { fetch: vi.fn(async () => new Response("wrong upstream")) };
    const upstreamFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("agent-relay: origin\n"),
    );
    const response = await worker.fetch(
      new Request(`https://www.arelay.to/agent-relay/${ID}`, {
        method: "POST",
        body: "hello origin",
      }),
      buildEnv(cloud, { RELAY_AGENT_ORIGIN: "https://relay-agent.example.test" }),
      ctx,
    );

    expect(await response.text()).toBe("agent-relay: origin\n");
    expect(cloud.fetch).not.toHaveBeenCalled();
    const forwarded = upstreamFetch.mock.calls[0][0] as Request;
    expect(forwarded.url).toBe(`https://relay-agent.example.test/agent-relay/${ID}`);
    expect(forwarded.redirect).toBe("manual");
    expect(await forwarded.text()).toBe("hello origin");
  });

  it("keeps the Cloud path unchanged when the relay-agent flag is absent", async () => {
    const cloud = { fetch: vi.fn(async (_request: Request) => new Response("cloud stub")) };
    const response = await worker.fetch(
      new Request(`https://arelay.to/agent-relay/${ID}`, { method: "POST", body: "hello" }),
      buildEnv(cloud),
      ctx,
    );

    expect(await response.text()).toBe("cloud stub");
    expect(new URL(cloud.fetch.mock.calls[0][0].url).pathname)
      .toBe(`/cloud/api/v1/agent-chat/agent-relay/${ID}`);
  });

  it("fails fast and logs a distinct error for an invalid relay-agent origin", async () => {
    const cloud = { fetch: vi.fn(async () => new Response("wrong upstream")) };
    const upstreamFetch = vi.spyOn(globalThis, "fetch");
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await worker.fetch(
      new Request(`https://arelay.to/agent-relay/${ID}`, { method: "POST", body: "hello" }),
      buildEnv(cloud, { RELAY_AGENT_ORIGIN: "relay-agent.example.test/not-an-origin" }),
      ctx,
    );

    expect(response.status).toBe(503);
    expect(upstreamFetch).not.toHaveBeenCalled();
    expect(cloud.fetch).not.toHaveBeenCalled();
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("relay_agent_origin_invalid"));
  });

  it("fails closed with a plain-text 503 when the configured upstream fails", async () => {
    const cloud = { fetch: vi.fn(async () => new Response("wrong upstream")) };
    const relayAgent = { fetch: vi.fn(async () => { throw new Error("down"); }) };
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await worker.fetch(
      new Request(`https://arelay.to/agent-relay/${ID}`, { method: "POST", body: "hello" }),
      buildEnv(cloud, { RELAY_AGENT_WORKER: relayAgent }),
      ctx,
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toContain("Retry the same command shortly");
    expect(cloud.fetch).not.toHaveBeenCalled();
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("relay_agent_upstream_failed"));
  });

  it("sends the short host's root, www and cloud app to agentrelay.com", () => {
    expect(getShortHostRedirect(new URL("https://arelay.to/"))).toBe("https://agentrelay.com/");
    expect(getShortHostRedirect(new URL("https://arelay.to/cloud/teams?x=1"))).toBe("https://agentrelay.com/cloud/teams?x=1");
    expect(getShortHostRedirect(new URL("https://www.arelay.to/agent-relay"))).toBe("https://arelay.to/agent-relay");
    expect(getShortHostRedirect(new URL("https://arelay.to/agent-relay"))).toBeUndefined();
    expect(getShortHostRedirect(new URL("https://agentrelay.com/"))).toBeUndefined();
  });

  it("serves agent pages at the arelay.to root and under /u on agentrelay.com", () => {
    const browser = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    expect(getAgentPagePath("arelay.to", "/agent-relay", "GET", browser)).toBe("/u/agent-relay");
    expect(getAgentPagePath("agentrelay.com", "/u/agent-relay", "GET", browser)).toBe("/u/agent-relay");
    for (const accept of ["*/*", null, "text/markdown", "text/markdown, text/html;q=0.9, */*;q=0.8", "text/plain"]) {
      expect(getAgentPagePath("arelay.to", "/agent-relay", "GET", accept)).toBe("/u/agent-relay/agent.md");
      expect(getAgentPagePath("agentrelay.com", "/u/agent-relay/", "GET", accept)).toBe("/u/agent-relay/agent.md");
    }
  });

  it("answers HEAD with the page, so probes keep text/html and mint no guide", () => {
    for (const accept of ["*/*", null, "text/markdown"]) {
      expect(getAgentPagePath("arelay.to", "/agent-relay", "HEAD", accept)).toBe("/u/agent-relay");
      expect(getAgentPagePath("agentrelay.com", "/u/agent-relay/", "HEAD", accept)).toBe("/u/agent-relay");
    }
  });

  it("serves agents the guide on the www alias and leaves browsers to the canonical redirect", () => {
    expect(getAgentPagePath("www.arelay.to", "/agent-relay", "GET", "*/*")).toBe("/u/agent-relay/agent.md");
    expect(getAgentPagePath("www.arelay.to", "/agent-relay", "GET", "text/html")).toBeUndefined();
  });

  it("weighs Accept quality values when choosing HTML or markdown", () => {
    expect(prefersHtmlOverMarkdown("text/html;q=0.9, text/markdown;q=0.1")).toBe(true);
    expect(prefersHtmlOverMarkdown("text/html, text/markdown;q=0")).toBe(true);
    expect(prefersHtmlOverMarkdown("text/html;q=0, */*")).toBe(false);
    expect(prefersHtmlOverMarkdown("text/html;q=0.5, text/*;q=0.8")).toBe(false);
    expect(prefersHtmlOverMarkdown("text/markdown;q=0.5, text/html")).toBe(true);
    expect(prefersHtmlOverMarkdown("*/*")).toBe(false);
    expect(prefersHtmlOverMarkdown(null)).toBe(false);
    expect(prefersHtmlOverMarkdown("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")).toBe(true);
  });

  it("forwards agent fetches to the guide and browsers to the page, and records neither", async () => {
    const upstream = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("ok", { status: 200 }));
    const put = vi.fn();
    const env = buildEnv({ fetch: vi.fn() }, {
      TRAFFIC_RECORDER: { put },
      ROUTER_CONFIG: { get: vi.fn(async () => "100") },
    });
    const waits: Promise<unknown>[] = [];
    const recordingCtx = { waitUntil: (p: Promise<unknown>) => waits.push(p), passThroughOnException: () => undefined } as unknown as ExecutionContext;

    await worker.fetch(new Request("https://arelay.to/agent-relay", { headers: { accept: "*/*" } }), env, recordingCtx);
    await worker.fetch(new Request("https://www.arelay.to/agent-relay", { headers: { accept: "text/markdown" } }), env, recordingCtx);
    await worker.fetch(new Request("https://arelay.to/agent-relay", { headers: { accept: "text/html,*/*;q=0.8" } }), env, recordingCtx);
    await worker.fetch(new Request("https://agentrelay.com/u/agent-relay/agent.md"), env, recordingCtx);
    await worker.fetch(new Request("https://arelay.to/u/agent-relay/agent.md"), env, recordingCtx);
    await Promise.all(waits);

    const paths = upstream.mock.calls.map(([input]) => new URL((input as Request).url).pathname);
    expect(paths).toEqual(["/u/agent-relay/agent.md", "/u/agent-relay/agent.md", "/u/agent-relay", "/u/agent-relay/agent.md", "/u/agent-relay/agent.md"]);
    expect(put).not.toHaveBeenCalled();
  });

  it("leaves other paths, unknown agents, POSTs and other hosts alone", () => {
    expect(getAgentPagePath("arelay.to", "/agent-relay/bridge.sh", "GET", "*/*")).toBeUndefined();
    expect(getAgentPagePath("arelay.to", "/someone-else", "GET", "*/*")).toBeUndefined();
    expect(getAgentPagePath("arelay.to", "/agent-relay", "POST", "*/*")).toBeUndefined();
    expect(getAgentPagePath("agentrelay.com", "/agent-relay", "GET", "*/*")).toBeUndefined();
    expect(getAgentPagePath("example.com", "/u/agent-relay", "GET", "*/*")).toBeUndefined();
  });

  it("permanently redirects the original agentrelay.com/agent-relay link to /u/agent-relay", async () => {
    expect(getLegacyAgentPageRedirect(new URL("https://agentrelay.com/agent-relay?x=1"))).toBe("https://agentrelay.com/u/agent-relay?x=1");
    expect(getLegacyAgentPageRedirect(new URL("https://agentrelay.com/agent-relay/bridge.sh"))).toBeUndefined();
    expect(getLegacyAgentPageRedirect(new URL("https://arelay.to/agent-relay"))).toBeUndefined();
    const response = await worker.fetch(new Request("https://agentrelay.com/agent-relay"), buildEnv({ fetch: vi.fn() }), ctx);
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://agentrelay.com/u/agent-relay");
  });
});
