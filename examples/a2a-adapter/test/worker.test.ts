import { describe, expect, it } from "vitest";
import worker from "../src/index.ts";
import type { Env } from "../src/types.ts";

const ORIGIN = "https://agents.acme.com";

function sendMessage(text: string, init: { id?: string; headers?: Record<string, string> } = {}): Request {
  return new Request(`${ORIGIN}/a2a`, {
    method: "POST",
    headers: { "content-type": "application/json", ...init.headers },
    // The request arelay.to sends (relay-agent src/a2a.ts, protocol 1.0).
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: init.id ?? "req-1",
      method: "SendMessage",
      params: {
        message: { role: "ROLE_USER", messageId: "m-1", contextId: "ctx-1", parts: [{ text }] },
        configuration: { returnImmediately: true, acceptedOutputModes: ["text/plain"] },
      },
    }),
  });
}

describe("worker", () => {
  it("serves the agent card publicly", async () => {
    const response = await worker.fetch(new Request(`${ORIGIN}/.well-known/agent-card.json`), { A2A_BEARER_TOKEN: "secret-token" });
    expect(response.status).toBe(200);
    const card = (await response.json()) as { supportedInterfaces: Array<{ url: string }> };
    expect(card.supportedInterfaces[0]?.url).toBe(`${ORIGIN}/a2a`);
  });

  it("answers SendMessage with a Message that echoes the request id and context", async () => {
    const response = await worker.fetch(sendMessage("hello", { id: "abc" }), {});
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      jsonrpc: "2.0",
      id: "abc",
      result: { message: { role: "ROLE_AGENT", contextId: "ctx-1", parts: [{ text: "You said: hello" }] } },
    });
  });

  it("requires the bearer token when one is configured", async () => {
    const env: Env = { A2A_BEARER_TOKEN: "secret-token" };
    expect((await worker.fetch(sendMessage("hi"), env)).status).toBe(401);
    expect((await worker.fetch(sendMessage("hi", { headers: { authorization: "Bearer wrong" } }), env)).status).toBe(401);
    expect((await worker.fetch(sendMessage("hi", { headers: { authorization: "Bearer secret-token" } }), env)).status).toBe(200);
  });

  it("returns JSON-RPC errors for bad input", async () => {
    const call = async (body: string) =>
      (await (await worker.fetch(new Request(`${ORIGIN}/a2a`, { method: "POST", body }), {})).json()) as {
        error: { code: number };
      };
    expect((await call("{")).error.code).toBe(-32700);
    expect((await call(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "GetTask" }))).error.code).toBe(-32601);
    expect((await call(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "SendMessage", params: {} }))).error.code).toBe(-32602);
  });

  it("only accepts POST on the endpoint and 404s elsewhere", async () => {
    expect((await worker.fetch(new Request(`${ORIGIN}/a2a`), {})).status).toBe(405);
    expect((await worker.fetch(new Request(`${ORIGIN}/`), {})).status).toBe(404);
  });
});
