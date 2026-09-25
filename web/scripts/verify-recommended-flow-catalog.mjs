import { verifyPluginArtifact } from './verify-plugin-artifacts.mjs';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { assertRecommendedFlowSourceContract } from './recommended-flow-contract.mjs';

const execFileAsync = promisify(execFile);
const catalogUrl = new URL('../data/recommended-flow-catalog.v1.json', import.meta.url);
const catalog = JSON.parse(await readFile(catalogUrl, 'utf8'));
const MAX_SOURCE_BYTES = 1024 * 1024;

if (catalog.schemaVersion !== 1 || catalog.catalogVersion !== 3 || !Array.isArray(catalog.flows)) {
  throw new Error('recommended-flow catalog must be schemaVersion 1, catalogVersion 3, with a flows array');
}

for (const flow of catalog.flows) {
  const { source } = flow;
  if (!source || source.kind !== 'github') throw new Error(`${flow.id}: source.kind must be github`);
  if (!/^[A-Za-z0-9_.-]+$/.test(source.owner) || !/^[A-Za-z0-9_.-]+$/.test(source.repo)) {
    throw new Error(`${flow.id}: invalid GitHub owner or repository`);
  }
  if (!/^[0-9a-f]{40}$/.test(source.ref)) throw new Error(`${flow.id}: source.ref must be a full commit SHA`);
  if (!/^[0-9a-f]{64}$/.test(source.sha256)) throw new Error(`${flow.id}: source.sha256 must be lowercase hex`);
  if (!/^v\d+\.\d+\.\d+$/.test(source.release)) throw new Error(`${flow.id}: source.release must be a version tag`);
  if (!source.path || source.path.startsWith('/') || source.path.includes('..')) throw new Error(`${flow.id}: invalid source.path`);

  const blobUrl = `https://github.com/${source.owner}/${source.repo}/blob/${source.ref}/${source.path}`;
  const rawUrl = `https://raw.githubusercontent.com/${source.owner}/${source.repo}/${source.ref}/${source.path}`;
  if (source.url !== blobUrl || source.rawUrl !== rawUrl) {
    throw new Error(`${flow.id}: source URLs do not match owner/repo/ref/path`);
  }

  const tagRef = `refs/tags/${source.release}`;
  const { stdout } = await execFileAsync('git', [
    'ls-remote', `https://github.com/${source.owner}/${source.repo}.git`, tagRef, `${tagRef}^{}`,
  ], { maxBuffer: 1024 * 1024, timeout: 30_000 });
  const remoteRefs = new Map(stdout.trim().split('\n').filter(Boolean).map(line => line.split(/\s+/, 2).reverse()));
  const releasedCommit = remoteRefs.get(`${tagRef}^{}`) ?? remoteRefs.get(tagRef);
  if (releasedCommit !== source.ref) {
    throw new Error(`${flow.id}: ${source.release} resolves to ${releasedCommit ?? 'nothing'}, not ${source.ref}`);
  }

  const response = await fetch(source.rawUrl, { redirect: 'follow', signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${flow.id}: source fetch returned HTTP ${response.status}`);
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SOURCE_BYTES) {
    throw new Error(`${flow.id}: source exceeds ${MAX_SOURCE_BYTES} bytes`);
  }
  if (!response.body) throw new Error(`${flow.id}: source response has no body`);
  const hash = createHash('sha256');
  const chunks = [];
  const reader = response.body.getReader();
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_SOURCE_BYTES) {
      await reader.cancel();
      throw new Error(`${flow.id}: source exceeds ${MAX_SOURCE_BYTES} bytes`);
    }
    hash.update(value);
    chunks.push(Buffer.from(value));
  }
  const actualHash = hash.digest('hex');
  if (actualHash !== source.sha256) {
    throw new Error(`${flow.id}: source hash is ${actualHash}, expected ${source.sha256}`);
  }
  assertRecommendedFlowSourceContract(flow, Buffer.concat(chunks).toString('utf8'));
  console.log(`${flow.id}: verified ${source.release} (${source.ref}) sha256:${actualHash}`);
}

const plugins = JSON.parse(await readFile(new URL('../data/flow-plugin-catalog.v1.json', import.meta.url), 'utf8'));
for (const plugin of plugins.plugins) await verifyPluginArtifact(plugin);
