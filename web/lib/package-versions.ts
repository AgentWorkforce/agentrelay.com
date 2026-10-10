import type { DocsPackage } from './docs-packages.mjs';

// Inlined by next.config at build time from the npm registry. Empty outside a
// Next build or dev server (tests, type checks), where versions are unknown.
const versions: Partial<Record<DocsPackage, string>> = JSON.parse(process.env.DOCS_PACKAGE_VERSIONS || '{}');

/** Latest published version of a docs package, or undefined when unknown. */
export function packageVersion(name: DocsPackage): string | undefined {
  return versions[name];
}
