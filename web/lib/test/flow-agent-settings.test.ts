import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { DEFAULT_FACTORY, factorySource, readFactoryDraft, cloudConnectionsHref, type FactoryDraft } from '../flow-onboarding';
import { DEFAULT_AGENT_MODELS, resolveAgentSettings, resolveGeneratedAgentSettings } from '../flow-agent-settings';
import { localKitFiles } from '../flow-local';
import { FLOW_CHECK_RUN_COMMAND, FLOW_VALIDATE_CHANGE_METADATA_COMMAND } from '../flow-workflows';
import type { CodingAgent } from '../flow-agents';

const draft: FactoryDraft = { ...DEFAULT_FACTORY, sources: ['github'], agents: ['claude', 'codex', 'grok', 'cursor'], workflow: 'prototype', step: 3 };
type AgentOptions = { cli: CodingAgent; model?: string; task: string; cwd?: string };

async function execute(value: FactoryDraft, target: 'cloud' | 'local' = 'cloud') {
  const source = factorySource(value, target).replace('import { flow } from "@relayflows/surface";', '');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  const exports: { default?: (ctx: unknown, input: unknown) => Promise<void> } = {};
  new Function('exports', 'flow', compiled.outputText)(exports, (_name: string, _options: unknown, body: unknown) => body);
  const calls: Record<string, AgentOptions> = {};
  let checkRuns = 0;
  let reviewChecks = 0;
  await exports.default!({ agent: async (name: string, options: AgentOptions) => { calls[name] = options; },
    // "base=..." is the publish check; without a verdict it understands, the
    // flow correctly stops before the reviews rather than opening a pull
    // request for work that was never committed.
    run: async (command: string) => {
      if (command.endsWith(FLOW_VALIDATE_CHANGE_METADATA_COMMAND)) return 'valid';
      if (command === 'date +%s') return '0';
      if (command.endsWith(FLOW_CHECK_RUN_COMMAND)) return ++checkRuns <= 2 ? 'fail' : 'pass';
      if (command.startsWith('base=')) return 'publish';
      if (command.startsWith('mktemp')) return '/tmp/prototypes';
      if (command.includes('review.clean &&')) return ++reviewChecks === 1 ? 'no' : 'yes';
      return 'base';
    }, done: () => {} },
  { issue: { source: value.sources[0] ?? 'github', title: 'Ticket title', body: 'Ticket body', labels: [], identifier: value.sources[0] === 'github' ? '#507' : undefined } });
  return calls;
}

function agentObjectProperties(source: string): string[][] {
  const file = ts.createSourceFile('software-factory.flow.ts', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const calls: string[][] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'agent' && ts.isObjectLiteralExpression(node.arguments[1])) {
      calls.push(node.arguments[1].properties.flatMap(property => ts.isPropertyAssignment(property) ? [property.name.getText(file)] : []));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return calls;
}

function expectSupportedCalls(calls: Record<string, AgentOptions>) {
  expect(Object.keys(calls).length).toBeGreaterThan(0);
  for (const [name, options] of Object.entries(calls)) {
    expect(options.cli, `${name} CLI`).toBeTruthy();
    expect(options.model, `${name} model`).toBe(DEFAULT_AGENT_MODELS[options.cli]);
  }
}

describe('per-step agent settings', () => {
  it('keeps editable overrides blank while generation resolves current model defaults', () => {
    expect(DEFAULT_AGENT_MODELS).toEqual({ claude: 'claude-sonnet-5', codex: 'gpt-5.6-sol', cursor: 'gpt-5.6-sol-high', grok: 'grok-4.7' });
    expect(resolveAgentSettings('traditional', 'planner', ['grok', 'cursor'])).toMatchObject({ agent: 'grok', model: '' });
    expect(resolveAgentSettings('traditional', 'adversary', ['grok', 'cursor'])).toMatchObject({ agent: 'cursor', model: '' });
    expect(resolveGeneratedAgentSettings('traditional', 'planner', ['grok', 'cursor'])).toMatchObject({ agent: 'grok', model: 'grok-4.7' });
    expect(resolveGeneratedAgentSettings('traditional', 'adversary', ['grok', 'cursor'])).toMatchObject({ agent: 'cursor', model: 'gpt-5.6-sol-high' });
    expect(resolveGeneratedAgentSettings('prototype', 'prototype-2', ['codex'])).toMatchObject({ agent: 'codex', model: 'gpt-5.6-sol' });
    expect(resolveGeneratedAgentSettings('simple', 'implementer', ['claude'], { 'simple:implementer': { agent: 'grok', model: 'grok-model', prompt: 'Custom work' } })).toMatchObject({ agent: 'claude', model: 'claude-sonnet-5', prompt: 'Custom work' });
  });

  it('keeps old OpenCode settings readable while falling back to a supported agent', () => {
    const saved = { 'simple:implementer': { agent: 'opencode' as const, model: 'opencode-model', prompt: 'Custom work' } };
    expect(readFactoryDraft(JSON.stringify({ ...draft, agentSettings: saved })))?.toMatchObject({ agentSettings: saved });
    expect(resolveAgentSettings('simple', 'implementer', ['opencode'], saved)).toMatchObject({ agent: 'claude', model: '', prompt: 'Custom work' });
    expect(resolveGeneratedAgentSettings('simple', 'implementer', ['opencode'], saved)).toMatchObject({ agent: 'claude', model: 'claude-sonnet-5', prompt: 'Custom work' });
  });

  it('gives a saved copy of the old traditional implementer default the new one, which plans instead of reading reviewed-plan.md', () => {
    const old = 'Follow reviewed-plan.md. Implement on the current branch. Add regression tests. Commit changes. Write a PR summary to summary.md.';
    const saved = { 'traditional:implementer': { agent: 'codex' as const, model: 'm', prompt: old } };
    const resolved = resolveAgentSettings('traditional', 'implementer', ['claude', 'codex'], saved);
    expect(resolved.prompt).not.toContain('reviewed-plan.md');
    expect(resolved).toMatchObject({ agent: 'codex', model: 'm', prompt: resolveAgentSettings('traditional', 'implementer', ['claude', 'codex']).prompt });
    // A prompt the person wrote themselves is kept, even if it names the file.
    const custom = { 'traditional:implementer': { prompt: 'Follow reviewed-plan.md carefully.' } };
    expect(resolveAgentSettings('traditional', 'implementer', ['claude'], custom).prompt).toBe('Follow reviewed-plan.md carefully.');
  });

  it('does not turn a prompt-only editor change into a model override', () => {
    const current = resolveAgentSettings('simple', 'implementer', ['claude']);
    expect(current.model).toBe('');
    const settings = { 'simple:implementer': { ...current, prompt: 'Custom prompt' } };
    expect(resolveAgentSettings('simple', 'implementer', ['claude'], settings)).toMatchObject({ model: '', prompt: 'Custom prompt' });
    expect(resolveGeneratedAgentSettings('simple', 'implementer', ['claude'], settings)).toMatchObject({ model: 'claude-sonnet-5', prompt: 'Custom prompt' });
  });

  it('pins every Claude step in the simple prebuilt flow to a probeable model', async () => {
    const calls = await execute({ ...draft, agents: ['claude'], workflow: 'simple' });
    expect(Object.keys(calls)).toEqual(['check-discovery', 'implementer', 'check-repair']);
    for (const options of Object.values(calls)) {
      expect(options).toMatchObject({ cli: 'claude', model: 'claude-sonnet-5' });
    }
  });

  it('gives every generated preset agent an explicit supported CLI/model pair', async () => {
    const workflows = ['simple', 'traditional', 'prototype'] as const;
    const targets = ['cloud', 'local'] as const;
    const sources = ['github', 'slack'] as const;
    const selections: CodingAgent[][] = [['claude'], ['codex'], ['claude', 'codex'], ['cursor'], ['grok']];

    for (const workflow of workflows) {
      for (const target of targets) {
        for (const source of sources) {
          for (const agents of selections) {
            const value: FactoryDraft = { ...draft, workflow, sources: [source], sourceSettings: {}, agents };
            const generated = factorySource(value, target);
            const objects = agentObjectProperties(generated);
            expect(objects.length, `${workflow}/${target}/${source}/${agents.join('+')}`).toBeGreaterThan(0);
            for (const properties of objects) {
              expect(properties).toContain('cli');
              expect(properties).toContain('model');
            }
            expectSupportedCalls(await execute(value, target));
          }
        }
      }
    }
  }, 20_000); // 60 generated flows, compiled and run; about 2s alone, slower under the full suite's load.

  it('keeps Cloud handoff and local-kit source on the same explicit model contract', () => {
    for (const workflow of ['simple', 'traditional', 'prototype'] as const) {
      for (const source of ['github', 'slack'] as const) {
        for (const agents of [['claude'], ['codex'], ['claude', 'codex'], ['cursor'], ['grok']] as CodingAgent[][]) {
          const value: FactoryDraft = { ...draft, workflow, sources: [source], sourceSettings: {}, agents };
          const handoff = JSON.parse(decodeURIComponent(new URL(cloudConnectionsHref(value, 'model-contract')).hash.slice(1))) as { source: string };
          expect(handoff.source).toBe(factorySource(value, 'cloud'));
          expect(localKitFiles(value)['software-factory.flow.mts']).toBe(factorySource(value, 'local'));
          for (const generated of [handoff.source, localKitFiles(value)['software-factory.flow.mts']]) {
            for (const properties of agentObjectProperties(generated)) {
              expect(properties).toContain('cli');
              expect(properties).toContain('model');
            }
          }
        }
      }
    }
  });

  it('materializes the model on the third Simple agent in the failed agent-3 topology', () => {
    const source = factorySource({ ...draft, workflow: 'simple', agents: ['claude'], sources: ['slack'], sourceSettings: {} });
    const objects = agentObjectProperties(source);
    expect(objects[2]).toEqual(expect.arrayContaining(['cli', 'model']));
    expect(source).not.toContain('claude-opus-5');
  });

  it('runs distinct prototype overrides while preserving ticket and worktree context', async () => {
    const prompt = 'Use "quotes", `ticks`, ${literal}, and a newline.\nWrite prototype-notes.md.';
    const calls = await execute({ ...draft, task: 'Keep changes focused.', agentSettings: {
      'prototype:prototype-1': { agent: 'grok', model: 'model-one', prompt },
      'prototype:prototype-2': { agent: 'cursor', model: 'model-two' },
      'prototype:comparator': { agent: 'codex', prompt: 'Write comparison.md.' },
      'prototype:implementer': { agent: 'cursor', model: 'build-model' },
    } });
    expect(calls['prototype-1']).toMatchObject({ cli: 'grok', model: 'model-one', cwd: '/tmp/prototypes/1' });
    expect(calls['prototype-1'].task).toContain(prompt);
    expect(calls['prototype-1'].task).toContain('Ticket title\nTicket body\nKeep changes focused.');
    expect(calls['prototype-1'].task).toContain('Assigned approach: the smallest change');
    expect(calls['prototype-2'].model).toBe('model-two');
    expect(calls['prototype-3'].model).toBe('claude-sonnet-5');
    expect(calls.comparator.task).toContain('/tmp/prototypes/1, /tmp/prototypes/2, /tmp/prototypes/3');
    expect(calls.implementer).toMatchObject({ cli: 'cursor', model: 'build-model' });
  });

  it('applies the reviewer settings to the traditional review', async () => {
    const calls = await execute({ ...draft, workflow: 'traditional', agentSettings: { 'traditional:adversary': { agent: 'grok', model: 'review-model', prompt: 'Check the diff. Write review.clean only if clean.' } } });
    expect(calls.adversary).toMatchObject({ cli: 'grok', model: 'review-model' });
    expect(calls.implementer.model).toBe('claude-sonnet-5');
  });

  it('persists valid overrides and includes them in both handoff sources', () => {
    const value: FactoryDraft = { ...draft, agentSettings: { 'prototype:implementer': { agent: 'grok', model: 'custom-model', prompt: 'Write summary.md.' } } };
    expect(readFactoryDraft(JSON.stringify(value))?.agentSettings).toEqual(value.agentSettings);
    expect(localKitFiles(value)['software-factory.flow.mts']).toContain('model: "custom-model"');
    expect(localKitFiles(value)['START-HERE.txt']).toContain('Grok');
    const cloud = JSON.parse(decodeURIComponent(new URL(cloudConnectionsHref(value, 'test')).hash.slice(1)));
    expect(cloud.source).toContain('model: "custom-model"');
    expect(cloud.source).toContain('Write summary.md.');
  });

  it('rejects invalid persisted settings without inventing reasoning options', () => {
    for (const agentSettings of [[], { 'simple:unknown': {} }, { 'simple:implementer': { agent: 'shell' } }, { 'simple:implementer': { reasoning: 'high' } }, { 'simple:implementer': { prompt: ' ' } }, { 'simple:implementer': { model: 'bad\nmodel' } }]) {
      expect(readFactoryDraft(JSON.stringify({ ...draft, agentSettings }))).toBeNull();
    }
    expect(factorySource(draft)).not.toContain('reasoning:');
  });
});
