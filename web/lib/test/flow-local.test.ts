import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import ts from 'typescript';
import { DEFAULT_FACTORY, factorySource, type FactoryDraft } from '../flow-onboarding';
import { LOCAL_INSTALL, LOCAL_PREFLIGHT, LOCAL_RUN, PLACEHOLDER_BODY, PLACEHOLDER_TITLE, RELAYFLOWS_VERSION, localInput, localKitArchive, localKitFiles } from '../flow-local';
import { FLOW_TEST_COMMAND } from '../flow-workflows';

const draft: FactoryDraft = { ...DEFAULT_FACTORY, sources: ['github'], sourceSettings: { github: { repository: 'acme/app', labels: 'bug, ready' } }, agents: ['claude', 'codex'], workflow: 'traditional', step: 3 };

function compile(source: string) {
  const exports: { default?: (f: unknown, input: unknown) => Promise<void> } = {};
  const compiled = ts.transpileModule(source.replace('import { flow } from "@relayflows/surface";', ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  new Function('exports', 'flow', compiled.outputText)(exports, (_name: string, _header: unknown, fn: unknown) => fn);
  return exports.default!;
}

describe('local flow starter kit', () => {
  it('creates a readable zip with a flow, input, and instructions', () => {
    const files = localKitFiles(draft);
    const unpacked = unzipSync(localKitArchive(draft));
    expect(Object.keys(unpacked).sort()).toEqual(['START-HERE.txt', 'flow-input.json', 'relay-preflight.mjs', 'software-factory.flow.mts']);
    for (const [name, content] of Object.entries(files)) expect(strFromU8(unpacked[name])).toBe(content);
    expect(files['START-HERE.txt']).toContain(LOCAL_INSTALL);
    expect(files['START-HERE.txt']).toContain(LOCAL_RUN);
    expect(LOCAL_RUN).toContain('--local-agent');
    expect(LOCAL_RUN).toContain('--input flow-input.json');
  });

  it('pins a Flows CLI new enough to run its own authored TypeScript flow', () => {
    // 2.0.9 linked `flows` to the prebuilt runtime binary, which cannot resolve
    // @relayflows/surface from a .flow.mts, and shipped a `flows check` with no
    // TypeScript path at all — so step 4 always died on "contains invalid YAML
    // or JSON" before the run started. Verified fixed in 2.0.12.
    expect(LOCAL_INSTALL).toContain(`relayflows@${RELAYFLOWS_VERSION}`);
    expect(LOCAL_INSTALL).toContain(`@relayflows/surface@${RELAYFLOWS_VERSION}`);
    expect(RELAYFLOWS_VERSION).toBe('2.0.12');
  });

  it('runs preconditions and the spec check before the flow itself', () => {
    const steps = LOCAL_RUN.split('&&').map(step => step.trim());
    expect(steps[0]).toBe('git switch -c relay/first-flow');
    expect(steps[1]).toBe(`node ${LOCAL_PREFLIGHT}`);
    expect(steps[2]).toBe('npx flows check software-factory.flow.mts');
    expect(steps.at(-1)).toBe('npx flows run --local-agent software-factory.flow.mts --input flow-input.json');
    expect(localKitFiles(draft)['START-HERE.txt']).toContain(LOCAL_PREFLIGHT);
  });

  it('checks the placeholder with the exact sentinel the kit writes', () => {
    const script = localKitFiles(draft)[LOCAL_PREFLIGHT];
    const { issue } = localInput(draft) as { issue: { title: string; body: string } };
    // Drift between the two is the bug this guards: if the sentinel stops
    // matching what localInput prefills, an unedited ticket reaches an agent.
    expect(issue.body).toBe(PLACEHOLDER_BODY);
    expect(issue.title).toBe(PLACEHOLDER_TITLE);
    expect(script).toContain(JSON.stringify(PLACEHOLDER_BODY));
    // body, not title: a `contains` filter overwrites title at build time.
    const filtered = { ...draft, sourceSettings: { github: { repository: 'acme/app', contains: 'Please fix' } } };
    const contains = localInput(filtered) as { issue: { title: string; body: string } };
    expect(contains.issue.title).toBe('Please fix');
    expect(contains.issue.body).toBe(PLACEHOLDER_BODY);
    expect(script).toContain('const untouched = issue.body === PLACEHOLDER_BODY;');
  });

  it('prompts on a terminal and fails fast without one instead of hanging', () => {
    const script = localKitFiles(draft)[LOCAL_PREFLIGHT];
    expect(script).toContain('createInterface');
    expect(script).toContain('untouched && !process.stdin.isTTY');
    // The non-interactive refusal has to name the file and both fields.
    expect(script).toContain('Set issue.title and issue.body to the real ticket');
    expect(script).toContain('writeFileSync(INPUT, JSON.stringify(input, null, 2)');
  });

  it('fails fast on a throwaway repo, a missing origin or no gh sign-in', () => {
    const script = localKitFiles(draft)[LOCAL_PREFLIGHT];
    expect(script).toContain('git("rev-parse", "--is-inside-work-tree")');
    expect(script).toContain('git("remote", "get-url", "origin")');
    expect(script).toContain('execFileSync("gh", ["auth", "status"]');
    expect(script).toContain('git("status", "--porcelain")');
    // execFile, never a shell: repository paths contain spaces and parentheses.
    expect(script).toContain('execFileSync');
    expect(script).not.toMatch(/\bexecSync\(/);
    // The kit's own files are not the user's uncommitted work.
    for (const name of Object.keys(localKitFiles(draft))) expect(script).toContain(`"${name}"`);
  });

  it('leaves a Markdown-sourced kit no placeholder ticket to prompt for', () => {
    const markdown: FactoryDraft = { ...draft, sources: ['markdown'], sourceSettings: { markdown: { path: 'docs/ticket.md' } } };
    expect(localInput(markdown)).not.toHaveProperty('issue');
    // The guard keys off input.issue, so the Markdown kit skips the prompt.
    expect(localKitFiles(markdown)[LOCAL_PREFLIGHT]).toContain('if (issue) {');
  });

  it('preserves issue filters and provides an editable one-ticket input', () => {
    expect(localInput(draft).issue).toMatchObject({ source: 'github', repository: 'acme/app', labels: ['bug', 'ready'] });
    const slack = { ...draft, sources: ['slack'] as const, sourceSettings: { slack: { channel: '#build', contains: 'Please fix', mentioned: true } } };
    expect(localInput({ ...slack, sources: [...slack.sources] }).issue).toMatchObject({ source: 'slack', title: 'Please fix', channel: '#build', mentioned: true });
  });

  it('says which filter turned a local ticket away instead of cancelling silently', async () => {
    const input = localInput(draft) as { approver: string; issue: Record<string, unknown> };
    const messages: string[] = [];
    const original = console.error;
    console.error = (message: string) => { messages.push(message); };
    const calls: string[] = [];
    let finish = '';
    try {
      await compile(localKitFiles(draft)['software-factory.flow.mts'])({
        agent: async (name: string) => { calls.push(name); },
        run: async () => '',
        done: (reason: string) => { finish = reason; },
      }, { ...input, issue: { ...input.issue, labels: ['ready'] } });
    } finally { console.error = original; }
    expect(finish).toBe('canceled');
    expect(calls).toEqual([]);
    expect(messages[0]).toContain('missing required label: bug');
    expect(messages[0]).toContain('flow-input.json');
  });

  it('does not overwrite the user’s Markdown task file', () => {
    const markdown: FactoryDraft = { ...draft, sources: ['markdown'], sourceSettings: { markdown: { path: 'docs/ticket.md' } } };
    expect(localInput(markdown)).toEqual({ approver: 'local' });
    expect(localKitFiles(markdown)).not.toHaveProperty('docs/ticket.md');
    expect(localKitFiles(markdown)['START-HERE.txt']).toContain('docs/ticket.md');
  });

  it('runs the traditional sequence and hands off for manual approval locally', async () => {
    const calls: string[] = [];
    let finish = '';
    await compile(localKitFiles(draft)['software-factory.flow.mts'])({
      agent: async (name: string) => { calls.push(name); },
      run: async (command: string) => command.startsWith('test -f') ? 'yes' : '',
      done: (reason: string) => { finish = reason; },
    }, localInput(draft));
    expect(calls).toEqual(['planner', 'plan-reviewer', 'implementer', 'adversary-1', 'adversary-2']);
    expect(finish).toBe('needs_human');
    expect(factorySource(draft)).toContain('return f.done("needs_human")');
    expect(factorySource(draft, 'local')).not.toContain('f.human(');
  });


  it('stops every preset for human review after tests and PR creation', async () => {
    for (const workflow of ['traditional', 'prototype', 'simple'] as const) {
      const commands: string[] = [];
      let finish = '';
      const selected = { ...draft, workflow };
      await compile(factorySource(selected, 'local'))({
        agent: async () => {},
        run: async (command: string) => { commands.push(command); return command.startsWith('test -f') ? 'yes' : ''; },
        done: (reason: string) => { finish = reason; },
      }, localInput(selected));
      expect(finish).toBe('needs_human');
      const testIndex = commands.indexOf(FLOW_TEST_COMMAND);
      const createIndex = commands.findIndex(command => command.startsWith('gh pr create'));
      expect(testIndex).toBeGreaterThanOrEqual(0);
      expect(createIndex).toBeGreaterThan(testIndex);
      expect(localKitFiles(selected)['START-HERE.txt']).toContain('require a pull request, an approving review, and passing CI status checks');
    }
  });

  it('does not publish a PR or signal readiness if scripted tests fail', async () => {
    for (const workflow of ['traditional', 'prototype', 'simple'] as const) {
      const commands: string[] = [];
      let finish = '';
      const selected = { ...draft, workflow };
      await expect(compile(factorySource(selected, 'local'))({
        agent: async () => {},
        run: async (command: string) => { commands.push(command); if (command === FLOW_TEST_COMMAND) throw Error('tests failed'); return ''; },
        done: (reason: string) => { finish = reason; },
      }, localInput(selected))).rejects.toThrow('tests failed');
      expect(commands.some(command => command.startsWith('git push') || command.startsWith('gh pr create'))).toBe(false);
      expect(finish).toBe('');
    }
  });

  it.each([false, true])('pushes fixer revisions only after passing tests (failure: %s)', async (fail) => {
    const calls: string[] = [];
    let checks = 0;
    const run = compile(factorySource(draft, 'local'))({
      agent: async (name: string, options: { task: string }) => {
        calls.push(name);
        if (name === 'fixer') expect(options.task).toContain('Commit fixes without pushing');
      },
      run: async (command: string) => {
        calls.push(command);
        if (command === FLOW_TEST_COMMAND && ++checks === 2 && fail) throw Error('revision failed');
        return command.startsWith('test -f') ? 'no' : '';
      },
      done: () => {},
    }, localInput(draft));
    if (fail) await expect(run).rejects.toThrow('revision failed');
    else await run;
    const fixer = calls.indexOf('fixer');
    expect(fixer).toBeGreaterThan(0);
    expect(calls[fixer + 1]).toBe(FLOW_TEST_COMMAND);
    if (fail) expect(calls).not.toContain('git push');
    else expect(calls[fixer + 2]).toBe('git push');
  });

  it('generates valid local source for every preset with an explicit runtime limit', () => {
    for (const workflow of ['traditional', 'prototype', 'simple'] as const) {
      const source = factorySource({ ...draft, workflow }, 'local');
      const file = ts.createSourceFile('local.flow.ts', source, ts.ScriptTarget.ES2022, true);
      expect((file as unknown as { parseDiagnostics: unknown[] }).parseDiagnostics).toEqual([]);
      expect(source).toContain('wallclock: "1h"');
      expect(source).not.toContain('$8/run');
      expect(source).not.toContain('pr merge');
    }
  });
});
