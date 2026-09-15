import { isCodingAgent, type CodingAgent } from './flow-agents';
import type { WorkflowId, WorkflowStep } from './flow-workflows';

export const AGENT_ROLES = ['planner', 'plan-reviewer', 'prototype-1', 'prototype-2', 'prototype-3', 'comparator', 'implementer', 'adversary', 'fixer'] as const;
export type AgentRole = typeof AGENT_ROLES[number];
export type AgentSettings = { agent?: CodingAgent; model?: string; prompt?: string };
export type FlowAgentSettings = Partial<Record<`${WorkflowId}:${AgentRole}`, AgentSettings>>;

export function rolesForStep(step: WorkflowStep): AgentRole[] {
  if (step === '3 implementations') return ['prototype-1', 'prototype-2', 'prototype-3'];
  if (step === '2× adversarial review') return ['adversary', 'fixer'];
  return ({ Plan: ['planner'], 'Review plan': ['plan-reviewer'], Compare: ['comparator'], Implement: ['implementer'], Build: ['implementer'], Review: ['adversary'] } as Partial<Record<WorkflowStep, AgentRole[]>>)[step] ?? [];
}

export function defaultAgentPrompt(workflow: WorkflowId, role: AgentRole): string {
  if (role.startsWith('prototype-')) return 'Implement independently using the assigned approach. Work only in this worktree. Add and run tests. Commit your implementation and write prototype-notes.md with results and tradeoffs. Do not open a PR.';
  switch (role) {
    case 'planner': return 'Read the repository and write plan.md. Do not implement yet.';
    case 'plan-reviewer': return 'Review plan.md against the ticket and repository. Challenge assumptions, address gaps, and write reviewed-plan.md. Do not implement yet.';
    case 'comparator': return 'Compare the implementations and test results in the provided worktrees. Read their code and prototype-notes.md. Write comparison.md with each prototype path, strengths, weaknesses, and which ideas to combine. Do not modify the prototypes or implement yet.';
    case 'implementer': return (workflow === 'traditional' ? 'Follow reviewed-plan.md. ' : workflow === 'prototype' ? 'Read comparison.md and inspect the prototype implementations it references. Combine the strongest ideas into the final implementation on the current branch, not in the prototype worktrees. ' : '') + 'Implement on the current branch. Add regression tests. Commit changes. Write a PR summary to summary.md.';
    case 'adversary': return 'Review the PR diff, tests, and all PR comments. ' + (workflow === 'prototype' ? 'Read comparison.md to check that the final implementation combines the strongest ideas. ' : '') + 'Find bugs and edge cases. Write review.md. Create review.clean only if no issues remain.';
    case 'fixer': return 'Read review.md and gh pr view --comments. Address every issue. Commit fixes without pushing. The workflow runs tests and pushes only after they pass.';
    default: return '';
  }
}

export function resolveAgentSettings(workflow: WorkflowId, role: AgentRole, selected: readonly string[], settings: FlowAgentSettings = {}) {
  const available = [...new Set(selected.filter(isCodingAgent))];
  const builder = available[0] ?? 'claude';
  const reviewer = available.find(id => id !== builder) ?? builder;
  const defaultAgent = ['plan-reviewer', 'comparator', 'adversary', 'prototype-2'].includes(role) ? reviewer : builder;
  const saved = settings[`${workflow}:${role}`];
  // Changing the selected agents must never leave an unavailable CLI assigned.
  const agent = saved?.agent && available.includes(saved.agent) ? saved.agent : defaultAgent;
  const compatible = !saved?.agent || saved.agent === agent;
  return { agent, model: compatible ? saved?.model?.trim() || '' : '', prompt: saved?.prompt ?? defaultAgentPrompt(workflow, role) };
}

export function validFlowAgentSettings(value: unknown): value is FlowAgentSettings {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([key, settings]) => {
    const [workflow, role, extra] = key.split(':');
    if (extra || !['traditional', 'prototype', 'simple'].includes(workflow) || !(AGENT_ROLES as readonly string[]).includes(role)) return false;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return false;
    return Object.entries(settings).every(([field, v]) => field === 'agent' ? typeof v === 'string' && isCodingAgent(v)
      : field === 'model' ? typeof v === 'string' && v.length <= 120 && !/[\r\n\0]/.test(v)
      : field === 'prompt' ? typeof v === 'string' && v.trim().length > 0 && v.length <= 6000 : false);
  });
}
