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

/**
 * Reads `package.json` with Node, which every sandbox has because it has npm.
 * A missing file, unparseable JSON, or an empty/absent `test` script all exit
 * non-zero so the caller can skip instead of running a package manager.
 */
const HAS_TEST_SCRIPT = 'node -e \'const f=require("fs");let p;try{p=JSON.parse(f.readFileSync("package.json","utf8"))}catch{process.exit(1)}const t=(p.scripts||{}).test;process.exit(t&&String(t).trim()?0:1)\'';

/**
 * Installs dependencies with the repository's own package manager (chosen by
 * lockfile) and runs its `test` script. Cloud sandboxes ship npm and corepack
 * but not pnpm or Yarn, so a bare `npm test` fails for pnpm/Yarn repositories
 * whose test script calls the package manager (AgentWorkforce/burn#540). Yarn
 * Berry (`.yarnrc.yml`) installs with `--immutable`; Yarn Classic with
 * `--frozen-lockfile`.
 *
 * The step runs under `sh`, and its exit code is the only signal the runner
 * has: `f.run` takes a timeout but no retry policy, so anything non-zero is
 * retried until the run dies with `retries_exhausted`. A repository with no
 * `package.json` therefore killed real runs — every npm subcommand reports
 * ENOENT as `errno -2`, which npm returns verbatim as its exit status, and
 * `-2 & 0xFF` is 254. Retrying can never create the file, so "there is nothing
 * to test" now skips with a message and exit 0; only a genuine install or test
 * failure, or a lockfile whose package manager cannot be provided, exits
 * non-zero. Every path prints a line, so the journal never records an empty
 * `stdout_tail` again.
 */
export const FLOW_TEST_COMMAND = [
  'set -e',
  'if [ ! -f package.json ]; then echo "relayflow: no package.json in the repository root; skipping tests." && exit 0; fi',
  `if ! ${HAS_TEST_SCRIPT} >/dev/null 2>&1; then echo "relayflow: package.json has no runnable test script; skipping tests." && exit 0; fi`,
  'if [ -f pnpm-lock.yaml ]; then pm=pnpm; elif [ -f yarn.lock ]; then pm=yarn; elif [ -f bun.lock ] || [ -f bun.lockb ]; then pm=bun; else pm=npm; fi',
  'if [ "$pm" = pnpm ] || [ "$pm" = yarn ]; then if ! command -v "$pm" >/dev/null 2>&1; then mkdir -p "$HOME/.local/bin" && { corepack enable --install-directory "$HOME/.local/bin" "$pm" >/dev/null 2>&1 || true; } && PATH="$HOME/.local/bin:$PATH" && export PATH; fi; COREPACK_ENABLE_DOWNLOAD_PROMPT=0 && export COREPACK_ENABLE_DOWNLOAD_PROMPT; fi',
  'if ! command -v "$pm" >/dev/null 2>&1; then echo "relayflow: this repository\'s lockfile requires $pm, which is not installed and could not be provisioned." >&2 && exit 1; fi',
  'echo "relayflow: installing dependencies and running tests with $pm"',
  'if [ "$pm" = pnpm ]; then pnpm install --frozen-lockfile && pnpm test; elif [ "$pm" = yarn ]; then { if [ -f .yarnrc.yml ]; then yarn install --immutable; else yarn install --frozen-lockfile; fi; } && yarn test; elif [ "$pm" = bun ]; then bun install --frozen-lockfile && bun run test; else { if [ -f package-lock.json ]; then npm ci; else npm install; fi; } && npm test; fi',
].join('; ');

const REVIEW_BLOCKED_HEADING = '**Relayflow: the adversarial review did not pass.** This branch is not approved: the flow stopped here and did not mark it ready to merge.';

/**
 * Says on the pull request what the run cannot yet say in its exit code.
 *
 * `done("step_failed")` is the honest end for a review that found problems, and
 * `@relayflows/surface` accepts it — `step_failed` is a real
 * `FlowCompletionReason`, so `flows check` passes and the type system is happy.
 * The pinned runtime is not: its authored executor lowers only `success` and
 * `needs_human` and throws on everything else (`the initial authored executor
 * cannot lower done("step_failed")`, packages/sdk/src/authored-flow-executor.ts
 * in AgentWorkforce/flows). A real run proved what that costs — 15 agent steps,
 * a pushed branch and AgentWorkforce/cloud-e2e-sandbox#25, then
 * `FAILED [protocol_error]` as the only verdict. The happy path lowers, so this
 * stayed hidden until a review legitimately failed.
 *
 * AgentWorkforce/flows#401 teaches the executor `step_failed` and `canceled`.
 * Until the pin in flow-local.ts moves to a release containing it, a failed
 * review parks like every other preset — and the difference lives where the
 * operator acts rather than in a reason string: the pull request is converted
 * to a draft, so it cannot be merged by accident, and the unresolved review is
 * posted to it. That marking is worth keeping after #401 ships; only the
 * `f.done` reason changes then.
 *
 * Every branch exits 0 deliberately. `f.run` has no retry policy, so a non-zero
 * exit is retried until the run dies with `retries_exhausted`: a missing
 * review.md, an older `gh` without `pr ready --undo`, or a repository that
 * refuses drafts must not cost the run the report it is trying to leave behind.
 * Each branch prints which way it went, so the journal records the outcome.
 */
export const FLOW_REVIEW_BLOCKED_COMMAND = [
  'set -e',
  `{ printf '%s\\n\\n' "${REVIEW_BLOCKED_HEADING}"; if [ -s review.md ]; then cat review.md; else printf '%s\\n' "_The reviewer left no review.md; see the review step in the run journal._"; fi; } > review-blocked.md || true`,
  'echo "relayflow: the adversarial review did not pass; wrote review-blocked.md."',
  'if gh pr ready --undo >/dev/null 2>&1; then echo "relayflow: converted the pull request to a draft."; else echo "relayflow: could not convert the pull request to a draft; review-blocked.md still holds the findings." >&2; fi',
  'if gh pr comment --body-file review-blocked.md >/dev/null 2>&1; then echo "relayflow: posted the unresolved review to the pull request."; else echo "relayflow: could not comment on the pull request; review-blocked.md still holds the findings." >&2; fi',
].join('; ');

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
  // Install dependencies with the repository's package manager, then run its tests.
  const testCommand = ${JSON.stringify(FLOW_TEST_COMMAND)};
  await f.run(testCommand, { timeout: "15m" });` });
  sections.push({ id: 'pull-request', code: `  // Publish the branch and open the pull request without an agent.
  await f.run("git push --set-upstream origin HEAD");
  await f.run('gh pr create --title "Software factory change" --body-file summary.md');` });
  if (workflow !== 'simple') sections.push({ id: 'review', code: `  // ${workflow === 'traditional' ? 'Always run two independent adversarial reviews, even if the first passes.' : 'Review the final implementation against the ticket and comparison findings.'}
  // A failed review parks instead of reporting done("step_failed"): the pinned
  // runtime lowers only success and needs_human, so that reason would end this
  // run as protocol_error after all the work above is finished. The pull
  // request carries the verdict instead. AgentWorkforce/flows#401 adds the
  // missing lowering; when this kit pins a release with it, the reason below
  // becomes f.done("step_failed") and the marking stays as it is.
  const reviewBlockedCommand = ${JSON.stringify(FLOW_REVIEW_BLOCKED_COMMAND)};
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
      await f.run(testCommand, { timeout: "15m" });
      await f.run("git push");
    }` : ''}
  }
  // Unresolved feedback stops the flow short of approval.
  if (!clean) {
    await f.run(reviewBlockedCommand);
    console.error("The adversarial review did not pass. The pull request is now a draft with the findings posted, and review-blocked.md holds them too. This run is parked, not approved.");
    return f.done("needs_human");
  }` });
  sections.push({ id: 'gate', code: `  // Require approving reviews and passing CI checks in GitHub branch rules.
  // Stop for human review. This flow never merges the pull request.
  // Review and merge in GitHub; approval happens outside the runner.
  return f.done("needs_human");` });
  return sections;
}
