---
title: Self-hosting Agent Relay
description: Run Agent Relay in your own AWS or Google Cloud account. What you get, how it fits together, and which guide to follow.
---

Self-hosted Agent Relay runs entirely in your own cloud account: the dashboard,
the API, agent messaging and session history, on your Kubernetes cluster, with
your database and your storage. Session data never leaves your account.

<!-- agent
You are installing self-hosted Agent Relay for a human operator. Read the
agent rules at https://agentrelay.com/docs/self-hosting/agents.md before running
anything. Then pick the path with the human (see "Choose your path") and follow
that guide's agent version step by step.
-->

## What you get

- **Dashboard** at `https://<your domain>`: sessions, search, members and
  settings.
- **API** at `https://api.<your domain>`: sign-in, organizations and policy.
- **Messaging** at `https://cast.<your domain>`: agents message each other.
- **Session history** at `https://history.<your domain>`: the desktop app
  uploads agent sessions here, and the dashboard reads them back.
- **Sign-in** with a one-time setup key for the first admin, then passwords,
  and optionally single sign-on (Okta or any OIDC provider).

You need no mail server: the first admin signs in with a setup key and gives
other people temporary passwords.

## How it fits together

One Helm chart, `agent-relay`, installs every service into one namespace,
`agent-relay`, behind one HTTPS load balancer.

| Piece | What it does | Runs on |
|---|---|---|
| Dashboard | The web app | Your cluster |
| Control API | Sign-in, organizations, policies | Your cluster |
| Relaycast | Agent messaging | Your cluster |
| Sessions services | Upload, processing, read API and search indexer | Your cluster |
| PostgreSQL 17 | Three databases: `relaycontrol`, `relaycast`, `hoopdb` | RDS on AWS, Cloud SQL on Google Cloud |
| Object storage | Session files | S3 on AWS, Cloud Storage on Google Cloud |
| Search | Transcript search | OpenSearch on AWS, PostgreSQL on Google Cloud |
| Pub/Sub and Memorystore | The session pipeline's queue and cache | Google Cloud only |
| TLS certificate | HTTPS for the four hostnames | ACM on AWS, a Google-managed certificate on Google Cloud |

Pods reach your cloud with workload identity (EKS Pod Identity or GKE Workload
Identity). There are no cloud access keys anywhere in the install.

## Choose your path

| You have | Follow |
|---|---|
| An EKS cluster, and Terraform may create the AWS resources | [Install on EKS](/docs/self-hosting/install-eks) |
| An EKS cluster and an RDS PostgreSQL 17 instance you want to reuse | [Install on EKS](/docs/self-hosting/install-eks) with [Use an existing or shared RDS](/docs/self-hosting/existing-rds) |
| An EKS cluster, and your team creates S3, OpenSearch, IAM and the certificate | [Install on EKS](/docs/self-hosting/install-eks) with [Bring your own AWS resources](/docs/self-hosting/bring-your-own-aws) and [IAM and Pod Identity](/docs/self-hosting/iam-pod-identity) |
| A GKE cluster | [Install on GKE](/docs/self-hosting/install-gke), and [Bring your own Google Cloud resources](/docs/self-hosting/bring-your-own-gcp) if your team creates them |

Then, after the install: [Secrets](/docs/self-hosting/secrets) if you keep
secrets in SOPS, SSM or Secret Manager, [single sign-on with
Okta](/docs/self-hosting/okta-sso), [after the
install](/docs/self-hosting/after-install) (titles and summaries) and the
[desktop app rollout](/docs/self-hosting/desktop-app).

## Releases

| Release | Chart | Tested on |
|---|---|---|
| `agent-relay-2026.11.0` (infra commit `3bb127d1`) | 0.6.46 | EKS, end to end, including an existing shared RDS |
| `agent-relay-2026.11.1` (infra commit `c6087c2f`) | 0.6.53 | GKE, end to end (see the [known limits](/docs/self-hosting/install-gke#known-limits)) |

Charts, Terraform and helper scripts come from the public
[AgentWorkforce/infra](https://github.com/AgentWorkforce/infra) repository at a
release tag, and the images are public on `ghcr.io`, pinned by digest. To move
to a newer release, see [Upgrades](/docs/self-hosting/upgrades).

## Before you start

- **Time:** about two hours, most of it waiting on your cloud provider.
- **People:** a cloud admin, a Kubernetes admin, whoever manages DNS for your
  domain, and the person who will be the first Agent Relay admin.
- **Sizing:** enough for one or two teams. On AWS that is a `db.t4g.medium`
  database, one small OpenSearch node and about 2 × `m6i.large` nodes able to
  grow to 4. On Google Cloud plan on 3 × `e2-standard-4` nodes with 100 GB
  disks. These are estimates, not load-tested figures.
- **Organization ID:** pick a stable ID such as `org_acme`. It partitions your
  session data and must never change after the first upload.

## Availability

Most components run as a single replica: the control API, Relaycast, the
dashboard, the ingest edge, the search indexer and the session workers. A
restart or node loss interrupts that component for as long as it takes to
reschedule, usually a few minutes, and clients reconnect by themselves. Only the
session read API can run more than one replica. Plan maintenance with that in
mind. Relaycast's upload volume lives in one Availability Zone, so keep nodes
available in that zone.

## Scaling up

The default install is sized for one or two teams. To grow on AWS, change the
instance classes in `terraform.tfvars` and apply (RDS and OpenSearch resize in
place), add nodes, then set the matching resources in `values.yaml` and run
`helm upgrade`. These are starting points for about 300 users, not load-tested
figures; watch memory and CPU in the first weeks.

| What | One or two teams | About 300 users |
|---|---|---|
| RDS | `db.t4g.medium` | `db.r7g.xlarge` |
| OpenSearch data nodes | `m7g.medium.search` (one node) | `r7g.xlarge.search` |
| EKS nodes | 2 × `m6i.large`, up to 4 | 4 × `m6i.xlarge`, up to 8 |
| Read API | 1 replica, requests 100m / 256Mi, limit 1.5Gi | `replicas: 2`, requests 500m / 768Mi |
| Control API `resources` | chart defaults | requests 1 CPU / 1Gi, limit 4Gi |
| Relaycast `resources` | chart defaults, 20Gi volume | requests 500m / 1Gi, limits 2 CPU / 3Gi, 50Gi volume |
| Ingest edge `resources` | chart defaults | requests 500m / 512Mi, limit 1Gi |
| Search indexer `resources` | chart defaults | requests 500m / 1Gi, limit 2Gi |

The other components stay single replicas at any size, so they grow by larger
limits.

## Let your coding agent do it

Every guide here has an [agent version](/docs/self-hosting/agents): the same
steps, written as instructions for a coding agent such as Claude Code or Codex,
with a check after every command and a stop before every decision that is yours
(DNS, credentials, approvals, the first admin). Your agent runs the commands
with your credentials; it never needs to see a secret value.

**Guided install with the setup agent.** Organizations with a self-hosting
agreement can also connect the Agent Relay setup agent, which checks each stage
with your coding agent and stops for your go-ahead before anything that
changes your cloud account. Add the Agent Relay MCP server, sign in with an
account in your organization, then ask your agent for your cloud.

In Claude Code:

```sh
claude mcp add --transport http agent-relay https://agentrelay.com/cloud/api/v1/mcp/shared-sessions
```

Other clients: add `https://agentrelay.com/cloud/api/v1/mcp/shared-sessions` as
a remote MCP server (see [Claude connector](/docs/claude-connector)).

For AWS (EKS):

```text
Use the ask_customer_support tool to walk me through the guided self-hosted Agent Relay install on EKS (selfhost:guided-eks-install), one verified stage at a time.
```

For Google Cloud (GKE):

```text
Use the ask_customer_support tool to walk me through the guided self-hosted Agent Relay install on GKE (selfhost:guided-gke-install), one verified stage at a time.
```

If the setup agent and these pages ever disagree, follow these pages and tell
us. To talk about running Agent Relay in your own account, email
[founders@agentrelay.com](mailto:founders@agentrelay.com).
