// OpenNext 1.20.1 predates Next 16.4's preview manifest and minified cache
// handler names. Keep these two build-time compatibility patches explicit and
// fail closed if an adapter upgrade changes their targets. Remove them once
// upstream handles both cases and the Worker smoke test passes without them.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const adapter = new URL('../cli/build/patches/plugins/', import.meta.resolve('@opennextjs/cloudflare'));
const adapterPackage = new URL('../../package.json', import.meta.resolve('@opennextjs/cloudflare'));
assert.equal(JSON.parse(await readFile(adapterPackage, 'utf8')).version, '1.20.1',
  'Reassess the Next 16.4 compatibility patches when upgrading OpenNext');
assert.equal(JSON.parse(await readFile(new URL(import.meta.resolve('next/package.json')), 'utf8')).version, '16.4.3',
  'Reassess the OpenNext compatibility patches when upgrading Next');
// Like OpenNext's original patch, this installs only its default/remote cache
// handlers. A future named custom cache handler needs an explicit integration.
const patches = [
  ['load-manifest.js',
    '{*-manifest,required-server-files,prefetch-hints}.json',
    '{*-manifest,required-server-files,prefetch-hints,preview-props}.json'],
  ['next-server.js',
    '  globalThis[handlersSetSymbol] = new Set(globalThis[handlersMapSymbol].values());',
    '  globalThis[handlersSetSymbol] = new Set(globalThis[handlersMapSymbol].values());\n  return;'],
];

for (const [name, before, after] of patches) {
  const path = new URL(name, adapter);
  const source = await readFile(path, 'utf8');
  if (source.includes(after)) continue;
  assert.equal(source.split(before).length, 2, `Review the OpenNext compatibility patch for ${name}`);
  await writeFile(path, source.replace(before, after));
}
