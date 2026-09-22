import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { DEFAULT_FACTORY, factorySource, readFactoryDraft, cloudConnectionsHref, type FactoryDraft } from '../flow-onboarding';
import { resolveAgentSettings } from '../flow-agent-settings';
import { localKitFiles } from '../flow-local';
import { FLOW_VALIDATE_CHANGE_METADATA_COMMAND } from '../flow-workflows';

const draft: FactoryDraft = { ...DEFAULT_FACTORY, sources: ['github'], agents: ['claude', 'codex', 'grok', 'cursor'], workflow: 'prototype', step: 3 };
async function execute(value: FactoryDraft) {
  const source = factorySource(value).replace('import { flow } from "@relayflows/surface";', '');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  const exports: { default?: (ctx: unknown, input: unknown) => Promise<void> } = {};
  new Function('exports', 'flow', compiled.outputText)(exports, (_name: string, _options: unknown, body: unknown) => body);
  const calls: Record<string, { cli: string; model?: string; task: string; cwd?: string }> = {};
  await exports.default!({ agent: async (name: string, options: typeof calls[string]) => { calls[name] = options; },
    // "base=..." is the publish check; without a verdict it understands, the
    // flow correctly stops before the reviews rather than opening a pull
    // request for work that was never committed.
    run: async (command: string) => command.endsWith(FLOW_VALIDATE_CHANGE_METADATA_COMMAND) ? 'valid' : command.startsWith('base=') ? 'publish' : command.startsWith('mktemp') ? '/tmp/prototypes' : command.includes('review.clean &&') ? 'yes' : 'base', done: () => {} },
  { issue: { source: 'github', title: 'Ticket title', body: 'Ticket body', labels: [], identifier: '#507' } });
  return calls;
}

describe('per-step agent settings', () => {
  it('inherits CLI models and adapts assignments to the selected agents', () => {
    expect(resolveAgentSettings('traditional', 'planner', ['grok', 'cursor'])).toMatchObject({ agent: 'grok', model: '' });
    expect(resolveAgentSettings('traditional', 'adversary', ['grok', 'cursor'])).toMatchObject({ agent: 'cursor', model: '' });
    expect(resolveAgentSettings('prototype', 'prototype-2', ['codex']).agent).toBe('codex');
    expect(resolveAgentSettings('simple', 'implementer', ['claude'], { 'simple:implementer': { agent: 'grok', model: 'grok-model', prompt: 'Custom work' } })).toMatchObject({ agent: 'claude', model: '', prompt: 'Custom work' });
  });

  it('keeps old OpenCode settings readable while falling back to a supported agent', () => {
    const saved = { 'simple:implementer': { agent: 'opencode' as const, model: 'opencode-model', prompt: 'Custom work' } };
    expect(readFactoryDraft(JSON.stringify({ ...draft, agentSettings: saved })))?.toMatchObject({ agentSettings: saved });
    expect(resolveAgentSettings('simple', 'implementer', ['opencode'], saved)).toMatchObject({ agent: 'claude', model: '', prompt: 'Custom work' });
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
    expect(calls['prototype-3'].model).toBeUndefined();
    expect(calls.comparator.task).toContain('/tmp/prototypes/1, /tmp/prototypes/2, /tmp/prototypes/3');
    expect(calls.implementer).toMatchObject({ cli: 'cursor', model: 'build-model' });
  });

  it('applies the shared reviewer settings to both traditional rounds', async () => {
    const calls = await execute({ ...draft, workflow: 'traditional', agentSettings: { 'traditional:adversary': { agent: 'grok', model: 'review-model', prompt: 'Check the diff. Write review.clean only if clean.' } } });
    for (const role of ['adversary-1', 'adversary-2']) expect(calls[role]).toMatchObject({ cli: 'grok', model: 'review-model' });
    expect(calls.planner.model).toBeUndefined();
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
