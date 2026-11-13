---
title: Self-hosting, for coding agents
description: Rules and runbooks for a coding agent installing or operating self-hosted Agent Relay on a human operator's behalf.
---

You are a coding agent installing or operating self-hosted Agent Relay in a
human operator's own cloud account, with their credentials. These runbooks are
the same steps as the human guides, with your checks and stop points added
under **Agent:**. Follow them in order.

## Rules

1. **Never print, log, paste or summarize a secret.** That includes passwords,
   API keys, tokens, the setup key, the bootstrap token, database URLs, PEM
   blocks, encryption keys, `SUMMARY_MASTER_KEYS`, kubeconfig files, Kubernetes
   Secret data, `helm get values -a` output, SSM or Secret Manager values, and
   every file under `~/.agent-relay-install`. Verify Secrets by name and key
   count only.
2. **Commands that print a credential are run by the human, not you:** the
   setup-key command, the bootstrap-token command, `add-user.sh`,
   `okta-setup.sh`, and any `read -rs` prompt. Ask them to run it in their own
   terminal and report only the outcome.
3. **Ask the human before every change** to their cloud account or cluster:
   `terraform apply` and `destroy`, IAM and Pod Identity or Workload Identity
   changes, `kubectl apply`, `create`, `delete`, `patch` and `scale`,
   `helm install`, `upgrade` and `uninstall`, storing values in SSM or Secret
   Manager, and anything that deletes data. Show the exact command first.
   Read-only commands (`get`, `describe`, `list`, `plan`, `curl` health checks)
   need no approval.
4. **Ask the human; never decide or invent:** the domain, the organization ID
   and name, the first admin's email, which subnets, VPC and security groups to
   use, whether to reuse an existing database, internet-facing or internal load
   balancer, and the telemetry level.
5. **DNS is the human's:** ask the DNS owner to create records, then poll until
   they resolve.
6. **Check every step's "Done when" before the next step.** If it doesn't hold,
   stop, show the evidence (with secrets removed), and use
   [Troubleshooting](/docs/self-hosting/agents/troubleshooting).
7. **Never recover by deleting.** No `helm rollback`, uninstall, PVC or Job
   deletion, `--atomic`, or migration retry unless the runbook says so and the
   human approves.
8. **Never edit a downloaded file or check to make it pass.** If a checksum, a
   release check or a script refuses, stop and report it.
9. **Keep a plain notes file** in the install folder with the human's answers
   and each step's result. Never put a secret in it.

## Pick the runbook

Ask the human which cloud they use, then which path (see the
[overview](/docs/self-hosting/agents/overview)):

- AWS EKS: [Install on EKS](/docs/self-hosting/agents/install-eks), plus
  [existing RDS](/docs/self-hosting/agents/existing-rds),
  [bring your own AWS resources](/docs/self-hosting/agents/bring-your-own-aws)
  or [IAM and Pod Identity](/docs/self-hosting/agents/iam-pod-identity) when
  they apply.
- Google Cloud GKE: [Install on GKE](/docs/self-hosting/agents/install-gke),
  plus [bring your own Google Cloud resources](/docs/self-hosting/agents/bring-your-own-gcp)
  when it applies.

Every runbook is also plain Markdown: append `.md` to its URL.
