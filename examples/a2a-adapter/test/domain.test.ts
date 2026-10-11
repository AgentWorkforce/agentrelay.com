import { describe, expect, it } from "vitest";
import { a2aUrlProblem, hostBelongsToDomain } from "../src/domain.ts";

describe("hostBelongsToDomain", () => {
  it("accepts the domain itself and any subdomain", () => {
    expect(hostBelongsToDomain("acme.com", "acme.com")).toBe(true);
    expect(hostBelongsToDomain("agents.acme.com", "acme.com")).toBe(true);
    expect(hostBelongsToDomain("a.b.acme.com", "acme.com")).toBe(true);
  });

  it("ignores case and a trailing dot", () => {
    expect(hostBelongsToDomain("Agents.ACME.com.", "acme.com")).toBe(true);
    expect(hostBelongsToDomain("agents.acme.com", "ACME.COM.")).toBe(true);
  });

  it("rejects look-alike hosts", () => {
    expect(hostBelongsToDomain("evilacme.com", "acme.com")).toBe(false);
    expect(hostBelongsToDomain("acme.com.evil.com", "acme.com")).toBe(false);
    expect(hostBelongsToDomain("acme-agent.workers.dev", "acme.com")).toBe(false);
  });
});

describe("a2aUrlProblem", () => {
  it("accepts HTTPS URLs on the verified domain", () => {
    expect(a2aUrlProblem("Card", "https://agents.acme.com/.well-known/agent-card.json", "acme.com")).toBeNull();
    expect(a2aUrlProblem("Card", "https://acme.com/a2a", "acme.com")).toBeNull();
  });

  it("rejects plain HTTP", () => {
    expect(a2aUrlProblem("Card", "http://agents.acme.com/a2a", "acme.com")).toMatch(/must use https/u);
  });

  it("rejects another domain and names the domain to use", () => {
    const problem = a2aUrlProblem("Card", "https://acme-agent.workers.dev/a2a", "acme.com");
    expect(problem).toMatch(/"acme-agent\.workers\.dev" is not acme\.com or a subdomain/u);
    expect(problem).toMatch(/https:\/\/agents\.acme\.com/u);
  });

  it("rejects credentials, fragments and unparseable URLs", () => {
    expect(a2aUrlProblem("Card", "https://user:pass@agents.acme.com/a2a", "acme.com")).toMatch(/username or password/u);
    expect(a2aUrlProblem("Card", "https://agents.acme.com/a2a#x", "acme.com")).toMatch(/fragment/u);
    expect(a2aUrlProblem("Card", "not a url", "acme.com")).toMatch(/not a valid URL/u);
  });
});
