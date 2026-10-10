import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** Match the SDK payloadManifest: path-sorted entries with canonical object keys. */
export function assertPluginArtifact(plugin, files) {
  const manifest = files.find(file => file.path === 'flows-plugin.json');
  if (!manifest) throw new Error(`${plugin.name}: flows-plugin.json is missing`);
  const entries = [...files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
    .map(file => ({ bytes: file.data.length, path: file.path, sha256: sha256(file.data) }));
  if (sha256(JSON.stringify(entries)) !== plugin.digest) {
    throw new Error(`${plugin.name}: artifact digest mismatch`);
  }
  if (sha256(manifest.data) !== plugin.manifestSha256) {
    throw new Error(`${plugin.name}: manifest digest mismatch`);
  }
}

/** Fetch the immutable commit, enumerate its actual directory, and hash every file. */
export async function verifyPluginArtifact(plugin) {
  const { owner, repo, path } = plugin.source;
  if (![owner, repo].every(value => typeof value === 'string' && /^[A-Za-z0-9_.-]+$/.test(value))
    || typeof plugin.ref !== 'string' || !/^[0-9a-f]{40}$/.test(plugin.ref)
    || typeof path !== 'string' || !path || path.startsWith('/')
    || path.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error(`${plugin.name}: invalid artifact coordinates`);
  }
  const directory = await mkdtemp(join(tmpdir(), 'catalog-artifact-'));
  const git = (...args) => exec('git', args, {
    cwd: directory, timeout: 60_000, maxBuffer: 4_000_000, encoding: 'buffer',
  });
  try {
    await git('init', '--quiet');
    await git('fetch', '--quiet', '--depth=1', '--no-tags',
      `https://github.com/${owner}/${repo}.git`, plugin.ref);
    const { stdout: head } = await git('rev-parse', 'FETCH_HEAD');
    if (head.toString().trim() !== plugin.ref) throw new Error(`${plugin.name}: fetched commit mismatch`);
    const prefix = `${path}/`;
    const { stdout } = await git('ls-tree', '-r', '-z', '--long', plugin.ref, '--', path);
    const records = stdout.toString().split('\0').filter(Boolean);
    if (!records.length || records.length > 500) throw new Error(`${plugin.name}: missing or oversized artifact`);
    const files = [];
    let total = 0;
    for (const record of records) {
      const match = /^(100644|100755) blob ([0-9a-f]{40}) +([0-9]+)\t(.+)$/s.exec(record);
      if (!match || !match[4].startsWith(prefix)) throw new Error(`${plugin.name}: artifact must contain plain files`);
      const size = Number(match[3]);
      total += size;
      if (size > 256_000 || total > 2_000_000) throw new Error(`${plugin.name}: artifact exceeds size limit`);
      const { stdout: data } = await git('cat-file', 'blob', match[2]);
      if (data.length !== size) throw new Error(`${plugin.name}: blob size mismatch`);
      files.push({ path: match[4].slice(prefix.length), data });
    }
    assertPluginArtifact(plugin, files);
    console.log(`${plugin.name}: verified ${plugin.ref}#${path} sha256:${plugin.digest}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
