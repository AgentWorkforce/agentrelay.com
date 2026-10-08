import { describe, expect, it } from "vitest";

import { getAgentDirectoryPath, getAgentPagePath, getShortHostRedirect } from "../index.js";

const browser = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

describe("agent directory routing", () => {
  it("serves arelay.to/agents and agentrelay.com/directory by Accept", () => {
    for (const [host, path] of [["arelay.to", "/agents"], ["arelay.to", "/agents/"], ["agentrelay.com", "/directory"], ["agentrelay.com", "/directory/"]]) {
      expect(getAgentDirectoryPath(host, path, "GET", browser)).toBe("/directory");
      expect(getAgentDirectoryPath(host, path, "HEAD", "*/*")).toBe("/directory");
      for (const accept of ["*/*", null, "text/markdown", "text/plain"]) {
        expect(getAgentDirectoryPath(host, path, "GET", accept)).toBe("/directory.md");
      }
    }
  });

  it("leaves the agentrelay.com gallery and other paths alone", () => {
    expect(getAgentDirectoryPath("agentrelay.com", "/agents", "GET", browser)).toBeUndefined();
    expect(getAgentDirectoryPath("agentrelay.com", "/agents", "GET", "*/*")).toBeUndefined();
    expect(getAgentDirectoryPath("agentrelay.com", "/agents/use-cases", "GET", browser)).toBeUndefined();
    expect(getAgentDirectoryPath("arelay.to", "/agents/register", "GET", browser)).toBeUndefined();
    expect(getAgentDirectoryPath("arelay.to", "/directory", "GET", browser)).toBeUndefined();
    expect(getAgentDirectoryPath("arelay.to", "/agents", "POST", browser)).toBeUndefined();
  });

  it("gives agents the markdown on www.arelay.to and redirects browsers to the canonical host", () => {
    expect(getAgentDirectoryPath("www.arelay.to", "/agents", "GET", "*/*")).toBe("/directory.md");
    expect(getAgentDirectoryPath("www.arelay.to", "/agents", "GET", browser)).toBeUndefined();
    expect(getShortHostRedirect(new URL("https://www.arelay.to/agents"))).toBe("https://arelay.to/agents");
  });

  it("never treats agents or directory as a registered agent profile", () => {
    for (const handle of ["agents", "directory"]) {
      expect(getAgentPagePath("arelay.to", `/${handle}`, "GET", browser)).toBeUndefined();
      expect(getAgentPagePath("arelay.to", `/${handle}`, "GET", "*/*")).toBeUndefined();
      expect(getAgentPagePath("agentrelay.com", `/u/${handle}`, "GET", browser)).toBeUndefined();
    }
  });
});
