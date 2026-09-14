import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { cloudConnectionsHref, DEFAULT_FACTORY, factorySource, readFactoryDraft, canContinue, primaryAgent, onboardingPath, accessibleOnboardingStep, type FactoryDraft } from '../flow-onboarding';

const matchingIssue = { source: 'github', title: 'Fix login', body: 'Login fails', labels: ['ready', 'bug'], repository: 'acme/app' };

const completed: FactoryDraft = { version: 3, sources: ['github'], sourceSettings: { github: { repository: 'acme/app', labels: 'ready, bug' } }, agents: ['claude'], otherAgent: '', task: 'Add a test', reviewer: 'codex', rounds: 3, approval: true, step: 6 };

async function runFactory(clean: boolean[], approved = true, issue = matchingIssue) {
  const calls: string[] = [];
  let finish = '';
  let index = 0;
  const source = factorySource(completed).replace('import { flow } from "@relayflows/surface";', '');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  const exports: { default?: (ctx: unknown, input: unknown) => Promise<void> } = {};
  new Function('exports', 'flow', compiled.outputText)(exports, (_name: string, _options: unknown, body: unknown) => body);
  await exports.default!({
    agent: async (name: string, options: { cli: string }) => { calls.push(`${name}:${options.cli}`); },
    run: async (command: string) => { calls.push(command); return command.startsWith('test -f') ? (clean[index++] ? 'yes' : 'no') : ''; },
    human: async () => { calls.push('human'); return approved; },
    done: (reason: string) => { finish = reason; },
  }, { issue, approver: 'owner' });
  return { calls, finish };
}

describe('software factory onboarding', () => {
  it('gives the introduction and final handoff distinct routes', () => {
    expect(onboardingPath(-1)).toBe('/flows/onboarding');
    expect(onboardingPath(0)).toBe('/flows/onboarding/sources');
    expect(onboardingPath(1)).toBe('/flows/onboarding/agents');
    expect(onboardingPath(6)).toBe('/flows/onboarding/connections');
  });

  it('guards direct links using prerequisite answers, not the saved page', () => {
    expect(accessibleOnboardingStep(DEFAULT_FACTORY, 6)).toBe(0);
    expect(accessibleOnboardingStep({ ...completed, task: '' }, 6)).toBe(2);
    expect(accessibleOnboardingStep({ ...completed, approval: false }, 6)).toBe(5);
    expect(accessibleOnboardingStep({ ...completed, step: 0 }, 6)).toBe(6);
    expect(accessibleOnboardingStep(completed, 0)).toBe(0);
    expect(accessibleOnboardingStep(completed, -1)).toBe(-1);
  });

  it('rejects corrupt and unsupported persisted drafts', () => {
    for (const raw of [null, '{', '{}', '{"version":1,"agent":"shell","rounds":3}', '{"version":1,"agent":"claude","rounds":999}']) {
      expect(readFactoryDraft(raw)).toBeNull();
    }
    expect(readFactoryDraft(JSON.stringify(DEFAULT_FACTORY))).toEqual(DEFAULT_FACTORY);
  });

  it('reveals code only after each answer and never leaks future steps', () => {
    expect(factorySource(DEFAULT_FACTORY)).not.toContain('f.agent');
    const agents: FactoryDraft = { ...DEFAULT_FACTORY, sources: ['github'], agents: ['claude', 'cursor'], step: 1 };
    expect(factorySource(agents)).toContain('const builder = "claude"');
    expect(factorySource(agents)).not.toContain('implementer');
    const task = { ...agents, task: 'Fix the login bug', step: 2 };
    expect(factorySource(task)).toContain('gh pr create');
    expect(factorySource(task)).not.toContain('adversary');
    const review: FactoryDraft = { ...task, reviewer: 'codex', step: 3 };
    expect(factorySource(review)).toContain('adversary');
    expect(factorySource(review)).not.toContain('for (let round');
    expect(factorySource({ ...completed, step: 4 })).not.toContain('f.human');
    expect(factorySource(completed)).toContain('f.human');
    expect(factorySource(completed)).not.toContain('Your next answer');
  });

  it('lets upcoming-only selections continue using a supported example', () => {
    const draft: FactoryDraft = { ...DEFAULT_FACTORY, sources: ['github'], agents: ['cursor', 'gemini'], step: 1 };
    expect(canContinue(draft)).toBe(true);
    expect(primaryAgent(draft)).toBe('claude');
    expect(factorySource(draft)).not.toContain('cli: "cursor"');
    expect(readFactoryDraft(JSON.stringify(draft))?.agents).toEqual(['cursor', 'gemini']);
  });

  it('restores incomplete drafts to the first unanswered question', () => {
    expect(readFactoryDraft(JSON.stringify({ ...completed, task: '' }))?.step).toBe(2);
    expect(readFactoryDraft(JSON.stringify({ ...completed, agents: ['unknown'] }))).toBeNull();
    expect(canContinue(DEFAULT_FACTORY)).toBe(false);
    expect(canContinue({ ...completed, step: 2, task: '  ' })).toBe(false);
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
    for (let step = 0; step <= 6; step++) {
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

  it('never runs agents for tickets outside the chosen filters', async () => {
    for (const issue of [
      { ...matchingIssue, source: 'linear' },
      { ...matchingIssue, repository: 'acme/other' },
      { ...matchingIssue, labels: ['ready'] },
    ]) {
      const result = await runFactory([true], true, issue);
      expect(result.calls).toEqual([]);
      expect(result.finish).toBe('canceled');
    }
    expect((await runFactory([true], true, { ...matchingIssue, labels: ['BUG', ' Ready '] })).finish).toBe('success');
  });

  it('returns Google sign-in to the actual Cloud integrations route', () => {
    const url = new URL(cloudConnectionsHref());
    expect(url.origin).toBe('https://agentrelay.com');
    expect(url.pathname).toBe('/cloud/api/auth/google/start');
    expect(url.searchParams.get('next')).toBe('/integrations');
  });

  it('reads a Markdown task without an external source connection and quotes the path', async () => {
    const path = "docs/team's $(touch nope).md";
    const draft: FactoryDraft = { ...DEFAULT_FACTORY, sources: ['markdown', 'github'],
      sourceSettings: { markdown: { path } }, agents: ['claude'], task: 'Implement this task', step: 2 };
    expect(readFactoryDraft(JSON.stringify(draft))?.sources).toEqual(['markdown', 'github']);
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
    expect(calls.filter(call => call.startsWith('adversary:'))).toHaveLength(2);
    expect(calls).toContain('fixer:claude');
    expect(calls.filter(call => call === 'npm test')).toHaveLength(2);
    expect(calls.at(-1)).toBe('human');
    expect(finish).toBe('success');
  });

  it('tests and pushes the branch before opening its pull request', async () => {
    const { calls } = await runFactory([true]);
    const push = calls.indexOf('git push --set-upstream origin HEAD');
    const create = calls.findIndex(call => call.startsWith('gh pr create'));
    expect(push).toBeGreaterThan(calls.indexOf('npm test'));
    expect(create).toBeGreaterThan(push);
    expect(calls.indexOf('adversary:codex')).toBeGreaterThan(create);
  });

  it('never reaches approval if all reviews fail', async () => {
    const { calls, finish } = await runFactory([false, false, false]);
    expect(calls.filter(call => call.startsWith('adversary:'))).toHaveLength(3);
    expect(calls).not.toContain('human');
    expect(finish).toBe('step_failed');
  });

  it('stops on human rejection and never runs a merge command', async () => {
    const { calls, finish } = await runFactory([true], false);
    expect(finish).toBe('canceled');
    expect(calls.some(call => call.includes('pr merge'))).toBe(false);
  });

  it('switches implementer and adversary when Codex is selected', () => {
    const source = factorySource({ ...completed, agents: ['codex'], reviewer: 'claude', rounds: 5 });
    expect(source).toContain('const builder = "codex";');
    expect(source).toMatch(/agent\("adversary", \{\s+cli: "claude"/);
    expect(source).toContain('round < 5');
  });
});
