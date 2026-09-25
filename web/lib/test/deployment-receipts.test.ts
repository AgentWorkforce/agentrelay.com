import { describe, expect, it, vi } from 'vitest';
import { verifyDeploymentReceipt } from '../../scripts/verify-deployment-receipts.mjs';

const repository = 'AgentWorkforce/cloud';
const api = `https://api.github.com/repos/${repository}`;
const evidence = {
  pullRequestUrl: `https://github.com/${repository}/pull/42`,
  mergedCommit: 'a'.repeat(40), mergedAt: '2026-09-24T12:00:00Z',
  deploymentUrl: `${api}/deployments/7`, deployedAt: '2026-09-24T12:05:00Z',
};
const dependency = { id: 'cloud-babysitter-capability-adapter', repository,
  requiredState: 'merged-and-deployed' as const, evidence };
const pr = { merged: true, base: { ref: 'main', repo: { full_name: repository } },
  html_url: evidence.pullRequestUrl, merge_commit_sha: evidence.mergedCommit, merged_at: evidence.mergedAt };
const deployment = { url: evidence.deploymentUrl, sha: evidence.mergedCommit,
  repository_url: api, environment: 'production', production_environment: true,
  transient_environment: false, created_at: '2026-09-24T12:01:00Z' };
const success = { state: 'success', environment: 'production', deployment_url: evidence.deploymentUrl,
  repository_url: api, created_at: evidence.deployedAt };
function requester(bodies: unknown[]) {
  return vi.fn<typeof fetch>().mockImplementation(async () => Response.json(bodies.shift()));
}

describe('authoritative dependency receipts', () => {
  it('checks the merged PR, exact production SHA and latest successful status', async () => {
    const request = requester([pr, deployment, [success]]);
    await expect(verifyDeploymentReceipt(dependency, request)).resolves.toBeUndefined();
    expect(request.mock.calls.map(call => call[0])).toEqual([
      `${api}/pulls/42`, `${api}/deployments/7`, `${api}/deployments/7/statuses?per_page=1`,
    ]);
  });
  it('rejects a nonexistent PR, private receipt, rate limit or failed request', async () => {
    for (const status of [404, 403, 429, 500]) {
      const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status }));
      await expect(verifyDeploymentReceipt(dependency, request)).rejects.toThrow('unavailable');
    }
    await expect(verifyDeploymentReceipt(dependency, vi.fn<typeof fetch>()
      .mockRejectedValue(new Error('network unavailable')))).rejects.toThrow();
  });
  it('refuses arbitrary URLs and mismatched repositories before making requests', async () => {
    const request = requester([]);
    for (const deploymentUrl of ['https://example.com/not-a-deployment', `${api}/deployments/7?fake=1`,
      'https://api.github.com/repos/other/repo/deployments/7']) {
      await expect(verifyDeploymentReceipt({ ...dependency, evidence: { ...evidence, deploymentUrl } }, request))
        .rejects.toThrow();
    }
    await expect(verifyDeploymentReceipt({ ...dependency, repository: 'other/repo' }, request)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it('rejects unmerged, wrong-commit, wrong-date and wrong-base PR receipts', async () => {
    for (const patch of [{ merged: false }, { merge_commit_sha: 'b'.repeat(40) },
      { merged_at: '2026-09-24T11:00:00Z' }, { base: { ref: 'other', repo: { full_name: repository } } }]) {
      await expect(verifyDeploymentReceipt(dependency, requester([{ ...pr, ...patch }])))
        .rejects.toThrow('PR receipt');
    }
  });
  it('rejects another SHA, staging, transient, and pre-merge deployments', async () => {
    for (const patch of [{ sha: 'b'.repeat(40) }, { environment: 'staging' },
      { production_environment: false }, { transient_environment: true },
      { created_at: '2026-09-24T11:00:00Z' }]) {
      await expect(verifyDeploymentReceipt(dependency, requester([pr, { ...deployment, ...patch }])))
        .rejects.toThrow('deployment receipt');
    }
  });
  it('rejects absent, failed, inactive, wrong-date or wrong-deployment statuses', async () => {
    for (const statuses of [[], [{ ...success, state: 'failure' }, success],
      [{ ...success, state: 'inactive' }], [{ ...success, created_at: '2026-09-24T12:04:00Z' }],
      [{ ...success, deployment_url: `${api}/deployments/8` }]]) {
      await expect(verifyDeploymentReceipt(dependency, requester([pr, deployment, statuses])))
        .rejects.toThrow('latest deployment status');
    }
  });
});
