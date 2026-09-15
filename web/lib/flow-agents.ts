export const CODING_AGENTS = [
  { id: 'claude', label: 'Claude Code', available: true },
  { id: 'codex', label: 'Codex', available: true },
  { id: 'gemini', label: 'Gemini CLI', available: false },
  { id: 'opencode', label: 'OpenCode', available: true },
  { id: 'cursor', label: 'Cursor', available: true },
  { id: 'copilot', label: 'GitHub Copilot', available: false },
  { id: 'windsurf', label: 'Windsurf', available: false },
  { id: 'aider', label: 'Aider', available: false },
  { id: 'goose', label: 'Goose', available: false },
  { id: 'grok', label: 'Grok', available: false },
  { id: 'pi', label: 'Pi', available: false },
] as const;
export type AgentId = (typeof CODING_AGENTS)[number]['id'];
export type CodingAgent = Extract<(typeof CODING_AGENTS)[number], { available: true }>['id'];
export function isCodingAgent(id: string): id is CodingAgent {
  return CODING_AGENTS.some(agent => agent.id === id && agent.available);
}
