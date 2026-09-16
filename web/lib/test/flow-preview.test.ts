import { describe, expect, it } from 'vitest';
import { cloudConnectionsHref, type FactoryDraft } from '../flow-onboarding';
import { flowPreview } from '../flow-preview';

const draft: FactoryDraft = {
  version: 4, sources: ['github', 'slack'], sourceSettings: { github: { repository: 'acme/app', labels: 'ready' }, slack: { channel: 'bugs' } },
  agents: ['claude', 'codex'], otherAgent: '', task: '', workflow: 'traditional', step: 3,
  agentSettings: { 'traditional:implementer': { agent: 'codex', model: 'custom-model' } },
};

describe('Cloud visual preview handoff', () => {
  it('carries the chosen agent and model, sources, and approval through the URL fragment', () => {
    const payload = JSON.parse(decodeURIComponent(cloudConnectionsHref(draft, 'preview-test').split('#')[1]));
    expect(payload.preview.nodes.find((node: { title: string }) => node.title === 'Implement')).toMatchObject({ owner: 'Codex', detail: 'custom-model', icons: ['codex'] });
    expect(payload.preview.nodes[0]).toMatchObject({ owner: 'Trigger', detail: 'Any one source can start the flow.' });
    expect(payload.preview.nodes[0].description).toContain('acme/app');
    expect(payload.preview.nodes[0].description).toContain('bugs');
    expect(payload.preview.nodes.at(-1)).toMatchObject({ title: 'Your approval', kind: 'approval' });
    expect(payload.source).toContain('model: "custom-model"');
  });

  it('preserves parallel implementations and two-round review only where applicable', () => {
    const prototype = flowPreview({ ...draft, workflow: 'prototype' })!;
    expect(prototype.nodes[1]).toMatchObject({ title: '3 implementations', owner: 'Parallel' });
    expect(prototype.nodes[1].detail.split('\n')).toHaveLength(3);
    expect(prototype.nodes[1].icons).toEqual(['claude', 'codex', 'claude']);
    expect(flowPreview(draft)!.nodes.find(node => node.title === 'Adversarial review')).toMatchObject({ badge: '2 rounds' });
    expect(flowPreview({ ...draft, workflow: 'simple' })!.nodes.map(node => node.title)).toEqual(['Work matches your sources', 'Implement', 'Run checks', 'Open PR', 'Your approval']);
  });
});
