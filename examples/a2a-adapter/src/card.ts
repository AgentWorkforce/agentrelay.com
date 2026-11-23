import { a2aUrlProblem } from "./domain.ts";

export const CARD_PATH = "/.well-known/agent-card.json";
export const RPC_PATH = "/a2a";

export type AgentSkill = {
  id: string;
  name: string;
  description: string;
  tags: string[];
};

export type AdapterConfig = {
  verifiedDomain: string;
  publicOrigin: string;
  agent: {
    name: string;
    description: string;
    version: string;
    skills: AgentSkill[];
  };
};

// The subset of an A2A 1.0 agent card this adapter publishes.
export type AgentCard = {
  name: string;
  description: string;
  version: string;
  supportedInterfaces: Array<{ url: string; protocolBinding: "JSONRPC"; protocolVersion: "1.0" }>;
  capabilities: { streaming: false; pushNotifications: false };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: AgentSkill[];
};

export class AdapterConfigError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`a2a-adapter config is invalid:\n- ${problems.join("\n- ")}`);
    this.name = "AdapterConfigError";
    this.problems = problems;
  }
}

export function adapterUrls(config: AdapterConfig): { cardUrl: string; serviceUrl: string } {
  return {
    cardUrl: new URL(CARD_PATH, config.publicOrigin).href,
    serviceUrl: new URL(RPC_PATH, config.publicOrigin).href,
  };
}

/** Every reason arelay.to would reject this config, or an empty list. */
export function configProblems(config: AdapterConfig): string[] {
  const originProblem = a2aUrlProblem("publicOrigin", config.publicOrigin, config.verifiedDomain);
  if (originProblem) return [originProblem];
  const origin = new URL(config.publicOrigin);
  if (origin.pathname !== "/" || origin.search) {
    return [`publicOrigin "${config.publicOrigin}" must be an origin only, like https://agents.${config.verifiedDomain}, with no path or query.`];
  }
  const { cardUrl, serviceUrl } = adapterUrls(config);
  return [
    a2aUrlProblem("Agent card URL", cardUrl, config.verifiedDomain),
    a2aUrlProblem("Declared service endpoint", serviceUrl, config.verifiedDomain),
  ].filter((problem): problem is string => problem !== null);
}

export function buildAgentCard(config: AdapterConfig): AgentCard {
  const problems = configProblems(config);
  if (problems.length > 0) throw new AdapterConfigError(problems);
  return {
    name: config.agent.name,
    description: config.agent.description,
    version: config.agent.version,
    supportedInterfaces: [
      { url: adapterUrls(config).serviceUrl, protocolBinding: "JSONRPC", protocolVersion: "1.0" },
    ],
    capabilities: { streaming: false, pushNotifications: false },
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
    skills: config.agent.skills,
  };
}
