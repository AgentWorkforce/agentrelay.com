import { FLOW_PLUGIN_IMPLEMENTATION_PULL_REQUESTS } from '../lib/flow-plugin-implementation-prs.mjs';

const REPOSITORIES = new Map([
  ['cloud-babysitter-capability-adapter', 'AgentWorkforce/cloud'],
  ['relay-native-existing-session-delivery', 'AgentWorkforce/relay'],
]);

/** Read-only, public GitHub receipts. Missing/private/rate-limited proof fails closed. */
export async function verifyDeploymentReceipt(dependency, request = fetch) {
  const repository = REPOSITORIES.get(dependency.id);
  const evidence = dependency.evidence;
  if (!repository || dependency.repository !== repository || !evidence) {
    throw new Error('dependency has no supported receipt contract');
  }
  if (!Object.hasOwn(FLOW_PLUGIN_IMPLEMENTATION_PULL_REQUESTS, dependency.id)
    || evidence.pullRequestUrl !== FLOW_PLUGIN_IMPLEMENTATION_PULL_REQUESTS[dependency.id]) {
    throw new Error('PR receipt does not identify the declared capability implementation');
  }
  const prPrefix = `https://github.com/${repository}/pull/`;
  const deploymentPrefix = `https://api.github.com/repos/${repository}/deployments/`;
  const id = (value, prefix) => typeof value === 'string' && value.startsWith(prefix)
    && /^[1-9][0-9]*$/.test(value.slice(prefix.length)) ? value.slice(prefix.length) : null;
  const pull = id(evidence.pullRequestUrl, prPrefix);
  const deployment = id(evidence.deploymentUrl, deploymentPrefix);
  if (!pull || !deployment) throw new Error('receipt must identify a PR and GitHub deployment in the required repository');
  const api = `https://api.github.com/repos/${repository}`;
  const read = async url => {
    const response = await request(url, {
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      redirect: 'error', signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`dependency receipt unavailable: HTTP ${response.status}`);
    return response.json();
  };
  const pr = await read(`${api}/pulls/${pull}`);
  if (pr.merged !== true || pr.base?.repo?.full_name !== repository || pr.base?.ref !== 'main'
    || pr.html_url !== evidence.pullRequestUrl || pr.merge_commit_sha !== evidence.mergedCommit
    || pr.merged_at !== evidence.mergedAt) {
    throw new Error('PR receipt does not prove the declared merge into main');
  }
  const receipt = await read(`${deploymentPrefix}${deployment}`);
  if (receipt.url !== evidence.deploymentUrl || receipt.sha !== evidence.mergedCommit
    || receipt.repository_url !== api || receipt.environment !== 'production'
    || receipt.production_environment !== true || receipt.transient_environment !== false
    || !Number.isFinite(Date.parse(receipt.created_at))
    || Date.parse(receipt.created_at) < Date.parse(evidence.mergedAt)) {
    throw new Error('deployment receipt does not prove this merged commit in production');
  }
  // GitHub lists the newest status first; a past success followed by failure/inactive is insufficient.
  const statuses = await read(`${deploymentPrefix}${deployment}/statuses?per_page=1`);
  const latest = Array.isArray(statuses) ? statuses[0] : null;
  if (!latest || latest.state !== 'success' || latest.environment !== 'production'
    || latest.deployment_url !== evidence.deploymentUrl || latest.repository_url !== api
    || latest.created_at !== evidence.deployedAt
    || Date.parse(latest.created_at) < Date.parse(receipt.created_at)) {
    throw new Error('latest deployment status does not prove the declared successful deployment');
  }
}
