export declare const DOCS_PACKAGES: readonly ['agent-relay', 'relayfile', 'ai-hist'];

export type DocsPackage = (typeof DOCS_PACKAGES)[number];

export declare function fetchDocsPackageVersions(
  fetchImpl?: typeof fetch
): Promise<Record<DocsPackage, string>>;
