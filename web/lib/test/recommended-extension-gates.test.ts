import { describe, expect, it } from 'vitest';
import pluginsJson from '../../data/flow-plugin-catalog.v1.json';
import recommendedJson from '../../data/recommended-flow-catalog.v1.json';
import { validateRecommendedExtensions } from '../../scripts/verify-catalog-gates.mjs';

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
});
