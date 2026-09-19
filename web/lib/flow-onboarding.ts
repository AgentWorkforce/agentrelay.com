import { validFlowAgentSettings, type FlowAgentSettings } from './flow-agent-settings';
import { flowPreview } from './flow-preview';
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

/**
 * Cloud deploys a listener, and a Markdown file is read by a run rather than
 * emitting events, so a Markdown-only flow has nothing to trigger it. Cloud
 * already refuses this at deploy time; saying so here saves a Google sign-in,
 * a GitHub App install and a model choice made for a deploy that cannot
 * happen. Any other selected source is a real listener, so the flow deploys
 * (Cloud drops markdown from the sources it listens to) and is not blocked.
 */
export const MARKDOWN_ONLY_CLOUD_NOTE = 'Markdown files are not a live source, so Cloud has nothing to listen to. Choose a ticket source, or run on your computer.';
export function isMarkdownOnly(draft: FactoryDraft): boolean {
  return draft.sources.length > 0 && draft.sources.every(source => source === 'markdown');
}
export function cloudBlockedReason(draft: FactoryDraft): string {
  return isMarkdownOnly(draft) ? MARKDOWN_ONLY_CLOUD_NOTE : '';
}

export function cloudConnectionsHref(draft: FactoryDraft, handoffId: string, journeyId?: string, distinctId?: string): string {
  if (!canContinue(draft, 2)) throw new Error('Choose a workflow before continuing to Cloud.');
  // The fragment is read only by Cloud's browser deploy page, which keeps it in
  // localStorage across Google sign-in. Source code and ticket filters must not
  // enter OAuth state, cookies, or server access logs.
  // distinctId is PostHog's anonymous device identifier for this visitor, and
  // nothing else: no email, name, or anything typed into onboarding. Both apps
  // are same-origin in production, so Cloud normally reads the same anonymous
  // id from shared browser storage. Carrying it here lets Cloud measure whether
  // that continuity actually held and merge the two people when it did not.
  const analytics = { ...(journeyId ? { journeyId } : {}), ...(distinctId ? { distinctId } : {}) };
  const payload = { version: 1, handoffId, ...(Object.keys(analytics).length ? { analytics } : {}), name: 'Software factory', source: factorySource({ ...draft, step: 3 }),
    workflow: draft.workflow, preview: flowPreview(draft), sources: draft.sources, sourceSettings: draft.sourceSettings,
    agents: draft.agents, otherAgent: draft.otherAgent, otherAgentSelected: otherAgentIsSelected(draft), task: draft.task };
  const base = process.env.NEXT_PUBLIC_CLOUD_URL || 'https://agentrelay.com/cloud';
  return `${base.replace(/\/$/, '')}/flows/deploy#${encodeURIComponent(JSON.stringify(payload))}`;
}

export function factoryCodeSections(draft: FactoryDraft, target: 'cloud' | 'local' = 'cloud') {
  // A wall-clock budget for every target. Since relayflows 2.0.13 a dollar
  // budget no longer refuses a model-less Codex step (AgentWorkforce/flows#421);
  // such a step runs unmetered, so a dollar cap cannot bound it. Wall-clock is
  // enforced on every step regardless of pricing, which is why it stays the
  // default here; `{ dollars, wallclock }` together is also valid.
  const budget = '{ wallclock: "2h" }';
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
    { id: 'sources', code: issueSourceCode(draft.sources, draft.sourceSettings, target) }];
  if (hasBuilder) sections.push({ id: 'builder', code: `${draft.agents.some(isCodingAgent) ? '// Your coding agent, ready to work.' : '// Claude Code example while your selected tools are coming soon.'}
const builder = "${agent}";` });
  // Cloud filters tickets before a run exists: the deployed listener's watch
  // rules pick which tickets wake the flow and the launcher re-checks every
  // chosen field, so re-filtering here only gave a run a silent way to cancel
  // itself. A local run has no dispatcher, so it filters and explains instead.
  // Both guards park rather than report done("canceled"), and that is now
  // permanent. `canceled` is a real FlowCompletionReason, so it typechecks and
  // `flows check` passes it, but the runtime refuses it by design: cancellation
  // is a kernel fact that arrives through `run.cancel`, so a flow body
  // declaring it would assert something that never happened
  // (AgentWorkforce/flows#436, which lowered `step_failed` and kept `canceled`
  // and `budget_exceeded` refused). This is not a lowering gap waiting on a
  // release — flows#401, which promised `canceled`, is closed and superseded.
  // What these guards actually mean is a deliberate declination: nothing was
  // wrong, there was simply nothing to do. That reason is proposed as
  // `declined` in AgentWorkforce/flows#438 and implemented in PR #439, which is
  // open and in no published release; when a pin here contains it, these become
  // f.done("declined"). Until then they park, and the reason is printed either
  // way, so a parked run still says why it stopped and no ticket is quietly
  // treated as work that succeeded.
  const guard = target === 'local'
    ? `  // Nothing screens tickets before a local run, so check the input here.
  const rejection = issueRejection(issue);
  if (rejection) {
    // Parked, not canceled: the runtime refuses done("canceled") by design, as
    // a kernel fact a flow body cannot declare (AgentWorkforce/flows#436). The
    // reason this wants is a declination — AgentWorkforce/flows#438, unshipped.
    console.error("Stopped: " + rejection + ". Edit flow-input.json and run again. Nothing was built.");
    return f.done("needs_human");
  }`
    : `  // Cloud starts this flow only for tickets that already match the sources
  // and filters you chose, so just check the ticket arrived intact.
  if (!issue?.title?.trim()) {
    // Parked, not canceled: the runtime refuses done("canceled") by design, as
    // a kernel fact a flow body cannot declare (AgentWorkforce/flows#436). The
    // reason this wants is a declination — AgentWorkforce/flows#438, unshipped.
    console.error("Stopped: no ticket arrived with this run, so there was nothing to work on.");
    return f.done("needs_human");
  }`;
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
${guard}` });
  if (hasBuilder && draft.step >= 2 && draft.workflow) {
    sections.push(...workflowCode(draft.workflow, workflowAgents(draft.agents), draft.task, target, draft.agentSettings, draft.agents));
  }
  sections.push({ id: 'end', code: draft.step < 2 || !draft.workflow ? '  // Your next answer adds the next step.\n});' : '});' });
  return sections;
}
export function factorySource(draft: FactoryDraft, target: 'cloud' | 'local' = 'cloud'): string {
  return factoryCodeSections(draft, target).map(section => section.code).join('\n\n') + '\n';
}
