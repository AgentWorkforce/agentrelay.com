import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { assertPluginArtifact } from '../../scripts/verify-plugin-artifacts.mjs';

const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const files = [
  { path: 'flows-plugin.json', data: Buffer.from('{"schemaVersion":2}') },
  { path: 'handler.ts', data: Buffer.from('export const handler = true;') },
];
const plugin = {
  name: 'fixture',
  digest: hash(JSON.stringify(files.map(file => ({
    bytes: file.data.length, path: file.path, sha256: hash(file.data),
  })))),
  manifestSha256: hash(files[0].data),
};

describe('immutable plugin artifact verification', () => {
  it('accepts matching bytes independent of enumeration order', () => {
    expect(() => assertPluginArtifact(plugin, [...files].reverse())).not.toThrow();
  });
  it('rejects absent manifests, changed content, missing files and unexpected files', () => {
    for (const invalid of [[], files.slice(1), files.slice(0, 1),
      [...files, { path: 'extra.ts', data: Buffer.from('extra') }],
      [files[0], { ...files[1], data: Buffer.from('tampered') }],
    ]) expect(() => assertPluginArtifact(plugin, invalid)).toThrow();
  });
  it('checks the manifest hash independently of the payload digest', () => {
    expect(() => assertPluginArtifact({ ...plugin, manifestSha256: '0'.repeat(64) }, files))
      .toThrow('manifest digest mismatch');
  });
});
