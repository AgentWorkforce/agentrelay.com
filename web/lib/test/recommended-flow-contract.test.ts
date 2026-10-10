import { describe, expect, it } from 'vitest';
import {
  SOFTWARE_FACTORY_METADATA_SNIPPETS,
  assertRecommendedCatalogEnvelope,
  assertRecommendedFlowSourceContract,
} from '../../scripts/recommended-flow-contract.mjs';

const flow = { id: 'software-factory' };
const validSource = SOFTWARE_FACTORY_METADATA_SNIPPETS.join('\n');

describe('recommended Software Garden source contract', () => {
  it('accepts a source carrying the ticket title and exact closing-reference guards', () => {
    expect(() => assertRecommendedFlowSourceContract(flow, validSource)).not.toThrow();
  });

  it.each(SOFTWARE_FACTORY_METADATA_SNIPPETS.map(snippet => [snippet] as const))(
    'rejects the pinned source when it drops %s',
    (removed: string) => {
      const source = SOFTWARE_FACTORY_METADATA_SNIPPETS.filter((snippet: string) => snippet !== removed).join('\n');
      expect(() => assertRecommendedFlowSourceContract(flow, source)).toThrow(
        /ticket-derived title\/exact closing-reference contract/,
      );
    },
  );

  it('does not impose the factory contract on another catalog flow', () => {
    expect(() => assertRecommendedFlowSourceContract({ id: 'other' }, '')).not.toThrow();
  });
});

describe('recommended flow catalog envelope', () => {
  it.each([1, 5, 6, 42])('accepts catalogVersion %s', (catalogVersion: number) => {
    expect(() => assertRecommendedCatalogEnvelope({ schemaVersion: 1, catalogVersion, flows: [] })).not.toThrow();
  });

  it.each([0, -1, 1.5, '6', null, undefined, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    'rejects catalogVersion %s',
    (catalogVersion: unknown) => {
      expect(() => assertRecommendedCatalogEnvelope({ schemaVersion: 1, catalogVersion, flows: [] })).toThrow(
        /positive integer catalogVersion/,
      );
    },
  );

  it('rejects another schema or a catalog without flows', () => {
    expect(() => assertRecommendedCatalogEnvelope({ schemaVersion: 2, catalogVersion: 6, flows: [] })).toThrow();
    expect(() => assertRecommendedCatalogEnvelope({ schemaVersion: 1, catalogVersion: 6 })).toThrow();
    expect(() => assertRecommendedCatalogEnvelope(null)).toThrow();
  });
});
