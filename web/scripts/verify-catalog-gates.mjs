import { FLOW_PLUGIN_IMPLEMENTATION_PULL_REQUESTS } from '../lib/flow-plugin-implementation-prs.mjs';
import { assertPluginArtifact } from './verify-plugin-artifacts.mjs';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { verifyDeploymentReceipt } from './verify-deployment-receipts.mjs';

const pluginCatalogUrl = new URL('../data/flow-plugin-catalog.v1.json', import.meta.url);
const recommendedCatalogUrl = new URL('../data/recommended-flow-catalog.v1.json', import.meta.url);
const babysitterBundleUrl = new URL('../data/babysitter-extension.v1.json', import.meta.url);

const [pluginCatalog, recommendedCatalog, babysitterBundle] = await Promise.all([
  readFile(pluginCatalogUrl, 'utf8').then(JSON.parse),
  readFile(recommendedCatalogUrl, 'utf8').then(JSON.parse),
  readFile(babysitterBundleUrl, 'utf8').then(JSON.parse),
]);

const REQUIRED_PLUGIN_DEPENDENCIES = new Map([
  ['babysitter', new Map([
    ['cloud-babysitter-capability-adapter', 'AgentWorkforce/cloud'],
    ['relay-native-existing-session-delivery', 'AgentWorkforce/relay'],
  ])],
]);
const SHA = /^[0-9a-f]{40}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function fail(message) {
  throw new Error(`catalog dependency gate: ${message}`);
}

function timestampMillis(value) {
  if (!ISO_TIMESTAMP.test(value)) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return null;
  const normalized = value.includes('.') ? value : value.replace(/Z$/, '.000Z');
  return new Date(milliseconds).toISOString() === normalized ? milliseconds : null;
}

export function integratedLiveProofIsValid(proof) {
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) return false;
  if (Object.keys(proof).sort().join(',') !== 'evidenceSha256,evidenceUrl,headSha,label,observedAt,pullRequestUrl,receiptId') return false;
  if (!Object.values(proof).every(value => typeof value === 'string')
    || proof.label !== 'babysit'
    || !SHA.test(proof.headSha)
    || !/^[0-9a-f]{64}$/.test(proof.evidenceSha256)
    || timestampMillis(proof.observedAt) === null
    || !/^[A-Za-z0-9_.:-]{1,200}$/.test(proof.receiptId)) return false;
  try {
    const evidenceUrl = new URL(proof.evidenceUrl);
    const pullRequestUrl = new URL(proof.pullRequestUrl);
    return evidenceUrl.origin === 'https://raw.githubusercontent.com'
      && /^\/AgentWorkforce\/cloud\/[0-9a-f]{40}\/.+\.json$/.test(evidenceUrl.pathname)
      && pullRequestUrl.origin === 'https://github.com'
      && /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/[1-9][0-9]*$/.test(pullRequestUrl.pathname);
  } catch {
    return false;
  }
}

const MAX_LIVE_PROOF_BYTES = 64 * 1024;

/** Read-only verification of the immutable integrated-run proof. */
export async function verifyIntegratedLiveProof(proof, request = fetch) {
  if (!integratedLiveProofIsValid(proof)) {
    throw new Error('live proof does not satisfy the integrated-run contract');
  }
  const response = await request(proof.evidenceUrl, {
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`live proof unavailable: HTTP ${response.status}`);
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_LIVE_PROOF_BYTES) {
    throw new Error(`live proof exceeds ${MAX_LIVE_PROOF_BYTES} bytes`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_LIVE_PROOF_BYTES) {
    throw new Error(`live proof exceeds ${MAX_LIVE_PROOF_BYTES} bytes`);
  }
  if (createHash('sha256').update(bytes).digest('hex') !== proof.evidenceSha256) {
    throw new Error('live proof digest does not match the catalog');
  }
  let document;
  try {
    document = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error('live proof is not valid JSON');
  }
  const expected = {
    headSha: proof.headSha,
    label: proof.label,
    observedAt: proof.observedAt,
    pullRequestUrl: proof.pullRequestUrl,
    receiptId: proof.receiptId,
  };
  if (JSON.stringify(document) !== JSON.stringify(expected)) {
    throw new Error('live proof payload does not match the catalog');
  }
}

export function deploymentEvidenceIsValid(dependency) {
  const evidence = dependency.evidence;
  if (evidence === null) return false;
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return false;
  if (Object.keys(evidence).sort().join(',') !== 'deployedAt,deploymentUrl,mergedAt,mergedCommit,pullRequestUrl') return false;
  if (!Object.values(evidence).every(value => typeof value === 'string')) return false;
  if (!Object.hasOwn(FLOW_PLUGIN_IMPLEMENTATION_PULL_REQUESTS, dependency.id)
    || evidence.pullRequestUrl !== FLOW_PLUGIN_IMPLEMENTATION_PULL_REQUESTS[dependency.id]) return false;
  let pullRequestUrl;
  let deploymentUrl;
  try {
    pullRequestUrl = new URL(evidence.pullRequestUrl);
    deploymentUrl = new URL(evidence.deploymentUrl);
  } catch {
    return false;
  }
  const mergedAt = timestampMillis(evidence.mergedAt);
  const deployedAt = timestampMillis(evidence.deployedAt);
  return pullRequestUrl.origin === 'https://github.com'
    && new RegExp(`^/${dependency.repository}/pull/[1-9][0-9]*$`).test(pullRequestUrl.pathname)
    && SHA.test(evidence.mergedCommit)
    && mergedAt !== null
    && deploymentUrl.href === `https://api.github.com/repos/${dependency.repository}/deployments/${deploymentUrl.pathname.split('/').pop()}`
    && /^[1-9][0-9]*$/.test(deploymentUrl.pathname.split('/').pop() ?? '')
    && deployedAt !== null
    && deployedAt >= mergedAt;
}

function validateActivationGate(gate, label, requiredDependencies) {
  if (!gate || typeof gate !== 'object' || Array.isArray(gate)) fail(`${label} has no activation gate`);
  if (Object.keys(gate).sort().join(',') !== 'dependencies,liveProof,state') fail(`${label} activation gate has unknown fields`);
  if (gate.state !== 'blocked' && gate.state !== 'ready') fail(`${label} activation state must be blocked or ready`);
  if (!Array.isArray(gate.dependencies) || gate.dependencies.length !== requiredDependencies.size) {
    fail(`${label} must declare its complete runtime dependency set`);
  }
  const seen = new Set();
  for (const dependency of gate.dependencies) {
    if (!dependency || typeof dependency !== 'object' || Array.isArray(dependency)) fail(`${label} has an invalid dependency`);
    if (Object.keys(dependency).sort().join(',') !== 'evidence,id,repository,requiredState') {
      fail(`${label} dependency ${dependency.id ?? '<unknown>'} has unknown fields`);
    }
    if (seen.has(dependency.id)) fail(`${label} repeats dependency ${dependency.id}`);
    seen.add(dependency.id);
    if (requiredDependencies.get(dependency.id) !== dependency.repository) {
      fail(`${label} dependency ${dependency.id} has the wrong repository`);
    }
    if (dependency.requiredState !== 'merged-and-deployed') {
      fail(`${label} dependency ${dependency.id} must require merged-and-deployed`);
    }
  }
  const allDependenciesProven = gate.dependencies.every(deploymentEvidenceIsValid);
  if (gate.state === 'ready' && !allDependenciesProven) {
    fail(`${label} may be ready only when every dependency carries merge and deployment evidence`);
  }
  if (gate.state === 'ready' && !integratedLiveProofIsValid(gate.liveProof)) {
    fail(`${label} may be ready only with immutable live label-to-turn-to-receipt proof`);
  }
  if (gate.state === 'ready') {
    const observedAt = timestampMillis(gate.liveProof.observedAt);
    if (observedAt > Date.now()) {
      fail(`${label} live proof observation may not be in the future`);
    }
    if (gate.dependencies.some(dependency => observedAt < timestampMillis(dependency.evidence.deployedAt))) {
      fail(`${label} live proof must postdate every dependency deployment`);
    }
  }
}

if (pluginCatalog.version !== 3 || !Array.isArray(pluginCatalog.plugins)) {
  fail('flow plugin catalog must be version 3');
}
if (recommendedCatalog.schemaVersion !== 1 || recommendedCatalog.catalogVersion !== 4 || !Array.isArray(recommendedCatalog.flows)) {
  fail('recommended flow catalog must be schemaVersion 1 and catalogVersion 4');
}

const plugin = pluginCatalog.plugins.find(entry => entry.name === 'babysitter');
const garden = recommendedCatalog.flows.find(flow => flow.id === 'software-factory');
const extension = garden?.extensions?.find(entry => entry.id === 'babysitter');
const babysitter = recommendedCatalog.flows.find(flow => flow.id === 'babysitter');
if (!plugin || !garden || !extension || !babysitter) fail('Babysitter must exist as a plugin, Garden extension, and recommended entry');

function validateExtensionContract(extension, label, baseFlowId, plugins) {
  if (!extension || typeof extension !== 'object' || Array.isArray(extension)) fail(`${label} is invalid`);
  const plugin = plugins.get(extension.id);
  if (!plugin) fail(`${label} has no supported plugin contract`);
  if (!plugin.base.includes(baseFlowId)) fail(`${label} is incompatible with this base flow`);
  validateActivationGate(extension.activation, label, REQUIRED_PLUGIN_DEPENDENCIES.get(extension.id));
  const ref = `github:${plugin.source.owner}/${plugin.source.repo}@${plugin.ref}#${plugin.source.path}`;
  if (!extension.artifact || extension.artifact.ref !== ref
    || extension.artifact.digest !== plugin.digest
    || extension.artifact.manifestSha256 !== plugin.manifestSha256) {
    fail(`${label} artifact coordinates drifted from its plugin contract`);
  }
  if (JSON.stringify(extension.runtime) !== JSON.stringify(plugin.runtime)) {
    fail(`${label} runtime provenance drifted from its plugin contract`);
  }
  if (JSON.stringify(extension.activation) !== JSON.stringify(plugin.activation)) {
    fail(`${label} activation gate drifted from its plugin contract`);
  }
}

/** Every published extension must use a supported, validated plugin contract. */
export function validateRecommendedExtensions(recommendedCatalog, pluginCatalog) {
  const plugins = new Map();
  for (const entry of pluginCatalog.plugins) {
    if (plugins.has(entry.name)) fail(`plugin catalog repeats ${entry.name}`);
    const requiredDependencies = REQUIRED_PLUGIN_DEPENDENCIES.get(entry.name);
    if (!requiredDependencies) fail(`${entry.name} has no independently defined dependency contract`);
    validateActivationGate(entry.activation, `plugin catalog ${entry.name}`, requiredDependencies);
    plugins.set(entry.name, entry);
  }
  const flowIds = new Set();
  for (const flow of recommendedCatalog.flows) {
    if (flowIds.has(flow.id)) fail(`recommended catalog repeats flow ${flow.id}`);
    flowIds.add(flow.id);
    if (typeof flow.defaultLabel !== 'string' || !flow.defaultLabel
      || !flow.inputs || typeof flow.inputs !== 'object' || Array.isArray(flow.inputs)
      || !flow.inputs.defaults || typeof flow.inputs.defaults !== 'object' || Array.isArray(flow.inputs.defaults)
      || !Array.isArray(flow.inputs.defaults.agents) || !Array.isArray(flow.inputs.allowedAgents)) {
      fail(`${flow.id} does not satisfy the Cloud recommended catalog consumer contract`);
    }
    if (flow.kind !== 'extension'
      && (flow.inputs.defaults.agents.length === 0 || flow.inputs.allowedAgents.length === 0)) {
      fail(`${flow.id} deployable flow agent sets must not be empty`);
    }
    if (flow.kind === 'extension') {
      if (typeof flow.baseFlowId !== 'string' || !flow.baseFlowId || flow.extension?.id !== flow.id) {
        fail(`${flow.id} must name its base flow and matching extension contract`);
      }
      validateExtensionContract(flow.extension, `recommended entry ${flow.id}`, flow.baseFlowId, plugins);
    }
    if (flow.extensions === undefined) continue;
    if (!Array.isArray(flow.extensions)) fail(`${flow.id} extensions must be an array`);
    const extensionIds = new Set();
    for (const extension of flow.extensions) {
      const label = `${flow.id} extension ${extension?.id ?? '<unknown>'}`;
      if (!extension || typeof extension !== 'object' || Array.isArray(extension)) fail(`${label} is invalid`);
      if (extensionIds.has(extension.id)) fail(`${label} is repeated`);
      extensionIds.add(extension.id);
      validateExtensionContract(extension, label, flow.id, plugins);
    }
  }
}

validateRecommendedExtensions(recommendedCatalog, pluginCatalog);

if (babysitter.kind !== 'extension' || babysitter.baseFlowId !== 'software-factory') {
  fail('Babysitter recommended entry must identify its Software Garden relationship');
}
if (babysitterBundle.name !== plugin.name || babysitterBundle.version !== extension.version
  || babysitterBundle.ref !== extension.artifact.ref
  || babysitterBundle.digest !== plugin.digest
  || babysitterBundle.manifestSha256 !== plugin.manifestSha256) {
  fail('Babysitter bundle identity drifted from its catalog contract');
}
if (!Array.isArray(babysitterBundle.files) || babysitterBundle.files.length === 0) {
  fail('Babysitter bundle has no files');
}
const bundleFiles = babysitterBundle.files.map(file => {
  if (!file || typeof file !== 'object' || file.encoding !== 'utf8' || typeof file.content !== 'string') {
    fail('Babysitter bundle contains an invalid file');
  }
  const data = Buffer.from(file.content, 'utf8');
  if (data.length !== file.bytes || createHash('sha256').update(data).digest('hex') !== file.sha256) {
    fail(`Babysitter bundle file ${file.path ?? '<unknown>'} failed integrity verification`);
  }
  return { path: file.path, data };
});
assertPluginArtifact(plugin, bundleFiles);
const manifestFile = babysitterBundle.files.find(file => file.path === 'flows-plugin.json');
if (!manifestFile || JSON.stringify(JSON.parse(manifestFile.content)) !== JSON.stringify(babysitterBundle.manifest)) {
  fail('Babysitter bundle manifest metadata drifted from flows-plugin.json');
}

if (plugin.runtime.package !== '@relayflows/sdk'
  || plugin.runtime.version !== '2.0.31'
  || plugin.runtime.release !== 'v2.0.31') {
  fail('Babysitter runtime must identify published @relayflows/sdk v2.0.31');
}

// Shape checks alone are not deployment proof. Only ready entries need live receipts.
for (const entry of pluginCatalog.plugins) {
  if (entry.activation.state !== 'ready') continue;
  for (const dependency of entry.activation.dependencies) await verifyDeploymentReceipt(dependency);
  await verifyIntegratedLiveProof(entry.activation.liveProof);
}

console.log('catalog gates: Babysitter metadata is pinned and activation is fail-closed');
