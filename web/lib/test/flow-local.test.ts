import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import ts from 'typescript';
import { DEFAULT_FACTORY, factorySource, type FactoryDraft } from '../flow-onboarding';
import { LOCAL_INSTALL, LOCAL_RUN, localInput, localKitArchive, localKitFiles } from '../flow-local';
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
    expect(Object.keys(unpacked).sort()).toEqual(['START-HERE.txt', 'flow-input.json', 'software-factory.flow.mts']);
    for (const [name, content] of Object.entries(files)) expect(strFromU8(unpacked[name])).toBe(content);
    expect(files['START-HERE.txt']).toContain(LOCAL_INSTALL);
    expect(files['START-HERE.txt']).toContain(LOCAL_RUN);
    expect(LOCAL_RUN).toContain('--local-agent');
    expect(LOCAL_RUN).toContain('--input flow-input.json');
  });

  it('preserves issue filters and provides an editable one-ticket input', () => {
    expect(localInput(draft).issue).toMatchObject({ source: 'github', repository: 'acme/app', labels: ['bug', 'ready'] });
    const slack = { ...draft, sources: ['slack'] as const, sourceSettings: { slack: { channel: '#build', contains: 'Please fix', mentioned: true } } };
    expect(localInput({ ...slack, sources: [...slack.sources] }).issue).toMatchObject({ source: 'slack', title: 'Please fix', channel: '#build', mentioned: true });
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
