import { describe, expect, it } from "vitest";
import { AdapterConfigError, buildAgentCard, configProblems, type AdapterConfig } from "../src/card.ts";
import { config as shippedConfig } from "../src/config.ts";

const config: AdapterConfig = {
  verifiedDomain: "acme.com",
  publicOrigin: "https://agents.acme.com",
  agent: {
    name: "Acme Support",
    description: "Answers questions.",
    version: "1.0.0",
    skills: [{ id: "support", name: "Support", description: "Answers questions.", tags: [] }],
  },
};

describe("buildAgentCard", () => {
  it("declares the JSON-RPC endpoint on the same origin the card is served from", () => {
    const card = buildAgentCard(config);
    expect(card.supportedInterfaces).toEqual([
      { url: "https://agents.acme.com/a2a", protocolBinding: "JSONRPC", protocolVersion: "1.0" },
    ]);
  });

  it("produces the A2A 1.0 fields arelay.to requires", () => {
    const card = buildAgentCard(config);
    expect(card).toMatchObject({
      name: "Acme Support",
      description: "Answers questions.",
      version: "1.0.0",
      capabilities: {},
      defaultInputModes: ["text/plain"],
      defaultOutputModes: ["text/plain"],
    });
    expect(card.skills).toHaveLength(1);
  });

  it("refuses an origin off the verified domain, with the reason", () => {
    const offDomain = { ...config, publicOrigin: "https://acme-agent.workers.dev" };
    expect(() => buildAgentCard(offDomain)).toThrow(AdapterConfigError);
    expect(() => buildAgentCard(offDomain)).toThrow(/not acme\.com or a subdomain/u);
  });

  it("refuses plain HTTP and an origin with a path", () => {
    expect(configProblems({ ...config, publicOrigin: "http://agents.acme.com" })[0]).toMatch(/must use https/u);
    expect(configProblems({ ...config, publicOrigin: "https://agents.acme.com/bot" })[0]).toMatch(/origin only/u);
  });

  it("ships a valid example config", () => {
    expect(configProblems(shippedConfig)).toEqual([]);
  });
});
