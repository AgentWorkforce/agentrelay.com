---
title: Upgrades
description: Move a running install to a newer Agent Relay release safely - the EKS upgrader, manual GKE upgrades, and what to do if one fails.
---

Agent Relay releases are tags of the public
[AgentWorkforce/infra](https://github.com/AgentWorkforce/infra) repository,
named `agent-relay-<version>`, each with a signed chart, an image manifest and
checksums. Upgrade by moving to a whole release: never change one image digest
on its own.

## Rules for every upgrade

- **Back up first.** Every release can run database migrations, and a Helm
  rollback does **not** undo them. See [Backup and restore](/docs/self-hosting/backup-and-restore).
- **Read the release notes** of every release you skip, on the
  [releases page](https://github.com/AgentWorkforce/infra/releases).
- **Plan, review, then apply.** Look at what will change before anything does.
- **Check the migrations after.** Helm reports success even when a migration
  Job failed.
- Use `helm upgrade`, never `helm upgrade --install`, for a release that already
  exists. Don't add `--atomic`.

<!-- agent
Every upgrade changes the human's production install. ASK THE HUMAN for
approval after showing the plan, and again before any --apply. STOP and report
if the plan shows image changes outside the target release, or if a backup has
not been taken in the last 24 hours.
-->

## EKS

The upgrader, `scripts/selfhost/agent-relay-upgrade.sh` in the infra repository,
does the safe sequence for you. Plan-only by default, it:

1. downloads the release's chart, manifest, image overlay and checksums, checks
   every checksum and verifies the GitHub build attestations;
2. renders the chart with your values and prints every image and resource that
   would change; the last line is `plan: changes=true` or `plan: changes=false`;
3. mirrors exactly the release's image digests into your ECR.

With `--apply`, after you confirm, it takes an RDS snapshot and waits for it,
refreshes the database admin credentials, runs `helm upgrade`, and waits for
the migration Jobs and Deployments. On a failure it stops and prints the
previous Helm revision, the rollback command and the snapshot ID.

It needs `gh`, `jq`, `yq`, `helm`, `kubectl`, `aws`, `crane`, `openssl` and
`curl`, and takes credentials only from your normal AWS, Kubernetes and GitHub
environment. It always mirrors into an ECR registry in your account, so after
the first upgrade the install pulls its images from there, even if it pulled
from `ghcr.io` before. The nodes need ECR pull access (the default for EKS node
roles in the same account).

### 1. Check out the target release

```sh
cd agent-relay-install && source settings.sh
export AGENT_RELAY_VERSION=<target version, e.g. 2026.11.1>
git -C infra fetch --tags && git -C infra checkout "agent-relay-$AGENT_RELAY_VERSION"
```

**Done when:** `git -C infra describe --tags` prints `agent-relay-<target version>`.

### 2. Plan

```sh
export ECR_REGISTRY=<account>.dkr.ecr.<region>.amazonaws.com
export RDS_INSTANCE_ID=<rds instance id>
infra/scripts/selfhost/agent-relay-upgrade.sh \
  --version "$AGENT_RELAY_VERSION" --registry "$ECR_REGISTRY" \
  --profile eks-native --rds-setup --values "$INSTALL_DIR/values.yaml"
```

**Done when:** the last line is `plan: changes=true`, and you have reviewed the
image changes and the resource diff it printed.

### 3. Apply

```sh
infra/scripts/selfhost/agent-relay-upgrade.sh \
  --version "$AGENT_RELAY_VERSION" --registry "$ECR_REGISTRY" \
  --profile eks-native --rds-setup --values "$INSTALL_DIR/values.yaml" \
  --db-instance "$RDS_INSTANCE_ID" --apply
```

**Done when:** it completes without an error, and every migration Job and pod is
healthy:

```sh
kubectl -n agent-relay get jobs
kubectl -n agent-relay get pods
```

Then run step 15's checks from [Install on EKS](/docs/self-hosting/install-eks)
again, and the Output coverage step in
[After the install](/docs/self-hosting/after-install#2-establish-output-and-digest-coverage)
with a new `runId`, for example `upgrade-<version>`.

`--rds-setup` runs `rds-setup.sh refresh-admin`, which rewrites the two
credential files derived from the database admin login and updates their
Secrets. RDS can rotate that password, so this runs before every upgrade. If
you manage Secrets with [helm-secrets or vals](/docs/self-hosting/secrets),
rerun your secrets commands after it. Never run `rds-setup.sh pre` again.

### Installs older than 2026.11.0: two revisions for the scrubber

Installs made from these guides already run the strict secret scrubber
(`global.scrubEngine` in `values.yaml`). An older install with data in it must
move readers first, in a separate revision, before the writer changes:

```sh
cp "$INSTALL_DIR/values.yaml" /tmp/agent-relay-reader-first.yaml
yq -i '.global.scrubEngine.engine = "" | .global.scrubEngine.required = ""' /tmp/agent-relay-reader-first.yaml
infra/scripts/selfhost/agent-relay-upgrade.sh --version "$AGENT_RELAY_VERSION" --registry "$ECR_REGISTRY" \
  --profile eks-native --rds-setup --values /tmp/agent-relay-reader-first.yaml \
  --db-instance "$RDS_INSTANCE_ID" --apply
```

Check that every sessions Deployment is ready, every sessions Job completed, and
every services container has `READER_MAX_RULESET=10`. Then plan and apply again
with your real `values.yaml`. Never combine the two revisions on a populated
database, and keep the reader ceiling at 10 on any rollback.

## GKE

There is no automated upgrader on GKE yet. Upgrade by hand:

1. **Back up.** Take an on-demand Cloud SQL backup and wait for it:
   `gcloud sql backups create --instance "$CLOUD_SQL_INSTANCE"`.
2. **Get the new release.** In a new folder, repeat step 1 of
   [Install on GKE](/docs/self-hosting/install-gke) for the target version, and
   step 5 to mirror its images and write a new `release-images.values.yaml`.
   Keep your existing `values.yaml` and `managed-values.json`.
3. **Compare the profiles.** `diff -u <old>/release/agent-relay/values-gcp.yaml <new>/release/agent-relay/values-gcp.yaml`.
   Add any new required keys to your `values.yaml`.
4. **Review the change.** With the [helm-diff plugin](https://github.com/databus23/helm-diff),
   run step 11's command as `helm diff upgrade` instead of `helm upgrade --install`.
5. **Apply** with step 11's command, using `helm upgrade` and the new chart
   file. Put the new `release-images.values.yaml` last.
6. **Check** the migrations (step 12), the pods, and step 14's checks.

**Done when:** the three migration Jobs completed, every pod is ready, and
`api ok`, `cast ok`, `dashboard 200` and `history 401` print.

## If an upgrade fails

1. **Stop.** Don't retry, uninstall, roll back or delete anything yet.
2. **Keep the evidence:**

   ```sh
   helm -n agent-relay history agent-relay
   kubectl -n agent-relay get jobs,deploy,pods
   kubectl -n agent-relay get events --sort-by=.lastTimestamp | tail -40
   kubectl -n agent-relay logs job/<failed job> --all-containers --tail=200
   ```

3. **Find out which migrations ran.** If none did, fix the cause and run the
   upgrade again.
4. **If migrations ran,** the database is already on the new schema. A
   `helm rollback` leaves it there. Restore the backup you took (side by side,
   then switch traffic) unless the release notes say the previous version runs
   on the new schema. [Ask us](/docs/self-hosting/support) when in doubt.

<!-- agent
On a failed upgrade: collect the evidence above (check it for secrets before
showing it), then STOP and ask the human. Never run helm rollback, delete PVCs,
delete Jobs or restore a database without explicit approval.
-->
