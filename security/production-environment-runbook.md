# Production deployment environment runbook

Status: prepared; human execution required

This runbook creates the GitHub `production` environment that gates
`.github/workflows/deploy.yml`. An agent must not execute the settings change:
the shared agent identity is `willwashburn`, and an identity that can create,
edit, or delete its own gate is not constrained by that gate.

The environment needs two independent controls. Required reviewers and
prevent-self-review determine **who** may approve a deployment. A custom
deployment branch policy determines **what** may deploy by restricting the
environment to `main`. Neither control substitutes for the other.

## Required human decision

Chief must confirm the required reviewer before this runbook is executed.
CMO recommends `khaliqgant` (GitHub user ID `1724137`), the only known human
organization identity that is neither `willwashburn` nor a member of the
agent-oriented `claws` team. Do not substitute `willwashburn`; agents use that
credential and could approve their own deployment.

## Configure with the GitHub UI

1. As a human repository administrator, open **Settings → Environments** for
   `AgentWorkforce/agentrelay.com`.
2. Create an environment named exactly `production`.
3. Enable **Required reviewers** and add the chief-confirmed human reviewer.
4. Enable **Prevent self-review**.
5. Under **Deployment branches and tags**, select **Selected branches and
   tags**, add a custom deployment branch rule for exactly `main`, and do not
   enable the branch-protection-based option. This repository has no branch
   protection rules, so that option would not constrain the deployable ref.
6. Save the protection rules.

## Configure with the GitHub API

After chief confirms `khaliqgant`, a human repository administrator may run:

```bash
gh api --method PUT \
  repos/AgentWorkforce/agentrelay.com/environments/production \
  --input - <<'JSON'
{
  "wait_timer": 0,
  "prevent_self_review": true,
  "reviewers": [
    {
      "type": "User",
      "id": 1724137
    }
  ],
  "deployment_branch_policy": {
    "protected_branches": false,
    "custom_branch_policies": true
  }
}
JSON

gh api --method POST \
  repos/AgentWorkforce/agentrelay.com/environments/production/deployment-branch-policies \
  -f name=main
```

## Required read-back

The resident `agentrelay-com` agent must independently run this read-only check
after the human reports completion:

```bash
gh api repos/AgentWorkforce/agentrelay.com/environments/production \
  --jq '{name, protection_rules}'

gh api \
  repos/AgentWorkforce/agentrelay.com/environments/production/deployment-branch-policies \
  --jq '{total_count, branches: [.branch_policies[].name]}'
```

The workflow PR must not merge unless all of these are true:

- the response names `production`;
- `protection_rules` is non-empty;
- a `required_reviewers` rule names the chief-confirmed human reviewer; and
- the deployment-branch-policy response contains exactly one entry, `main`;
- `.github/workflows/deploy.yml` references `environment: production` on the
  `deploy-production` job.

The reviewer rule answers who can approve. The custom branch policy answers
what can deploy. Keeping `workflow_dispatch` is safe only when the environment
rejects every triggering ref except `main`.

Merging the workflow reference before the protection exists would allow GitHub
to auto-create an unprotected environment during a production deploy. That is
a phantom gate and is explicitly prohibited.
