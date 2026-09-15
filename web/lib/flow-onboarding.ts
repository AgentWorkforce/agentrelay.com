import { validFlowAgentSettings, type FlowAgentSettings } from './flow-agent-settings';
import { WORKFLOWS, workflowCode, workflowAgents, type WorkflowId } from './flow-workflows';
import { ISSUE_SOURCES, issueSourceCode, validSourcePreferences, type IssueSourceId, type SourcePreferences } from './flow-sources';

import { CODING_AGENTS, isCodingAgent, type AgentId, type CodingAgent } from './flow-agents';
export { CODING_AGENTS, isCodingAgent, type AgentId, type CodingAgent } from './flow-agents';

export type FactoryDraft = {
  version: 4;
  sources: IssueSourceId[];
  sourceSettings: SourcePreferences;
  agents: AgentId[];
  otherAgent: string;
  agentSettings?: FlowAgentSettings;
  otherAgentSelected?: boolean;
  task: string;
  workflow: WorkflowId | null;
  step: number;
};
export const LEGACY_FACTORY_DRAFT_KEY = 'agentrelay:software-factory:v2';
export const PREVIOUS_FACTORY_DRAFT_KEY = 'agentrelay:software-factory:v3';
export const FACTORY_DRAFT_KEY = 'agentrelay:software-factory:v4';
export const DEFAULT_FACTORY: FactoryDraft = { version: 4, sources: [], sourceSettings: {}, agents: [], otherAgent: '', task: '', workflow: null, step: 0 };
export const agentLabel = (id: AgentId) => CODING_AGENTS.find(agent => agent.id === id)!.label;
export function primaryAgent(draft: FactoryDraft): CodingAgent {
  return workflowAgents(draft.agents).builder;
}
export function otherAgentIsSelected(draft: FactoryDraft): boolean {
  return draft.otherAgentSelected ?? Boolean(draft.otherAgent?.trim());
}
export function canContinue(draft: FactoryDraft, step = draft.step): boolean {
  return [draft.sources.length > 0, draft.agents.length > 0 || (otherAgentIsSelected(draft) && Boolean(draft.otherAgent?.trim())), WORKFLOWS.some(workflow => workflow.id === draft.workflow)][step] ?? true;
}

export const ONBOARDING_STAGES = ['sources', 'agents', 'task', 'connections'] as const;
export function onboardingPath(step: number): string {
  return step < 0 ? '/flows/onboarding' : `/flows/onboarding/${ONBOARDING_STAGES[step]}`;
}
export function accessibleOnboardingStep(draft: FactoryDraft, requestedStep: number): number {
  for (let step = 0; step < requestedStep; step++) {
    if (!canContinue(draft, step)) return step;
  }
  return requestedStep;
}
export function readFactoryDraft(raw: string | null): FactoryDraft | null {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!validFlowAgentSettings(value?.agentSettings) || ![2, 3, 4].includes(value?.version) || !Array.isArray(value.agents) ||
      !value.agents.every((id: unknown) => CODING_AGENTS.some(agent => agent.id === id)) ||
      (value.otherAgent !== undefined && (typeof value.otherAgent !== 'string' || value.otherAgent.length > 100)) ||
      (value.otherAgentSelected !== undefined && typeof value.otherAgentSelected !== 'boolean') ||
      typeof value.task !== 'string' || value.task.length > 600 ||
      (value.version === 4 && value.workflow !== null && !WORKFLOWS.some(workflow => workflow.id === value.workflow)) || !Number.isInteger(value.step) || value.step < 0 || value.step > (value.version === 2 ? 5 : value.version === 3 ? 6 : 3)) return null;
    if (value.version >= 3 && (!Array.isArray(value.sources) ||
      !value.sources.every((id: unknown) => ISSUE_SOURCES.some(source => source.id === id)) ||
      !validSourcePreferences(value.sourceSettings))) return null;
    const draft: FactoryDraft = { version: 4,
      sources: value.version === 2 ? [] : [...new Set<IssueSourceId>(value.sources)],
      sourceSettings: value.version === 2 ? {} : value.sourceSettings, agents: [...new Set<AgentId>(value.agents)], otherAgent: value.otherAgent ?? '', task: value.task,
      ...(value.agentSettings !== undefined ? { agentSettings: value.agentSettings } : {}),
      ...(value.otherAgentSelected !== undefined ? { otherAgentSelected: value.otherAgentSelected } : {}),
      workflow: value.version === 4 ? value.workflow : null, step: value.version === 2 ? 0 : value.version === 3 ? Math.min(value.step, 2) : value.step };
    for (let step = 0; step < draft.step; step++) {
      if (!canContinue(draft, step)) { draft.step = step; break; }
    }
    return draft;
  } catch { return null; }
}

export function cloudConnectionsHref(draft: FactoryDraft, handoffId: string, journeyId?: string): string {
  if (!canContinue(draft, 2)) throw new Error('Choose a workflow before continuing to Cloud.');
  // The fragment is read only by Cloud's browser handoff page. Source code and
  // ticket filters must not enter OAuth state, cookies, or server access logs.
  const payload = { version: 1, handoffId, ...(journeyId ? { analytics: { journeyId } } : {}), name: 'Software factory', source: factorySource({ ...draft, step: 3 }),
    workflow: draft.workflow, sources: draft.sources, sourceSettings: draft.sourceSettings,
    agents: draft.agents, otherAgent: draft.otherAgent, otherAgentSelected: otherAgentIsSelected(draft), task: draft.task };
  const base = process.env.NEXT_PUBLIC_CLOUD_URL || 'https://agentrelay.com/cloud';
  return `${base.replace(/\/$/, '')}/flows/import#${encodeURIComponent(JSON.stringify(payload))}`;
}

export function factoryCodeSections(draft: FactoryDraft, target: 'cloud' | 'local' = 'cloud') {
  const budget = target === 'local' ? '{ wallclock: "1h" }' : '"$8/run"';
  if (!draft.sources.length) return [{ id: 'empty', code: `import { flow } from "@relayflows/surface";

export default flow("software-factory",
  { budget: ${budget} }, async (f) => {

});` }];
  const agent = primaryAgent(draft);
  const hasMarkdown = draft.sources.includes('markdown');
  const markdownPath = draft.sourceSettings.markdown?.path?.trim() || 'tasks.md';
  // Quote the configured path as one literal shell argument, including quotes.
  const readMarkdownCommand = "cat -- '" + markdownPath.replace(/'/g, "'\\''") + "'";
  const hasBuilder = draft.step >= 1 && canContinue(draft, 1);
  const sections = [{ id: 'setup', code: 'import { flow } from "@relayflows/surface";' },
    { id: 'sources', code: issueSourceCode(draft.sources, draft.sourceSettings) }];
  if (hasBuilder) sections.push({ id: 'builder', code: `${draft.agents.some(isCodingAgent) ? '// Your coding agent, ready to work.' : '// Claude Code example while your selected tools are coming soon.'}
const builder = "${agent}";` });
  sections.push({ id: 'input', code: `type Input = { issue${hasMarkdown ? '?' : ''}: Issue; approver: string };

// Run in a connected repository, on a new branch.
export default flow<Input>("software-factory",
  { budget: ${budget} }, async (f, input) => {${hasMarkdown ? `
  // Without an incoming ticket, read your local Markdown task.
  const issue = input.issue ?? {
    source: "markdown", title: ${JSON.stringify(markdownPath)},
    body: await f.run(${JSON.stringify(readMarkdownCommand)}),
    labels: [], path: ${JSON.stringify(markdownPath)},
  };` : '\n  const issue = input.issue;'}
  // Ignore items outside the sources and filters you chose.
  if (!matchesIssue(issue)) return f.done("canceled");` });
  if (hasBuilder && draft.step >= 2 && draft.workflow) {
    sections.push(...workflowCode(draft.workflow, workflowAgents(draft.agents), draft.task, target, draft.agentSettings, draft.agents));
  }
  sections.push({ id: 'end', code: draft.step < 2 || !draft.workflow ? '  // Your next answer adds the next step.\n});' : '});' });
  return sections;
}
export function factorySource(draft: FactoryDraft, target: 'cloud' | 'local' = 'cloud'): string {
  return factoryCodeSections(draft, target).map(section => section.code).join('\n\n') + '\n';
}
