import catalog from '../data/recommended-flow-catalog.v1.json';

export type RecommendedFlow = typeof catalog.flows[number];

/** The checked-in JSON is the one catalog consumed by the API, Cloud and CLI. */
export function getRecommendedFlowCatalog() {
  return catalog;
}

export function getRecommendedFlow(id: string): RecommendedFlow | null {
  return catalog.flows.find(flow => flow.id === id) ?? null;
}
