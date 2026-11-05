export type Env = {
  // Optional. When set, every A2A request must carry `Authorization: Bearer <value>`.
  // Give arelay.to the same value as `bearerToken` when you register.
  A2A_BEARER_TOKEN?: string;
  // Used by the example adapters in src/adapters/. Delete what you don't use.
  UPSTREAM_URL?: string;
  UPSTREAM_TOKEN?: string;
  ANTHROPIC_API_KEY?: string;
};

export type AnswerContext = {
  // Stable for one visitor conversation. Use it to keep per-conversation state.
  contextId: string;
  messageId: string;
  env: Env;
};
