import { describe, expect, it } from 'vitest';

import { DOCS_PACKAGES, fetchDocsPackageVersions } from '../docs-packages.mjs';

function registry(versions: Record<string, string | undefined>, status = 200): typeof fetch {
  return (async (url: string | URL | Request) => {
    const name = decodeURIComponent(String(url).replace('https://registry.npmjs.org/', '').replace(/\/latest$/, ''));
    return new Response(JSON.stringify({ version: versions[name] }), { status });
  }) as typeof fetch;
}

describe('fetchDocsPackageVersions', () => {
  it('returns the latest version of every docs package', async () => {
    const versions = Object.fromEntries(DOCS_PACKAGES.map((name, i) => [name, `1.${i}.0`]));

    await expect(fetchDocsPackageVersions(registry(versions))).resolves.toEqual(versions);
  });

  it('fails when the registry errors', async () => {
    await expect(fetchDocsPackageVersions(registry({}, 503))).rejects.toThrow('npm registry returned 503');
  });

  it('fails when a package has no version', async () => {
    await expect(fetchDocsPackageVersions(registry({}))).rejects.toThrow('returned no version');
  });
});
