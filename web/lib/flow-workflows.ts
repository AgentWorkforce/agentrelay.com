import { resolveAgentSettings, type AgentRole, type FlowAgentSettings } from './flow-agent-settings';
import { isCodingAgent } from './flow-agents';

export const WORKFLOWS = [
  { id: 'traditional', label: 'Traditional', description: 'Plan first, challenge the code, and keep the final say.', steps: ['Plan', 'Review plan', 'Implement', 'Run checks', 'Open PR', '2× adversarial review', 'Human gate'] },
  { id: 'prototype', label: 'Prototype and build', description: 'Explore three approaches, then build from the best of each.', steps: ['3 implementations', 'Compare', 'Build', 'Run checks', 'Open PR', 'Review', 'Human gate'] },
  { id: 'simple', label: 'Simple', description: 'One agent takes the ticket straight to implementation.', steps: ['Implement', 'Run checks', 'Open PR', 'Human gate'] },
] as const;

export type WorkflowStep = typeof WORKFLOWS[number]['steps'][number];
export const WORKFLOW_STEP_DETAILS: Record<WorkflowStep, string> = {
  'Plan': 'Read the ticket and repository, then outline the changes to make.',
  'Review plan': 'Challenge the assumptions and fill gaps before any code is written.',
  'Implement': 'Turn the ticket into a working change and add regression tests.',
  '3 implementations': 'Build three different solutions in parallel. Each gets its own isolated workspace.',
  'Compare': 'Compare the code and test results, then identify the strongest ideas from each solution.',
  'Build': 'Use the comparison to combine the strongest ideas into one final implementation.',
  'Run checks': 'Run the repository’s tests with a script. Stop if any check fails.',
  'Open PR': 'Push the branch and open a pull request with a summary of the changes.',
  '2× adversarial review': 'Challenge the code in two fresh reviews, fixing and retesting issues between rounds.',
  'Review': 'Check the final code against the ticket and comparison. Stop if issues remain.',
  'Human gate': 'Stop for your review. You decide when to merge the pull request in GitHub.',
};

export type WorkflowId = (typeof WORKFLOWS)[number]['id'];

export function workflowAgents(selected: readonly string[]) {
  const builder = selected.filter(isCodingAgent)[0] ?? 'claude';
  const reviewer = selected.filter(isCodingAgent).find(id => id !== builder) ?? builder;
  return { builder, reviewer, prototypes: [builder, reviewer, builder] };
}

export function workflowCode(workflow: WorkflowId, agents: ReturnType<typeof workflowAgents>, instructions: string, _target: 'cloud' | 'local' = 'cloud', settings: FlowAgentSettings = {}, selected: readonly string[] = [agents.builder, agents.reviewer]) {
  const config = (role: AgentRole) => resolveAgentSettings(workflow, role, selected, settings);
  const options = (role: AgentRole, fallback: string, context = '') => {
    const value = config(role);
    const cli = value.agent === agents.builder && fallback === 'builder' ? 'builder' : JSON.stringify(value.agent);
    return `cli: ${cli},${value.model ? `\n    model: ${JSON.stringify(value.model)},` : ''}\n    task: task + "\\n" + ${JSON.stringify(value.prompt)}${context},`;
  };
  const prototypeConfigs = (['prototype-1', 'prototype-2', 'prototype-3'] as const).map(config);
  const sections = [{ id: 'task', code: `  const task = issue.title + "\\n" + issue.body + "\\n" +
    ${JSON.stringify(instructions.trim() || 'Follow existing patterns. Keep changes focused and add regression tests.')};` }];
  if (workflow === 'traditional') sections.push({ id: 'plan', code: `  // Read the ticket and agree on a plan before changing code.
  await f.agent("planner", {
    ${options('planner', 'builder')}
  });
  await f.agent("plan-reviewer", {
    ${options('plan-reviewer', 'reviewer')}
  });
  await f.run("test -s reviewed-plan.md");` });
  if (workflow === 'prototype') sections.push({ id: 'prototypes', code: `  // Each prototype starts from the same commit in its own worktree.
  const prototypeRoot = (await f.run("mktemp -d /tmp/relay-prototypes.XXXXXX")).trim();
  const quote = (value: string) => "'" + value.replace(/'/g, "'\\\\''") + "'";
  const prototypeAgents = ${JSON.stringify(prototypeConfigs.map(value => value.agent))};
  const prototypeSettings: { model?: string; prompt: string }[] = ${JSON.stringify(prototypeConfigs.map(({ model, prompt }) => ({ ...(model ? { model } : {}), prompt })))};
  const approaches = ["the smallest change", "a maintainable design", "a different approach"];
  const paths = approaches.map((_, index) => prototypeRoot + "/" + (index + 1));
  const base = (await f.run("git rev-parse HEAD")).trim();
  for (const path of paths) {
    await f.run("git worktree add --detach " + quote(path) + " " + quote(base));
  }
  await Promise.all(paths.map((cwd, index) => f.agent("prototype-" + (index + 1), {
    cli: prototypeAgents[index],
    cwd,
    ...(prototypeSettings[index].model ? { model: prototypeSettings[index].model } : {}),
    task: task + "\\n" + prototypeSettings[index].prompt + " Assigned approach: " + approaches[index],
  })));
  // All three implementations are finished before comparison begins.
  await f.agent("comparator", {
    ${options('comparator', 'reviewer', ' + " Prototype worktrees: " + paths.join(", ")')}
  });
  await f.run("test -s comparison.md");
  // Keep the prototype worktrees available for inspection.` });
  sections.push({ id: 'implement', code: `  // Build and test the change, then open a pull request.
  await f.agent("implementer", {
    ${options('implementer', 'builder')}
  });` });
  sections.push({ id: 'checks', code: `  // Scripted checks must pass before publishing the change.
  await f.run("npm test", { timeout: "15m" });` });
  sections.push({ id: 'pull-request', code: `  // Publish the branch and open the pull request without an agent.
  await f.run("git push --set-upstream origin HEAD");
  await f.run('gh pr create --title "Software factory change" --body-file summary.md');` });
  if (workflow !== 'simple') sections.push({ id: 'review', code: `  // ${workflow === 'traditional' ? 'Always run two independent adversarial reviews, even if the first passes.' : 'Review the final implementation against the ticket and comparison findings.'}
  let clean = false;
  for (let round = 0; round < ${workflow === 'traditional' ? 2 : 1}; round++) {
    await f.run("rm -f review.clean");
    await f.agent("adversary-" + (round + 1), {
      ${options('adversary', 'reviewer')}
    });
    clean = (await f.run("test -f review.clean && echo yes || echo no")).trim() === "yes";
    ${workflow === 'traditional' ? `if (!clean && round === 0) {
      await f.agent("fixer", {
        ${options('fixer', 'builder')}
      });
      await f.run("npm test", { timeout: "15m" });
      await f.run("git push");
    }` : ''}
  }
  // Unresolved feedback stops the flow.
  if (!clean) return f.done("step_failed");` });
  sections.push({ id: 'gate', code: `  // Require approving reviews and passing CI checks in GitHub branch rules.
  // Stop for human review. This flow never merges the pull request.
  // Review and merge in GitHub; approval happens outside the runner.
  return f.done("needs_human");` });
  return sections;
}
