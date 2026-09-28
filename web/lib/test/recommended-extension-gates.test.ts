import { describe, expect, it } from 'vitest';
import pluginsJson from '../../data/flow-plugin-catalog.v1.json';
import recommendedJson from '../../data/recommended-flow-catalog.v1.json';
import { createHash } from 'node:crypto';
import {
  integratedLiveProofTimingIsValid,
  validateRecommendedExtensions,
  verifyIntegratedLiveProof,
} from '../../scripts/verify-catalog-gates.mjs';

function fixture() {
  const plugins = structuredClone(pluginsJson);
  const catalog = structuredClone(recommendedJson);
  const garden = catalog.flows.find(flow => flow.id === 'software-factory') as any;
  // A second compatible base demonstrates traversal beyond Software Garden.
  plugins.plugins[0].base.push('second-flow');
  catalog.flows.push({ ...structuredClone(garden), id: 'second-flow' });
  return { plugins, catalog };
}

function baseFlows(catalog: ReturnType<typeof fixture>['catalog']) {
  return [
    catalog.flows.find(flow => flow.id === 'software-factory')!,
    catalog.flows.find(flow => flow.id === 'second-flow')!,
  ] as any[];
}

describe('every recommended extension gate', () => {
  it('accepts matching blocked contracts across all compatible flows', () => {
    const { plugins, catalog } = fixture();
    expect(() => validateRecommendedExtensions(catalog, plugins)).not.toThrow();
  });
  it('rejects an unsupported second extension on either flow', () => {
    for (const index of [0, 1]) {
      const { plugins, catalog } = fixture();
      const flow = baseFlows(catalog)[index];
      flow.extensions.push({
        ...structuredClone(flow.extensions[0]), id: 'unsupported',
        activation: { state: 'ready', dependencies: [] },
      });
      expect(() => validateRecommendedExtensions(catalog, plugins)).toThrow('no supported plugin contract');
    }
  });
  it('validates evidence for a supported extension on the second flow', () => {
    const { plugins, catalog } = fixture();
    baseFlows(catalog)[1].extensions[0].activation.state = 'ready';
    expect(() => validateRecommendedExtensions(catalog, plugins)).toThrow('may be ready only');
  });
  it('rejects every artifact or runtime mismatch on the second flow', () => {
    for (const field of ['ref', 'digest', 'manifestSha256'] as const) {
      const { plugins, catalog } = fixture();
      baseFlows(catalog)[1].extensions[0].artifact[field] = 'unverified';
      expect(() => validateRecommendedExtensions(catalog, plugins)).toThrow('artifact coordinates');
    }
    const { plugins, catalog } = fixture();
    baseFlows(catalog)[1].extensions[0].runtime.version = '99.0.0';
    expect(() => validateRecommendedExtensions(catalog, plugins)).toThrow('runtime provenance');
  });
  it('rejects duplicate extensions, duplicate plugin contracts and incompatible bases', () => {
    const duplicate = fixture();
    const duplicateSecond = baseFlows(duplicate.catalog)[1];
    duplicateSecond.extensions.push(duplicateSecond.extensions[0]);
    expect(() => validateRecommendedExtensions(duplicate.catalog, duplicate.plugins)).toThrow('is repeated');
    const ambiguous = fixture();
    ambiguous.plugins.plugins.push(ambiguous.plugins.plugins[0]);
    expect(() => validateRecommendedExtensions(ambiguous.catalog, ambiguous.plugins)).toThrow('repeats');
    const incompatible = fixture();
    incompatible.plugins.plugins[0].base = ['software-factory'];
    expect(() => validateRecommendedExtensions(incompatible.catalog, incompatible.plugins)).toThrow('incompatible');
  });
  it('rejects malformed extension lists instead of skipping them', () => {
    for (const extensions of [null, {}, 'babysitter']) {
      const { plugins, catalog } = fixture();
      const [garden, second] = baseFlows(catalog);
      const babysitter = catalog.flows.find(flow => flow.id === 'babysitter') as any;
      const malformed = { ...catalog, flows: [garden, babysitter, { ...second, extensions }] };
      expect(() => validateRecommendedExtensions(malformed, plugins)).toThrow('extensions must be an array');
    }
  });
  it('validates the first-class Babysitter card against the same plugin gate', () => {
    const { plugins, catalog } = fixture();
    const babysitter = catalog.flows.find(flow => flow.id === 'babysitter') as any;
    babysitter.extension.activation.state = 'ready';
    expect(() => validateRecommendedExtensions(catalog, plugins)).toThrow('may be ready only');
  });
  it('enforces the paired Cloud list-consumer envelope', () => {
    const missingLabel = fixture();
    const babysitter = missingLabel.catalog.flows.find(flow => flow.id === 'babysitter') as any;
    delete babysitter.defaultLabel;
    expect(() => validateRecommendedExtensions(missingLabel.catalog, missingLabel.plugins))
      .toThrow('Cloud recommended catalog consumer contract');

    const missingAgentArray = fixture();
    const secondBabysitter = missingAgentArray.catalog.flows.find(flow => flow.id === 'babysitter') as any;
    secondBabysitter.inputs.defaults = {};
    expect(() => validateRecommendedExtensions(missingAgentArray.catalog, missingAgentArray.plugins))
      .toThrow('Cloud recommended catalog consumer contract');

    const emptyDeployableFlow = fixture();
    baseFlows(emptyDeployableFlow.catalog)[0].inputs.defaults.agents = [];
    expect(() => validateRecommendedExtensions(emptyDeployableFlow.catalog, emptyDeployableFlow.plugins))
      .toThrow('deployable flow agent sets must not be empty');
  });
  it('keeps ready blocked while the hosted executor has no accepted implementation PR', () => {
    const { plugins, catalog } = fixture();
    const activation = structuredClone(plugins.plugins[0].activation) as any;
    activation.state = 'ready';
    activation.dependencies.forEach((dependency: any, index: number) => {
      const pull = [3989, 1900, 1851][index]!;
      dependency.evidence = {
        pullRequestUrl: `https://github.com/${dependency.repository}/pull/${pull}`,
        mergedCommit: `${index + 1}`.repeat(40),
        mergedAt: '2026-09-24T12:00:00Z',
        deploymentUrl: `https://api.github.com/repos/${dependency.repository}/deployments/${pull}`,
        deployedAt: '2026-09-24T12:05:00Z',
      };
    });
    plugins.plugins[0].activation = activation;
    for (const flow of catalog.flows as any[]) {
      if (flow.extension?.id === 'babysitter') flow.extension.activation = structuredClone(activation);
      for (const extension of flow.extensions ?? []) {
        if (extension.id === 'babysitter') extension.activation = structuredClone(activation);
      }
    }
    expect(() => validateRecommendedExtensions(catalog, plugins)).toThrow('merge and deployment evidence');
  });
  it('requires live proof to follow deployments and not be future-dated', () => {
    const proof = {
      evidenceUrl: `https://raw.githubusercontent.com/AgentWorkforce/cloud/${'a'.repeat(40)}/evidence/babysitter-live-proof.json`,
      evidenceSha256: 'b'.repeat(64),
      observedAt: '2026-09-24T12:04:59Z',
      pullRequestUrl: 'https://github.com/AgentWorkforce/cloud/pull/4000',
      headSha: 'c'.repeat(40),
      label: 'babysit' as const,
      receiptId: 'receipt:babysitter:e2e',
    };
    const dependencies = [{
      id: 'dependency',
      repository: 'AgentWorkforce/example',
      requiredState: 'merged-and-deployed' as const,
      evidence: {
        pullRequestUrl: 'https://github.com/AgentWorkforce/example/pull/1',
        mergedCommit: 'd'.repeat(40),
        mergedAt: '2026-09-24T12:00:00Z',
        deploymentUrl: 'https://api.github.com/repos/AgentWorkforce/example/deployments/1',
        deployedAt: '2026-09-24T12:05:00Z',
      },
    }];
    expect(integratedLiveProofTimingIsValid(proof, dependencies, Date.parse('2026-09-24T12:10:00Z'))).toBe(false);
    expect(integratedLiveProofTimingIsValid(
      { ...proof, observedAt: '2026-09-24T12:06:00Z' },
      dependencies,
      Date.parse('2026-09-24T12:10:00Z'),
    )).toBe(true);
    expect(integratedLiveProofTimingIsValid(
      { ...proof, observedAt: '2026-09-24T12:11:00Z' },
      dependencies,
      Date.parse('2026-09-24T12:10:00Z'),
    )).toBe(false);
  });
  it('verifies the immutable live proof bytes and declared payload', async () => {
    const document = {
      headSha: 'a'.repeat(40),
      label: 'babysit' as const,
      observedAt: '2026-09-24T12:10:00Z',
      pullRequestUrl: 'https://github.com/AgentWorkforce/cloud/pull/4000',
      receiptId: 'receipt:babysitter:e2e',
    };
    const bytes = Buffer.from(JSON.stringify(document));
    const proof = {
      evidenceUrl: `https://raw.githubusercontent.com/AgentWorkforce/cloud/${'b'.repeat(40)}/evidence/babysitter-live-proof.json`,
      evidenceSha256: createHash('sha256').update(bytes).digest('hex'),
      ...document,
    };
    const response = () => Promise.resolve(new Response(bytes, {
      status: 200,
      headers: { 'content-length': String(bytes.length) },
    }));
    await expect(verifyIntegratedLiveProof(proof, response)).resolves.toBeUndefined();
    await expect(verifyIntegratedLiveProof(
      { ...proof, evidenceSha256: 'c'.repeat(64) },
      response,
    )).rejects.toThrow('digest does not match');
    const drifted = Buffer.from(JSON.stringify({ ...document, receiptId: 'different' }));
    await expect(verifyIntegratedLiveProof(
      { ...proof, evidenceSha256: createHash('sha256').update(drifted).digest('hex') },
      () => Promise.resolve(new Response(drifted, { status: 200 })),
    )).rejects.toThrow('payload does not match');
  });
});
