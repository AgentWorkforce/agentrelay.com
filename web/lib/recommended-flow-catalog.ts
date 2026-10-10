import catalog from '../data/recommended-flow-catalog.v1.json';
import babysitterBundle from '../data/babysitter-extension.v1.json';

type CatalogFlow = typeof catalog.flows[number];
type BabysitterBundle = typeof babysitterBundle;
type CatalogExtension = NonNullable<CatalogFlow['extension']>;
type CatalogEmbeddedExtension = NonNullable<CatalogFlow['extensions']>[number];

export type RecommendedFlow = CatalogFlow & {
  extension?: CatalogExtension & { bundle: BabysitterBundle };
  extensions?: Array<CatalogEmbeddedExtension & {
    bundle?: BabysitterBundle;
  }>;
};

/** The checked-in JSON is the one catalog consumed by the API, Cloud and CLI. */
export function getRecommendedFlowCatalog() {
  return catalog;
}

export function getRecommendedFlow(id: string): RecommendedFlow | null {
  const flow = catalog.flows.find(entry => entry.id === id);
  if (!flow) return null;

  if (flow.id === 'babysitter' && 'extension' in flow) {
    return {
      ...flow,
      extension: { ...flow.extension, bundle: babysitterBundle },
    } as RecommendedFlow;
  }

  const extensions = 'extensions' in flow ? flow.extensions : undefined;
  if (flow.id === 'software-factory' && extensions) {
    return {
      ...flow,
      extensions: extensions.map(extension => (
        extension.id === 'babysitter' ? { ...extension, bundle: babysitterBundle } : extension
      )),
    } as RecommendedFlow;
  }

  return flow as RecommendedFlow;
}
