import { FLOW_PLUGIN_IMPLEMENTATION_PULL_REQUESTS } from '../lib/flow-plugin-implementation-prs.mjs';
import { readFile } from 'node:fs/promises';
import { verifyDeploymentReceipt } from './verify-deployment-receipts.mjs';

const pluginCatalogUrl = new URL('../data/flow-plugin-catalog.v1.json', import.meta.url);
const recommendedCatalogUrl = new URL('../data/recommended-flow-catalog.v1.json', import.meta.url);

const [pluginCatalog, recommendedCatalog] = await Promise.all([
  readFile(pluginCatalogUrl, 'utf8').then(JSON.parse),
  readFile(recommendedCatalogUrl, 'utf8').then(JSON.parse),
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
  if (Object.keys(gate).sort().join(',') !== 'dependencies,state') fail(`${label} activation gate has unknown fields`);
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
}

if (pluginCatalog.version !== 3 || !Array.isArray(pluginCatalog.plugins)) {
  fail('flow plugin catalog must be version 3');
}
if (recommendedCatalog.schemaVersion !== 1 || recommendedCatalog.catalogVersion !== 3 || !Array.isArray(recommendedCatalog.flows)) {
  fail('recommended flow catalog must be schemaVersion 1 and catalogVersion 3');
}

const plugin = pluginCatalog.plugins.find(entry => entry.name === 'babysitter');
const garden = recommendedCatalog.flows.find(flow => flow.id === 'software-factory');
const extension = garden?.extensions?.find(entry => entry.id === 'babysitter');
if (!plugin || !garden || !extension) fail('Babysitter must exist in both catalogs');

for (const entry of pluginCatalog.plugins) {
  const requiredDependencies = REQUIRED_PLUGIN_DEPENDENCIES.get(entry.name);
  if (!requiredDependencies) fail(`${entry.name} has no independently defined dependency contract`);
  validateActivationGate(entry.activation, `plugin catalog ${entry.name}`, requiredDependencies);
}

validateActivationGate(
  extension.activation,
  'Software Garden Babysitter',
  REQUIRED_PLUGIN_DEPENDENCIES.get('babysitter'),
);

const pluginRef = `github:${plugin.source.owner}/${plugin.source.repo}@${plugin.ref}#${plugin.source.path}`;
if (extension.artifact.ref !== pluginRef
  || extension.artifact.digest !== plugin.digest
  || extension.artifact.manifestSha256 !== plugin.manifestSha256) {
  fail('Babysitter artifact coordinates drifted between catalogs');
}
if (JSON.stringify(extension.runtime) !== JSON.stringify(plugin.runtime)) {
  fail('Babysitter runtime provenance drifted between catalogs');
}
if (JSON.stringify(extension.activation) !== JSON.stringify(plugin.activation)) {
  fail('Babysitter activation gate drifted between catalogs');
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
}

console.log('catalog gates: Babysitter metadata is pinned and activation is fail-closed');
