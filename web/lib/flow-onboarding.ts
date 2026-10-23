import type { FlowAgentSettings } from './flow-agent-settings';
import { FLOW_TIME, WORKFLOWS, workflowCode, workflowAgents, type WorkflowId } from './flow-workflows';
import { issueSourceCode, type IssueSourceId, type SourcePreferences } from './flow-sources';
import { isCodingAgent, type AgentId, type CodingAgent } from './flow-agents';

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
export const DEFAULT_FACTORY: FactoryDraft = { version: 4, sources: [], sourceSettings: {}, agents: [], otherAgent: '', task: '', workflow: null, step: 0 };
function primaryAgent(draft: FactoryDraft): CodingAgent {
  return workflowAgents(draft.agents).builder;
}
function otherAgentIsSelected(draft: FactoryDraft): boolean {
  return draft.otherAgentSelected ?? Boolean(draft.otherAgent?.trim());
}
function canContinue(draft: FactoryDraft, step = draft.step): boolean {
  return [draft.sources.length > 0, draft.agents.length > 0 || (otherAgentIsSelected(draft) && Boolean(draft.otherAgent?.trim())), WORKFLOWS.some(workflow => workflow.id === draft.workflow)][step] ?? true;
}

function factoryCodeSections(draft: FactoryDraft, target: 'cloud' | 'local' = 'cloud') {
  // A wall-clock budget for every target. Since relayflows 2.0.13 a dollar
  // budget no longer refuses a model-less Codex step (AgentWorkforce/flows#421);
  // such a step runs unmetered, so a dollar cap cannot bound it. Wall-clock is
  // enforced on every step regardless of pricing, which is why it stays the
  // default here; `{ dollars, wallclock }` together is also valid. Its length
  // is the flow's time plan (FLOW_TIME): 2h, an hour under Cloud's 180-minute
  // cap on a hosted run (AgentWorkforce/cloud#4270), and 3h for a local run,
  // which has no sandbox lifetime and cannot stop an agent at a limit.
  const budget = `{ wallclock: "${(target === 'cloud' ? FLOW_TIME.headerMinutes : FLOW_TIME.localHeaderMinutes) / 60}h" }`;
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
  // checkCommand: the flow's test command, when Cloud or a local input sets
  // one; it replaces check discovery (see the 'discover' section).
  sections.push({ id: 'input', code: `type Input = { issue${hasMarkdown ? '?' : ''}: Issue; approver: string; checkCommand?: string };

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
