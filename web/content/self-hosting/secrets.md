---
title: Secrets
description: Create the five Kubernetes Secrets the chart needs with plain kubectl, helm-secrets and SOPS, or vals with SSM Parameter Store or Google Secret Manager.
---

The chart reads five Kubernetes Secrets by name. `values.yaml` only names them,
so it holds no secret values. Pick **one** way to create them, at step 10 of
[Install on EKS](/docs/self-hosting/install-eks) or
[Install on GKE](/docs/self-hosting/install-gke).

| Way | Where the values live | Tested on |
|---|---|---|
| Plain `kubectl` (the install guides' step 10) | `~/.agent-relay-install` and the cluster | EKS and GKE |
| helm-secrets with SOPS | one encrypted values file you commit | EKS and GKE |
| vals with AWS SSM Parameter Store | SSM, as SecureString parameters | EKS |
| vals with Google Secret Manager | Secret Manager | GKE |

Every way ends with the same five Secrets in the `agent-relay` namespace. You can
also create them with External Secrets Operator or your own tooling, as long as
the Secret names and keys match the [reference](#what-is-in-each-secret) below.

<!-- agent
Never print, cat, base64-decode, diff or paste any secret value, secrets.yaml
before encryption, or any file under ~/.agent-relay-install. Verify Secrets by
name and key count only, for example:
kubectl -n agent-relay get secret agent-relay-secrets -o json | jq '.data | keys | length'
ASK THE HUMAN which way they use. Ask before storing values in SSM or Secret
Manager: that writes to their cloud account.
-->

## Before you start

- Run the database setup first (`rds-setup.sh pre` on EKS, `cloud-sql-setup.sh pre`
  on GKE): it writes the database credentials these Secrets carry.
- `helm-secrets-prepare.sh` came with step 1's files. It generates any missing
  keys, writes a tiny chart (`agent-relay-secrets-chart/`) that creates exactly
  the five Secrets, and a values file for it. It needs `python3` and `openssl`.
- Install the [helm-secrets plugin](https://github.com/jkroepke/helm-secrets)
  and, for vals, [vals](https://github.com/helmfile/vals).
- **Already created the Secrets with `kubectl`?** Delete those five first, so
  Helm can own them:

  ```sh
  kubectl -n agent-relay delete secret agent-relay-secrets agent-relay-read-api \
    agent-relay-ingest-edge-runtime search-indexer-runtime search-indexer-owner
  ```

## helm-secrets with SOPS

Every secret goes into one SOPS-encrypted values file.

```sh
bash helm-secrets-prepare.sh
sops -e secrets.yaml > secrets.enc.yaml && rm secrets.yaml
helm secrets upgrade --install agent-relay-secrets ./agent-relay-secrets-chart \
  --namespace agent-relay -f secrets.enc.yaml
kubectl -n agent-relay get secrets
```

`sops -e` uses your `.sops.yaml` rules. To name a key directly, use
`sops --encrypt --kms <AWS KMS key ARN>` or
`sops --encrypt --gcp-kms projects/<p>/locations/<loc>/keyRings/<ring>/cryptoKeys/<key>`.

**Done when:** the five Secrets are listed. Commit `secrets.enc.yaml` and
`agent-relay-secrets-chart/` wherever you keep encrypted config.

`secrets.yaml` is plaintext until you encrypt it: encrypt and delete it in the
same step, as above.

## vals with AWS SSM Parameter Store

The values live in SSM, and `secrets.yaml` keeps only references, so it's safe
to commit.

```sh
VALS_SSM=/agent-relay bash helm-secrets-prepare.sh
helm secrets --backend vals upgrade --install agent-relay-secrets ./agent-relay-secrets-chart \
  --namespace agent-relay -f secrets.yaml
kubectl -n agent-relay get secrets
```

This stores each value as a SecureString parameter under
`/agent-relay/<Secret>/<key>` (overwriting on rerun), and `secrets.yaml` holds
only `ref+awsssm://...` references. It needs the `aws` CLI and `AWS_REGION`. If
you run vals your own way, `vals eval -f secrets.yaml` resolves the same file.

**Done when:** it reports the number of values stored, and the five Secrets are
listed.

## vals with Google Secret Manager

```sh
VALS_GCPSM=$GCP_PROJECT_ID bash helm-secrets-prepare.sh
helm secrets --backend vals upgrade --install agent-relay-secrets ./agent-relay-secrets-chart \
  --namespace agent-relay -f secrets.yaml
kubectl -n agent-relay get secrets
```

This stores each value as a secret named `agent-relay--<Secret>--<key>` (a new
version on rerun), and `secrets.yaml` holds only `ref+gcpsecrets://...`
references. vals reads Secret Manager with Application Default Credentials
(`gcloud auth application-default login` on a laptop; Workload Identity or the
VM's service account in CI) and needs `roles/secretmanager.secretAccessor` on
the secrets.

**Done when:** the five Secrets are listed.

**`could not find default credentials`?** Run
`gcloud auth application-default login`, then **delete `secrets.yaml.dec`**
before you retry. helm-secrets reuses that file, and a failed run leaves it
empty, which installs empty Secrets.

## When to run it again

Rerun the same commands, so the chart-managed Secrets stay current, after:

- `rds-setup.sh refresh-admin` (before each EKS upgrade, see
  [Upgrades](/docs/self-hosting/upgrades));
- [adding Okta](/docs/self-hosting/okta-sso), which adds the
  `oidc-client-secret` key;
- adding the model API key for [titles and summaries](/docs/self-hosting/after-install)
  (that one is a separate Secret, `agent-relay-llm`).

Otherwise a later `helm upgrade` of `agent-relay-secrets` would drop the new key.

## What is in each Secret

| Secret | Key | Content |
|---|---|---|
| `agent-relay-secrets` | `database-url` | Control API runtime database URL |
| | `database-migrations-url` | Control API owner (migration) URL |
| | `HOOPDB_URL` | Sessions runtime URL |
| | `HOOPDB_MIGRATION_URL` | Sessions migration owner URL (the database admin login) |
| | `database-owner-url` | Relaycast owner URL |
| | `database-runtime-url` | Relaycast runtime URL |
| | `selfhost-bootstrap-token` | At least 32 bytes; mints a new setup key if one is lost |
| | `selfhost-encryption-key` | 64 hex characters (32 bytes) |
| | `relaycast-internal-secret` | At least 32 bytes |
| | `relaycast-workspace-bootstrap-secret` | At least 32 bytes |
| | `relaycontrol-introspect-secret` | At least 32 bytes |
| | `session-read-api-secret` | At least 32 bytes; the control API and the read API share it |
| | `SUMMARY_MASTER_KEYS` | `<key id>:<64 hex>` |
| | `selfhost-setup-key` | At least 32 bytes; the first admin's one-time key |
| | `oidc-client-secret` | Only with [single sign-on](/docs/self-hosting/okta-sso) |
| `agent-relay-read-api` | `RELAYHISTORY_READ_API_SECRET` | JSON with the read API's database URL |
| `agent-relay-ingest-edge-runtime` | `database-url` | The ingest edge's database URL |
| | `introspect-secret` | The same value as `relaycontrol-introspect-secret` |
| `search-indexer-runtime` | `RELAYHISTORY_PIPELINE_CONSUMER_SECRET` | JSON with the search consumer's runtime URL |
| `search-indexer-owner` | `RELAYHISTORY_PIPELINE_CONSUMER_SECRET` | JSON with the database admin URL |
| `agent-relay-llm` (optional) | `OPENAI_API_KEY` | Your model endpoint's API key |

Every database URL uses `sslmode=verify-full`, against the CA ConfigMap the
database setup created (`rds-ca` on EKS, `cloud-sql-ca` on GKE).

**Back up** `selfhost-encryption-key` and `SUMMARY_MASTER_KEYS`: data encrypted
with them can't be recovered without them.
