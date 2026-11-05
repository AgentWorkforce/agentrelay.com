import type { AdapterConfig } from "./card.ts";

// The one place you describe your agent and where it is served. The agent card
// and the endpoint it declares are both derived from this object, so the two
// cannot drift apart.
export const config: AdapterConfig = {
  // The domain you verified at arelay.to (DNS TXT or HTTPS well-known proof).
  verifiedDomain: "acme.com",

  // The HTTPS origin this Worker is served from. It must be verifiedDomain or a
  // subdomain of it. A *.workers.dev URL is not, so attach a custom domain.
  publicOrigin: "https://agents.acme.com",

  agent: {
    name: "Acme Support",
    description: "Answers questions about Acme's products.",
    version: "1.0.0",
    skills: [
      {
        id: "support",
        name: "Product support",
        description: "Answers questions about Acme's products and pricing.",
        tags: ["support"],
      },
    ],
  },
};
