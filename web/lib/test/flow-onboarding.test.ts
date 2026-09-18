import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { FLOW_BASE_CHECK_COMMAND, FLOW_CHECK_BLOCKED_COMMAND, FLOW_CHECK_RUN_COMMAND, FLOW_DROP_WORKING_FILES_COMMAND, FLOW_PUBLISH_CHECK_COMMAND, FLOW_REVIEW_BLOCKED_COMMAND } from '../flow-workflows';
import { cloudBlockedReason, cloudConnectionsHref, DEFAULT_FACTORY, factorySource, isMarkdownOnly, MARKDOWN_ONLY_CLOUD_NOTE, readFactoryDraft, canContinue, primaryAgent, onboardingPath, accessibleOnboardingStep, type FactoryDraft } from '../flow-onboarding';
import { localInput } from '../flow-local';

const matchingIssue = { source: 'github', title: 'Fix login', body: 'Login fails', labels: ['ready', 'bug'], repository: 'acme/app' };

const completed: FactoryDraft = { version: 4, sources: ['github'], sourceSettings: { github: { repository: 'acme/app', labels: 'ready, bug' } }, agents: ['claude', 'codex'], otherAgent: '', task: 'Add a test', workflow: 'traditional', step: 3 };

/**
 * The generated flow's comments name the completion reasons it deliberately
 * does not emit, and why. Only the code is checked for them.
 */
const withoutComments = (source: string) => source.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');

/**
 * `publish` is what the deterministic publish check reports. `checks` is what
 * each run of the repository's checks reports, in order (pass once the list is
 * used up), and `baseline` what the base commit's check reports. Three
 * commands are built as `base=<commit>; ...`, so the mock matches each by the
 * command it ends with.
 */
async function runFactory(clean: boolean[], _approved = true, issue = matchingIssue, draft = completed, publish = 'publish', checks: string[] = [], baseline = 'pass', edit = (source: string) => source) {
  const calls: string[] = [];
  const errors: string[] = [];
  let finish = '';
  let index = 0;
  let checkIndex = 0;
  const source = edit(factorySource(draft)).replace('import { flow } from "@relayflows/surface";', '');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  const exports: { default?: (ctx: unknown, input: unknown) => Promise<void> } = {};
  new Function('exports', 'flow', compiled.outputText)(exports, (_name: string, _options: unknown, body: unknown) => body);
  const originalError = console.error;
  console.error = (message: string) => { errors.push(String(message)); };
  try {
    await exports.default!({
      agent: async (name: string, options: { cli: string; cwd?: string }) => { calls.push(`${name}:${options.cli}`); if (name.startsWith('prototype-')) { await Promise.resolve(); calls.push('finished:' + name + ':' + options.cwd); } },
      run: async (command: string) => {
        calls.push(command);
        if (command === FLOW_CHECK_RUN_COMMAND) return checks[checkIndex++] ?? 'pass';
        if (command.endsWith(FLOW_BASE_CHECK_COMMAND)) return baseline;
        if (command.endsWith(FLOW_PUBLISH_CHECK_COMMAND)) return publish;
        return command.startsWith('test -f') ? (clean[index++] ? 'yes' : 'no') : command.startsWith('mktemp') ? '/tmp/relay-prototypes.test' : command === 'git rev-parse HEAD' ? 'abc123' : '';
      },
      human: async () => { throw new Error('Interactive human approval is unsupported'); },
      done: (reason: string) => { finish = reason; },
    }, { issue, approver: 'owner' });
  } finally { console.error = originalError; }
  return { calls, finish, errors };
}

describe('software factory onboarding', () => {
  it('gives the introduction and final handoff distinct routes', () => {
    expect(onboardingPath(-1)).toBe('/flows/onboarding');
    expect(onboardingPath(0)).toBe('/flows/onboarding/sources');
    expect(onboardingPath(1)).toBe('/flows/onboarding/agents');
    expect(onboardingPath(3)).toBe('/flows/onboarding/connections');
  });

  it('guards direct links and requires an explicit workflow choice', () => {
    expect(accessibleOnboardingStep(DEFAULT_FACTORY, 3)).toBe(0);
    expect(accessibleOnboardingStep({ ...completed, agents: [] }, 3)).toBe(1);
    expect(accessibleOnboardingStep({ ...completed, task: '', step: 0 }, 3)).toBe(3);
    expect(DEFAULT_FACTORY.workflow).toBeNull();
    const unanswered = { ...completed, workflow: null, step: 2 };
    expect(canContinue(unanswered)).toBe(false);
    expect(accessibleOnboardingStep(unanswered, 3)).toBe(2);
    expect(readFactoryDraft(JSON.stringify({ ...unanswered, step: 3 }))?.step).toBe(2);
    expect(factorySource(unanswered)).not.toContain('f.agent(');
    expect(factorySource(unanswered)).not.toContain('f.human(');
    expect(() => cloudConnectionsHref(unanswered, 'id')).toThrow('Choose a workflow');
    expect(readFactoryDraft(JSON.stringify({ ...unanswered, workflow: 'prototype' }))?.workflow).toBe('prototype');
  });

  it('resolves checks again after the implementer when none were found before it', () => {
    for (const workflow of ['simple', 'traditional', 'prototype'] as const) {
      const source = factorySource({ ...DEFAULT_FACTORY, sources: ['github'], agents: ['claude'], workflow, step: 3 });
      const implementer = source.indexOf('f.agent("implementer"');
      const again = source.indexOf('if (checkPlan === "none") await f.run(resolveChecks);');
      expect(implementer, workflow).toBeGreaterThan(-1);
      expect(again, workflow).toBeGreaterThan(implementer);
      expect(source.indexOf('await f.run(runChecks'), workflow).toBeGreaterThan(again);
    }
  });

  it('rejects corrupt and unsupported persisted drafts', () => {
    for (const raw of [null, '{', '{}', '{"version":1,"agent":"shell","rounds":3}', '{"version":1,"agent":"claude","rounds":999}']) {
      expect(readFactoryDraft(raw)).toBeNull();
    }
    expect(readFactoryDraft(JSON.stringify(DEFAULT_FACTORY))).toEqual(DEFAULT_FACTORY);
  });

  it('reveals the full preset at the task step', () => {
    expect(factorySource(DEFAULT_FACTORY)).not.toContain('f.agent');
    expect(factorySource({ ...completed, step: 1 })).not.toContain('implementer');
    expect(factorySource({ ...completed, step: 2 })).toContain('return f.done("needs_human")');
  });

  it('lets upcoming-only selections continue using a supported example', () => {
    const draft: FactoryDraft = { ...DEFAULT_FACTORY, sources: ['github'], agents: ['windsurf', 'gemini'], step: 1 };
    expect(canContinue(draft)).toBe(true);
    expect(primaryAgent(draft)).toBe('claude');
    expect(factorySource(draft)).not.toContain('cli: "cursor"');
    expect(readFactoryDraft(JSON.stringify(draft))?.agents).toEqual(['windsurf', 'gemini']);
  });

  it.each(['cursor', 'opencode'] as const)('uses %s throughout a workflow without falling back to Claude', async agent => {
    const draft = { ...completed, agents: [agent] };
    expect(primaryAgent(draft)).toBe(agent);
    expect(factorySource(draft)).toContain(`const builder = "${agent}"`);
    const { calls } = await runFactory([true, true], true, matchingIssue, draft);
    expect(calls).toContain(`planner:${agent}`);
    expect(calls).toContain(`plan-reviewer:${agent}`);
    expect(calls).toContain(`implementer:${agent}`);
    expect(calls).toContain(`adversary-2:${agent}`);
    expect(calls.some(call => call.endsWith(':claude'))).toBe(false);
  });

  it('assigns Cursor and OpenCode distinct prototype and review roles', async () => {
    const draft: FactoryDraft = { ...completed, agents: ['cursor', 'opencode'], workflow: 'prototype' };
    const { calls } = await runFactory([true], true, matchingIssue, draft);
    expect(calls).toContain('prototype-1:cursor');
    expect(calls).toContain('prototype-2:opencode');
    expect(calls).toContain('prototype-3:cursor');
    expect(calls).toContain('comparator:opencode');
    expect(calls).toContain('implementer:cursor');
  });

  it('restores incomplete drafts to the first unanswered question', () => {
    expect(readFactoryDraft(JSON.stringify({ ...completed, agents: [] }))?.step).toBe(1);
    expect(readFactoryDraft(JSON.stringify({ ...completed, agents: ['unknown'] }))).toBeNull();
    expect(canContinue(DEFAULT_FACTORY)).toBe(false);
    expect(canContinue({ ...completed, step: 2, task: '  ' })).toBe(true);
  });

  it('remembers Pi and write-in preferences without using unsupported CLIs', () => {
    const draft: FactoryDraft = { ...completed, agents: ['pi'], otherAgent: 'My custom agent', step: 1 };
    expect(readFactoryDraft(JSON.stringify(draft))).toEqual(draft);
    expect(canContinue(draft)).toBe(true);
    const writeInOnly = { ...draft, agents: [] };
    expect(canContinue(writeInOnly)).toBe(true);
    expect(factorySource(writeInOnly)).toContain('const builder = "claude"');
    expect(factorySource(writeInOnly)).not.toContain('My custom agent');
    expect(factorySource(draft)).not.toContain('cli: "pi"');
    expect(canContinue({ ...writeInOnly, otherAgent: '  ' })).toBe(false);
    const unchecked = { ...writeInOnly, otherAgentSelected: false };
    expect(canContinue(unchecked)).toBe(false);
    expect(factorySource(unchecked)).not.toContain('const builder');
    expect(readFactoryDraft(JSON.stringify(unchecked))?.otherAgentSelected).toBe(false);
    expect(canContinue({ ...unchecked, otherAgentSelected: true })).toBe(true);
  });

  it('restores older drafts and validates the write-in name', () => {
    const { otherAgent, ...olderDraft } = completed;
    expect(readFactoryDraft(JSON.stringify(olderDraft))?.otherAgent).toBe('');
    for (const value of [null, 7, 'x'.repeat(101)]) {
      expect(readFactoryDraft(JSON.stringify({ ...completed, otherAgent: value }))).toBeNull();
    }
  });

  it('escapes task text and keeps partial files syntactically valid', () => {
    for (let step = 0; step <= 3; step++) {
      const source = factorySource({ ...completed, task: 'Fix "login"\\nwith `quotes`', step });
      const file = ts.createSourceFile('draft.ts', source, ts.ScriptTarget.ES2022, true);
      expect((file as unknown as { parseDiagnostics: unknown[] }).parseDiagnostics).toEqual([]);
    }
  });

  it('migrates old drafts without losing previous answers', () => {
    const { sources, sourceSettings, ...oldDraft } = completed;
    const migrated = readFactoryDraft(JSON.stringify({ ...oldDraft, version: 2, step: 5 }));
    expect(migrated?.agents).toEqual(completed.agents);
    expect(migrated?.task).toBe(completed.task);
    expect(migrated?.sources).toEqual([]);
    expect(migrated?.step).toBe(0);
  });

  it('keeps source filters through a storage round trip and rejects invalid settings', () => {
    expect(readFactoryDraft(JSON.stringify(completed))).toEqual(completed);
    expect(readFactoryDraft(JSON.stringify({ ...completed, sourceSettings: { github: { channel: 'bad' } } }))).toBeNull();
    expect(readFactoryDraft(JSON.stringify({ ...completed, sources: ['unknown'] }))).toBeNull();
    expect(readFactoryDraft(JSON.stringify({ ...completed, sourceSettings: { slack: { mentioned: 'true' } } }))).toBeNull();
  });

  it('leaves ticket filtering to Cloud dispatch and guards only the ticket itself', async () => {
    // A Cloud deployment is filtered before a run exists: the listener's watch
    // rules choose which tickets wake the flow, and the launcher re-checks every
    // configured field. Repeating that here only gave a run a way to cancel
    // itself with a bare "canceled" and no reason, so the deployed flow now
    // trusts dispatch. Filtering is still generated and tested for local runs
    // (flow-sources.test.ts and flow-local.test.ts), where nothing else does it.
    const source = factorySource(completed);
    expect(source).not.toContain('issueRejection');
    expect(source).not.toContain('acme/app');
    for (const issue of [
      { ...matchingIssue, source: 'linear' },
      { ...matchingIssue, repository: 'acme/other' },
      { ...matchingIssue, labels: ['ready'] },
      { ...matchingIssue, labels: ['BUG', ' Ready '] },
    ]) {
      expect((await runFactory([true, true], true, issue)).finish).toBe('needs_human');
    }
    // A ticket that never really arrived still stops the run before any agent.
    const empty = await runFactory([true], true, { ...matchingIssue, title: '  ' });
    expect(empty.calls).toEqual([]);
    // Parked, not canceled, and permanently so: the runtime refuses
    // done("canceled") by design, because cancellation is a kernel fact a flow
    // body cannot declare (AgentWorkforce/flows#436 lowered `step_failed` and
    // kept `canceled` refused). The reason this guard wants is a declination —
    // `declined`, proposed in AgentWorkforce/flows#438 and unshipped. The run
    // still says why it stopped, so nothing reads as work that landed.
    expect(empty.finish).toBe('needs_human');
    expect(withoutComments(source)).not.toContain('f.done("canceled")');
  });

  it('gives Cloud flows a wall-clock budget so unpriced agents are never refused', () => {
    for (const agents of [['claude', 'codex'], ['codex'], ['claude']] as FactoryDraft['agents'][]) {
      const source = factorySource({ ...completed, agents });
      expect(source).toContain('{ budget: { wallclock: "1h" } }');
      expect(source).not.toMatch(/budget: "\$\d/);
    }
  });

  it('carries the complete flow to Cloud without putting its contents in a query', () => {
    const draft: FactoryDraft = { ...DEFAULT_FACTORY, sources: ['github'], sourceSettings: { github: { repository: 'org/repo', labels: 'ready' } }, agents: ['codex'], task: 'Keep naïve input & labels', workflow: 'traditional', step: 3 };
    const url = new URL(cloudConnectionsHref(draft, '00000000-0000-4000-8000-000000000001'));
    expect(url.origin).toBe('https://agentrelay.com');
    expect(url.pathname).toBe('/cloud/flows/deploy');
    expect(url.search).toBe('');
    const payload = JSON.parse(decodeURIComponent(url.hash.slice(1)));
    expect(payload.source).toBe(factorySource(draft));
    expect(payload.sourceSettings).toEqual(draft.sourceSettings);
    expect(payload.agents).toEqual(['codex']);
    expect(payload.task).toBe(draft.task);
    expect(payload.handoffId).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('stops a Markdown-only draft before Cloud, and lets a co-selected source through', () => {
    const markdownOnly: FactoryDraft = { ...completed, sources: ['markdown'], sourceSettings: { markdown: { path: 'tasks.md' } } };
    // Markdown is read by a run, so a Markdown-only flow has nothing to wake a
    // Cloud listener. Cloud refuses it at the deploy step; without this the
    // person gets there through Google sign-in, a GitHub App and a model
    // choice first. Same words as Cloud's wizard, so the two surfaces agree.
    expect(isMarkdownOnly(markdownOnly)).toBe(true);
    expect(cloudBlockedReason(markdownOnly)).toBe(MARKDOWN_ONLY_CLOUD_NOTE);
    expect(MARKDOWN_ONLY_CLOUD_NOTE).toContain('Markdown files are not a live source');
    // The negative that matters: Markdown beside a real ticket source is a
    // legitimate deploy. Cloud drops markdown and listens to the other source,
    // so blocking this would refuse a configuration that works.
    for (const sources of [['markdown', 'linear'], ['linear', 'markdown'], ['github'], []] as FactoryDraft['sources'][]) {
      expect(cloudBlockedReason({ ...markdownOnly, sources })).toBe('');
      expect(isMarkdownOnly({ ...markdownOnly, sources })).toBe(false);
    }
    const withLinear: FactoryDraft = { ...markdownOnly, sources: ['markdown', 'linear'], sourceSettings: { markdown: { path: 'tasks.md' }, linear: { team: 'Engineering' } } };
    const payload = JSON.parse(decodeURIComponent(new URL(cloudConnectionsHref(withLinear, 'id')).hash.slice(1)));
    expect(payload.sources).toEqual(['markdown', 'linear']);
    expect(payload.sourceSettings.linear).toEqual({ team: 'Engineering' });
  });

  it('reads a Markdown task without an external source connection and quotes the path', async () => {
    const path = "docs/team's $(touch nope).md";
    const draft: FactoryDraft = { ...DEFAULT_FACTORY, sources: ['markdown', 'github'],
      sourceSettings: { markdown: { path } }, agents: ['claude'], task: 'Implement this task', workflow: 'simple', step: 2 };
    expect(readFactoryDraft(JSON.stringify(draft))?.sources).toEqual(['markdown', 'github']);
    // Markdown next to a ticket source is the fallback, not an override: the
    // kit prefills GitHub's ticket, and the Markdown branch still runs when
    // flow-input.json carries no issue. Both are executed below.
    expect(localInput(draft).issue).toMatchObject({ source: 'github' });
    expect(localInput({ ...draft, sources: ['markdown'] })).toEqual({ approver: 'local' });
    const compiled = ts.transpileModule(factorySource(draft).replace('import { flow } from "@relayflows/surface";', ''), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    });
    const exports: { default?: (ctx: unknown, input: unknown) => Promise<void> } = {};
    new Function('exports', 'flow', compiled.outputText)(exports, (_name: string, _options: unknown, body: unknown) => body);
    const commands: string[] = [];
    const tasks: string[] = [];
    const ctx = {
      run: async (command: string) => { commands.push(command); return '# Fix the login bug'; },
      agent: async (_name: string, options: { task: string }) => { tasks.push(options.task); },
      done: () => {},
    };
    await exports.default!(ctx, { approver: 'owner' });
    expect(commands[0]).toBe("cat -- 'docs/team'\\''s $(touch nope).md'");
    expect(tasks[0]).toContain('# Fix the login bug');
    commands.length = 0;
    tasks.length = 0;
    await exports.default!(ctx, { issue: matchingIssue, approver: 'owner' });
    expect(commands.some(command => command.startsWith('cat --'))).toBe(false);
    expect(tasks[0]).toContain(matchingIssue.body);
  });

  it('revises a failed review, retests, then asks for human approval', async () => {
    const { calls, finish } = await runFactory([false, true]);
    expect(calls.filter(call => call.startsWith('adversary-'))).toHaveLength(2);
    expect(calls).toContain('fixer:claude');
    expect(calls.filter(call => call === FLOW_CHECK_RUN_COMMAND)).toHaveLength(2);
    expect(calls).not.toContain('human');
    expect(finish).toBe('needs_human');
  });

  it('opens no pull request, and pushes nothing, when the agents made no commits', async () => {
    // Diagnosed from a real run. The agent step SUCCEEDED and reported "I did
    // not make any changes... there is no docs/ directory"; the push step then
    // pushed the unchanged base commit, and `gh pr create --body-file
    // summary.md` died with `open summary.md: no such file or directory`. The
    // operator saw only an opaque protocol_error. An agent that correctly does
    // nothing is a legitimate outcome: it is not a pull request, and a branch
    // pushed at the base commit is not worth leaving behind either.
    const { calls, finish, errors } = await runFactory([true, true], true, matchingIssue, completed, 'no-commits');
    expect(calls.some(call => call.startsWith('gh pr create'))).toBe(false);
    expect(calls.some(call => call.startsWith('git push'))).toBe(false);
    expect(finish).toBe('needs_human');
    // The reason reaches the operator, so "nothing was built" is never silent.
    expect(errors.join('\n')).toContain('no commits');
  });

  it('pushes the work but opens no pull request when no summary.md was written', async () => {
    // Commits exist, so the work is real and worth pushing; the pull request
    // body is what is missing, and `gh pr create --body-file summary.md` would
    // fail on exactly that.
    const { calls, finish, errors } = await runFactory([true, true], true, matchingIssue, completed, 'no-summary');
    expect(calls).toContain('git push --set-upstream origin HEAD');
    expect(calls.some(call => call.startsWith('gh pr create'))).toBe(false);
    expect(finish).toBe('needs_human');
    expect(errors.join('\n')).toContain('summary.md');
  });

  it('treats a publish verdict it does not recognise as nothing to publish', async () => {
    // The check always exits 0 and prints one known token. If it ever prints
    // anything else, the flow must not push a branch or open a pull request on
    // the strength of output it did not understand.
    const { calls, finish } = await runFactory([true, true], true, matchingIssue, completed, 'unexpected output');
    expect(calls.some(call => call.startsWith('git push'))).toBe(false);
    expect(calls.some(call => call.startsWith('gh pr create'))).toBe(false);
    expect(finish).toBe('needs_human');
  });

  it('tests and pushes the branch before opening its pull request', async () => {
    const { calls } = await runFactory([true]);
    const push = calls.indexOf('git push --set-upstream origin HEAD');
    const create = calls.findIndex(call => call.startsWith('gh pr create'));
    expect(push).toBeGreaterThan(calls.indexOf(FLOW_CHECK_RUN_COMMAND));
    expect(create).toBeGreaterThan(push);
    expect(calls.indexOf('adversary-1:codex')).toBeGreaterThan(create);
  });

  it('marks the pull request and parks, never approves, if all reviews fail', async () => {
    const { calls, finish } = await runFactory([false, false, false]);
    expect(calls.filter(call => call.startsWith('adversary-'))).toHaveLength(2);
    expect(calls).not.toContain('human');
    // done("step_failed") is the honest reason, and as of the 2.0.15 pin the
    // runtime lowers it (AgentWorkforce/flows#436). Before that it did not: a
    // real run did all 15 steps, opened AgentWorkforce/cloud-e2e-sandbox#25,
    // and then died as FAILED [protocol_error] unsupported_completion — the one
    // outcome that tells an operator nothing. The reason is back, and the pull
    // request still carries the findings, which no exit code can.
    expect(finish).toBe('step_failed');
    expect(calls).toContain(FLOW_REVIEW_BLOCKED_COMMAND);
    expect(calls.indexOf(FLOW_REVIEW_BLOCKED_COMMAND)).toBeGreaterThan(calls.lastIndexOf('adversary-2:codex'));
    expect(withoutComments(factorySource(completed))).toContain('f.done("step_failed")');
    // Named in the generated flow itself, so a reader meets the release that
    // made the honest reason lowerable rather than guessing.
    expect(factorySource(completed)).toContain('AgentWorkforce/flows#436');
  });

  it('hands every preset to a person without calling an unsupported interactive gate or merging', async () => {
    for (const workflow of ['traditional', 'prototype', 'simple'] as const) {
      const { calls, finish } = await runFactory([true, true], true, matchingIssue, { ...completed, workflow });
      expect(finish).toBe('needs_human');
      // The paired negative for the failed-review case above: a clean run parks
      // with the same reason, so the difference has to be visible somewhere. It
      // is — a clean run never marks the pull request as unapproved.
      expect(calls).not.toContain(FLOW_REVIEW_BLOCKED_COMMAND);
      expect(calls.some(call => call.includes('pr merge'))).toBe(false);
      expect(factorySource({ ...completed, workflow })).not.toContain('f.human(');
      expect(calls).toContain(FLOW_CHECK_RUN_COMMAND);
      expect(calls.some(call => call.startsWith('gh pr create'))).toBe(true);
    }
  });

  it('always runs both reviews after the plan and implementation', async () => {
    const { calls, finish } = await runFactory([true, true]);
    expect(calls.filter(call => /^(planner|plan-reviewer|implementer|adversary-)/.test(call))).toEqual([
      'planner:claude', 'plan-reviewer:codex', 'implementer:claude', 'adversary-1:codex', 'adversary-2:codex',
    ]);
    expect(calls).not.toContain('fixer:claude');
    expect(finish).toBe('needs_human');
  });

  it('waits for three isolated prototypes before comparing, building and reviewing', async () => {
    const { calls, finish } = await runFactory([true], true, matchingIssue, { ...completed, workflow: 'prototype' });
    const finished = calls.filter(call => call.startsWith('finished:'));
    expect(finished).toHaveLength(3);
    expect(new Set(finished.map(call => call.split(':').at(-1))).size).toBe(3);
    expect(calls.filter(call => call.startsWith('git worktree add --detach'))).toHaveLength(3);
    for (const call of finished) expect(calls.indexOf(call)).toBeLessThan(calls.indexOf('comparator:codex'));
    expect(calls.indexOf('comparator:codex')).toBeLessThan(calls.indexOf('implementer:claude'));
    expect(calls.some(call => call.startsWith('synthesizer:'))).toBe(false);
    const source = factorySource({ ...completed, workflow: 'prototype' });
    expect(source).not.toContain('best-plan.md');
    expect(source).toContain('Read comparison.md and inspect the prototype implementations');
    expect(calls).toContain('adversary-1:codex');
    expect(calls).not.toContain('human');
    expect(finish).toBe('needs_human');
  });

  it('rotates the selected agents across prototypes in selection order', async () => {
    for (const [agents, expected] of [
      [['claude', 'codex'], ['claude', 'codex', 'claude']],
      [['codex', 'claude'], ['codex', 'claude', 'codex']],
      [['codex'], ['codex', 'codex', 'codex']],
      [['claude'], ['claude', 'claude', 'claude']],
    ] as const) {
      const { calls } = await runFactory([true], true, matchingIssue, { ...completed, workflow: 'prototype', agents: [...agents] });
      expect(calls.filter(call => call.startsWith('prototype-'))).toEqual(expected.map((agent, i) => `prototype-${i + 1}:${agent}`));
    }
  });

  describe('checks', () => {
    const reportCall = (calls: string[]) => calls.find(call => call.startsWith('check=')) ?? '';
    const createCall = (calls: string[]) => calls.find(call => call.startsWith('gh pr create')) ?? '';

    it('works out how to check the repository before the change, and excludes working files first', async () => {
      const { calls } = await runFactory([true, true]);
      expect(calls[0]).toContain('# relayflow working files');
      expect(calls.indexOf('check-discovery:claude')).toBeLessThan(calls.indexOf('implementer:claude'));
      expect(calls.indexOf('check-discovery:claude')).toBeGreaterThan(calls.indexOf('plan-reviewer:codex'));
    });

    it('uses the author\'s checkCommand instead of discovering one', async () => {
      const { calls } = await runFactory([true, true], true, matchingIssue, completed, 'publish', [], 'pass',
        source => source.replace('const checkCommand = "";', 'const checkCommand = "npm run build:core && npm test";'));
      expect(calls).not.toContain('check-discovery:claude');
      expect(calls).toContain("mkdir -p .relayflow && printf '%s\\n' 'set -e' 'npm run build:core && npm test' > .relayflow/check.sh");
    });

    it('opens a ready pull request when the checks pass, with the report as its body', async () => {
      const { calls, finish } = await runFactory([true, true]);
      expect(calls.filter(call => call.startsWith('check-repair'))).toEqual([]);
      expect(calls.some(call => call.endsWith(FLOW_BASE_CHECK_COMMAND))).toBe(false);
      expect(reportCall(calls)).toMatch(/^check=pass; baseline=; /);
      expect(createCall(calls)).toBe('gh pr create --title "Software factory change" --body-file .relayflow/pr-body.md');
      expect(finish).toBe('needs_human');
    });

    it('repairs missing setup and carries on as if the checks had passed', async () => {
      // acbe30c1's shape: the first run fails for want of a build step, the
      // repair agent adds it to the check script, and the rerun passes.
      const { calls, finish } = await runFactory([true, true], true, matchingIssue, completed, 'publish', ['fail', 'pass']);
      expect(calls.filter(call => call.startsWith('check-repair'))).toEqual(['check-repair-1:claude']);
      expect(calls.some(call => call.endsWith(FLOW_BASE_CHECK_COMMAND))).toBe(false);
      expect(createCall(calls)).not.toContain('--draft');
      expect(calls).toContain('adversary-1:codex');
      expect(finish).toBe('needs_human');
    });

    it('opens a draft and keeps reviewing when the base commit fails the same checks', async () => {
      // 139d1a46's shape: the failure is the environment's, not the change's.
      const { calls, finish, errors } = await runFactory([true, true], true, matchingIssue, completed, 'publish', ['fail', 'fail', 'fail'], 'fail');
      expect(calls.filter(call => call.startsWith('check-repair'))).toHaveLength(2);
      expect(calls.find(call => call.endsWith(FLOW_BASE_CHECK_COMMAND))).toBe('base=abc123; ' + FLOW_BASE_CHECK_COMMAND);
      expect(reportCall(calls)).toMatch(/^check=fail; baseline=fail; /);
      expect(createCall(calls)).toContain('--draft');
      expect(calls).toContain('git push --set-upstream origin HEAD');
      expect(calls).toContain('adversary-2:codex');
      expect(finish).toBe('needs_human');
      expect(errors.join('\n')).toContain('not because of this change');
    });

    it('opens a draft with the output and stops as step_failed when the change broke the checks', async () => {
      const { calls, finish, errors } = await runFactory([true, true], true, matchingIssue, completed, 'publish', ['fail', 'fail', 'fail'], 'pass');
      expect(reportCall(calls)).toMatch(/^check=fail; baseline=pass; /);
      expect(createCall(calls)).toContain('--draft');
      // The work is pushed, never thrown away; the reviews are not worth running.
      expect(calls).toContain('git push --set-upstream origin HEAD');
      expect(calls.some(call => call.startsWith('adversary-'))).toBe(false);
      expect(finish).toBe('step_failed');
      expect(errors.join('\n')).toContain('breaks checks that pass on the base commit');
    });

    it('treats a timeout like a failure and an unrecognised answer as one too', async () => {
      const timedOut = await runFactory([true, true], true, matchingIssue, completed, 'publish', ['timeout', 'pass']);
      expect(timedOut.calls).toContain('check-repair-1:claude');
      const garbled = await runFactory([true, true], true, matchingIssue, completed, 'publish', ['???', 'pass']);
      expect(garbled.calls).toContain('check-repair-1:claude');
    });

    it('says so, and still opens a ready pull request, when there is nothing to run', async () => {
      const { calls, finish } = await runFactory([true, true], true, matchingIssue, completed, 'publish', ['none']);
      expect(calls.filter(call => call.startsWith('check-repair'))).toEqual([]);
      expect(reportCall(calls)).toMatch(/^check=none; baseline=; /);
      expect(createCall(calls)).not.toContain('--draft');
      expect(finish).toBe('needs_human');
    });

    it('drops committed working files before deciding what to publish, and before every push', async () => {
      const { calls } = await runFactory([false, true]);
      const drops = calls.flatMap((call, index) => call.endsWith(FLOW_DROP_WORKING_FILES_COMMAND) ? [index] : []);
      expect(drops).toHaveLength(2);
      expect(drops[0]).toBeLessThan(calls.findIndex(call => call.endsWith(FLOW_PUBLISH_CHECK_COMMAND)));
      expect(drops[1]).toBeLessThan(calls.indexOf('git push'));
      expect(drops[1]).toBeGreaterThan(calls.indexOf('fixer:claude'));
    });

    it('pushes a review fix that breaks passing checks, then drafts the pull request and stops', async () => {
      const { calls, finish } = await runFactory([false, true], true, matchingIssue, completed, 'publish', ['pass', 'fail', 'fail', 'fail']);
      expect(calls).toContain('git push');
      expect(calls.indexOf(FLOW_CHECK_BLOCKED_COMMAND)).toBeGreaterThan(calls.indexOf('git push'));
      expect(calls.filter(call => call.startsWith('check=')).at(-1)).toMatch(/^check=fail; baseline=revision; /);
      expect(calls).not.toContain('adversary-2:codex');
      expect(finish).toBe('step_failed');
    });
  });

  it('simple skips agent reviews but still hands off for human approval and all presets persist', async () => {
    const { calls, finish } = await runFactory([], true, matchingIssue, { ...completed, workflow: 'simple' });
    // The only agent besides the implementer works out how to run the checks.
    expect(calls.filter(call => /:(claude|codex)$/.test(call))).toEqual(['check-discovery:claude', 'implementer:claude']);
    expect(calls).not.toContain('human');
    expect(finish).toBe('needs_human');
    for (const workflow of ['traditional', 'prototype', 'simple'] as const) {
      const draft = { ...completed, workflow, task: 'Quotes " and backticks `' };
      expect(readFactoryDraft(JSON.stringify(draft))).toEqual(draft);
      const file = ts.createSourceFile('draft.ts', factorySource(draft), ts.ScriptTarget.ES2022, true);
      expect((file as unknown as { parseDiagnostics: unknown[] }).parseDiagnostics).toEqual([]);
    }
  });

  it('migrates v3 preferences without preselecting a workflow', () => {
    expect(readFactoryDraft(JSON.stringify({ ...completed, version: 3, step: 6, reviewer: 'codex', rounds: 5, approval: true })))
      .toEqual({ ...completed, workflow: null, step: 2 });
    expect(readFactoryDraft(JSON.stringify({ ...completed, workflow: 'unknown' }))).toBeNull();
  });
});
