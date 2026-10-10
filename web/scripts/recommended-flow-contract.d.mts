export const SOFTWARE_FACTORY_METADATA_SNIPPETS: readonly string[];

export function assertRecommendedFlowSourceContract(
  flow: { id: string },
  sourceText: string,
): void;

export function assertRecommendedCatalogEnvelope(catalog: unknown): void;
