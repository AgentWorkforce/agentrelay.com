import { ISSUE_SOURCES, issueSourceCode, validSourcePreferences, type IssueSourceId, type SourcePreferences } from './flow-sources';

// Availability reflects Relayflows' direct CLI adapters, not Relay's broader
// fleet spawn vocabulary. Keep interest-only choices out of executable code.
export const CODING_AGENTS = [
  { id: 'claude', label: 'Claude Code', available: true },
  { id: 'codex', label: 'Codex', available: true },
  { id: 'gemini', label: 'Gemini CLI', available: false },
  { id: 'opencode', label: 'OpenCode', available: false },
  { id: 'cursor', label: 'Cursor', available: false },
  { id: 'copilot', label: 'GitHub Copilot', available: false },
  { id: 'windsurf', label: 'Windsurf', available: false },
  { id: 'aider', label: 'Aider', available: false },
  { id: 'goose', label: 'Goose', available: false },
  { id: 'grok', label: 'Grok', available: false },
  { id: 'pi', label: 'Pi', available: false },
] as const;
export type AgentId = (typeof CODING_AGENTS)[number]['id'];
export type CodingAgent = 'claude' | 'codex';
export type FactoryDraft = {
  version: 3;
  sources: IssueSourceId[];
  sourceSettings: SourcePreferences;
  agents: AgentId[];
  otherAgent: string;
  otherAgentSelected?: boolean;
  task: string;
  reviewer: CodingAgent | null;
  rounds: 1 | 3 | 5 | null;
  approval: boolean;
  step: number;
};
export const LEGACY_FACTORY_DRAFT_KEY = 'agentrelay:software-factory:v2';
export const FACTORY_DRAFT_KEY = 'agentrelay:software-factory:v3';
export const DEFAULT_FACTORY: FactoryDraft = { version: 3, sources: [], sourceSettings: {}, agents: [], otherAgent: '', task: '', reviewer: null, rounds: null, approval: false, step: 0 };
export const agentLabel = (id: AgentId) => CODING_AGENTS.find(agent => agent.id === id)!.label;
export function primaryAgent(draft: FactoryDraft): CodingAgent {
  return draft.agents.find((agent): agent is CodingAgent => agent === 'claude' || agent === 'codex') ?? 'claude';
}
export function otherAgentIsSelected(draft: FactoryDraft): boolean {
  return draft.otherAgentSelected ?? Boolean(draft.otherAgent?.trim());
}
export function canContinue(draft: FactoryDraft, step = draft.step): boolean {
  return [draft.sources.length > 0, draft.agents.length > 0 || (otherAgentIsSelected(draft) && Boolean(draft.otherAgent?.trim())), draft.task.trim().length > 0, draft.reviewer !== null, draft.rounds !== null, draft.approval][step] ?? true;
}

export const ONBOARDING_STAGES = ['sources', 'agents', 'task', 'reviewer', 'reviews', 'approval', 'connections'] as const;
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
    if (![2, 3].includes(value?.version) || !Array.isArray(value.agents) ||
      !value.agents.every((id: unknown) => CODING_AGENTS.some(agent => agent.id === id)) ||
      (value.otherAgent !== undefined && (typeof value.otherAgent !== 'string' || value.otherAgent.length > 100)) ||
      (value.otherAgentSelected !== undefined && typeof value.otherAgentSelected !== 'boolean') ||
      typeof value.task !== 'string' || value.task.length > 600 ||
      ![null, 'claude', 'codex'].includes(value.reviewer) || ![null, 1, 3, 5].includes(value.rounds) ||
      typeof value.approval !== 'boolean' || !Number.isInteger(value.step) || value.step < 0 || value.step > (value.version === 2 ? 5 : 6)) return null;
    if (value.version === 3 && (!Array.isArray(value.sources) ||
      !value.sources.every((id: unknown) => ISSUE_SOURCES.some(source => source.id === id)) ||
      !validSourcePreferences(value.sourceSettings))) return null;
    const draft: FactoryDraft = { version: 3,
      sources: value.version === 2 ? [] : [...new Set<IssueSourceId>(value.sources)],
      sourceSettings: value.version === 2 ? {} : value.sourceSettings, agents: [...new Set<AgentId>(value.agents)], otherAgent: value.otherAgent ?? '', task: value.task,
      ...(value.otherAgentSelected !== undefined ? { otherAgentSelected: value.otherAgentSelected } : {}),
      reviewer: value.reviewer, rounds: value.rounds, approval: value.approval, step: value.version === 2 ? 0 : value.step };
    for (let step = 0; step < draft.step; step++) {
      if (!canContinue(draft, step)) { draft.step = step; break; }
    }
    return draft;
  } catch { return null; }
}

export function cloudConnectionsHref(): string {
  const params = new URLSearchParams({ next: '/integrations', ref: 'flows', utm_source: 'agentrelay.com', utm_medium: 'flows_onboarding', utm_campaign: 'flows' });
  return `https://agentrelay.com/cloud/api/auth/google/start?${params}`;
}

export function factoryCodeSections(draft: FactoryDraft) {
  if (!draft.sources.length) return [{ id: 'empty', code: `import { flow } from "@relayflows/surface";

export default flow("software-factory",
  { budget: "$8/run" }, async (f) => {

});` }];
  const agent = primaryAgent(draft);
  const hasMarkdown = draft.sources.includes('markdown');
  const markdownPath = draft.sourceSettings.markdown?.path?.trim() || 'tasks.md';
  // Quote the configured path as one literal shell argument, including quotes.
  const readMarkdownCommand = "cat -- '" + markdownPath.replace(/'/g, "'\\''") + "'";
  const hasBuilder = draft.step >= 1 && canContinue(draft, 1);
  const sections = [{ id: 'setup', code: 'import { flow } from "@relayflows/surface";' },
    { id: 'sources', code: issueSourceCode(draft.sources, draft.sourceSettings) }];
  if (hasBuilder) sections.push({ id: 'builder', code: `${draft.agents.some(id => id === 'claude' || id === 'codex') ? '// Your coding agent, ready to work.' : '// Claude Code example while your selected tools are coming soon.'}
const builder = "${agent}";` });
  sections.push({ id: 'input', code: `type Input = { issue${hasMarkdown ? '?' : ''}: Issue; approver: string };

// Run in a connected repository, on a new branch.
export default flow<Input>("software-factory",
  { budget: "$8/run" }, async (f, input) => {${hasMarkdown ? `
  // Without an incoming ticket, read your local Markdown task.
  const issue = input.issue ?? {
    source: "markdown", title: ${JSON.stringify(markdownPath)},
    body: await f.run(${JSON.stringify(readMarkdownCommand)}),
    labels: [], path: ${JSON.stringify(markdownPath)},
  };` : '\n  const issue = input.issue;'}
  // Ignore items outside the sources and filters you chose.
  if (!matchesIssue(issue)) return f.done("canceled");` });
  if (hasBuilder && draft.step >= 2 && draft.task.trim()) {
    sections.push({ id: 'implement', code: `  // Turn your request into a tested pull request.
  await f.agent("implementer", {
    cli: builder,
    task: issue.title + "\\n" + issue.body + "\\n" +
      ${JSON.stringify(draft.task.trim())} +
      " Implement on the current branch. Commit changes. " +
      "Write a PR summary to summary.md.",
  });
  await f.run("npm test");
  await f.run("git push --set-upstream origin HEAD");
  await f.run('gh pr create --title "Software factory change" ' +
    '--body-file summary.md');` });
  }
  const hasReview = hasBuilder && draft.step >= 3 && draft.reviewer;
  const hasLoop = draft.step >= 4 && draft.rounds;
  if (hasReview) {
    sections.push({ id: 'review', code: `${hasLoop ? `  // Review, fix, repeat. Stop after ${draft.rounds} rounds.
  let clean = false;
  for (let round = 0; round < ${draft.rounds}; round++) {` : '  // A fresh pair of eyes challenges the change.'}
    await f.run("rm -f review.clean");
    await f.agent("adversary", {
      cli: "${draft.reviewer}",
      task: "Review the PR diff, tests, and all PR comments. " +
        "Find bugs and edge cases. Write review.md. " +
        "Create review.clean only if no issues remain.",
    });
    ${hasLoop ? '' : 'const '}clean = (await f.run(
      "test -f review.clean && echo yes || echo no"
    )).trim() === "yes";${hasLoop ? '\n    if (clean) break;' : '\n    if (!clean) return f.done("step_failed");'}` });
  }
  if (hasReview && hasLoop) sections.push({ id: 'loop', code: `    // Read feedback, make fixes, then test again.
    if (round + 1 < ${draft.rounds}) {
      await f.agent("fixer", {
        cli: builder,
        task: "Read review.md and gh pr view --comments. " +
          "Address every issue. Commit and push the fixes.",
      });
      await f.run("npm test");
    }
  }
  // Unresolved feedback never reaches approval.
  if (!clean) return f.done("step_failed");` });
  if (hasBuilder && draft.step >= 5 && draft.approval) sections.push({ id: 'gate', code: `  // You have the final say before anything ships.
  const approved = await f.human("Approve this PR?", {
    to: input.approver,
  });
  if (!approved) return f.done("canceled");
  // Merge the approved PR in GitHub when ready.
  f.done("success");` });
  sections.push({ id: 'end', code: draft.step < 6 ? '  // Your next answer adds the next step.\n});' : '});' });
  return sections;
}
export function factorySource(draft: FactoryDraft): string {
  return factoryCodeSections(draft).map(section => section.code).join('\n\n') + '\n';
}
