// npm packages whose latest published version the docs display. next.config
// resolves them once per build and inlines the result as DOCS_PACKAGE_VERSIONS;
// lib/package-versions.ts reads it.
export const DOCS_PACKAGES = ['agent-relay', 'relayfile', 'ai-hist'];

const REGISTRY = 'https://registry.npmjs.org';

/**
 * The `latest` dist-tag of every docs package, keyed by package name.
 * Throws when any lookup fails, so a build never ships a guessed version.
 */
export async function fetchDocsPackageVersions(fetchImpl = fetch) {
  const entries = await Promise.all(
    DOCS_PACKAGES.map(async (name) => {
      const url = `${REGISTRY}/${encodeURIComponent(name).replace('%40', '@')}/latest`;
      const response = await fetchImpl(url, { headers: { accept: 'application/json' } });
      if (!response.ok) {
        throw new Error(`npm registry returned ${response.status} for ${name}`);
      }
      const { version } = await response.json();
      if (typeof version !== 'string' || !version) {
        throw new Error(`npm registry returned no version for ${name}`);
      }
      return [name, version];
    })
  );
  return Object.fromEntries(entries);
}
