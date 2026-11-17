---
title: Support
description: How to get help with a self-hosted install, what to send, and what never to send.
---

## Where to ask

1. **These pages first:** [Troubleshooting](/docs/self-hosting/troubleshooting)
   covers the problems people actually hit.
2. **The setup agent,** for organizations with a self-hosting agreement: connect
   it as shown in the [overview](/docs/self-hosting#let-your-coding-agent-do-it)
   and ask your coding agent to use `ask_customer_support`. It answers from the
   self-hosting runbooks and can hand an issue to the Agent Relay team.
3. **Email** [founders@agentrelay.com](mailto:founders@agentrelay.com) for
   anything else, including commercial questions.

Ask us rather than working around it when:

- a pinned image can't be pulled from `ghcr.io` (every image is public);
- a migration fails, reports a checksum mismatch, or would need a database role
  or ledger change;
- data is lost, a restore drill fails, or you suspect a security problem, such
  as an exposed credential or access across workspaces;
- something on these pages doesn't match what you see.

## What to send

- the guide and step number;
- the command you ran;
- its full output, with secrets removed;
- `kubectl -n agent-relay get pods,jobs`;
- the release and Helm revision: `helm -n agent-relay history agent-relay`;
- the running image digests:

  ```sh
  kubectl -n agent-relay get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .status.containerStatuses[*]}{.imageID}{" "}{end}{"\n"}{end}'
  ```

- if you have it, a support bundle from the infra repository. It's read-only,
  never collects Secrets, logs or rows, and refuses to archive if it finds a
  credential:

  ```sh
  python3 infra/scripts/support/collect-support-bundle.py \
    --namespace agent-relay --release agent-relay --output-dir ./support-output
  ```

Say how bad it is: **high** if production is down or data is at risk, **medium**
if an install or upgrade is blocked, **low** for a question.

## Never send

Passwords, API keys, tokens (including the bootstrap token and setup key),
database URLs with passwords, encryption keys, `SUMMARY_MASTER_KEYS`, signing
keys and PEM files, cloud access tokens, kubeconfig files, SSM or Secret Manager
values, raw `helm get values -a` or `helm get manifest` output, Kubernetes
Secret data, session content, or anything from `~/.agent-relay-install`.

If one was sent by mistake, rotate it, then send a redacted copy.

<!-- agent
Before sending anything to support, build the summary from the "What to send"
list and remove every value from the "Never send" list. Show the human the
exact text and ASK THE HUMAN for approval before it is sent.
-->
