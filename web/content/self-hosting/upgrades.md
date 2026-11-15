---
title: Upgrades
description: Move a running install to a newer Agent Relay release safely - the EKS upgrader, manual GKE upgrades, and what to do if one fails.
---

Agent Relay releases are tags of the public
[AgentWorkforce/infra](https://github.com/AgentWorkforce/infra) repository,
named `agent-relay-<version>`, each with a signed chart, an image manifest and
checksums. Normally upgrade by moving to a whole release. Do not change one image digest
on its own; a coordinated patch requires the reviewed plan described below.

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

## Message receipts and Grok Bot

Message receipt lookup over MCP is available in **Control 0.5.24** and
**Relaycast 12.10.0**, published in component charts **relay-control 0.4.17**
and **relaycast 0.3.14**. Both services and their migrations are required.
Updating a Desktop app or refreshing the Helm repository index alone does not
upgrade those servers.

For an existing **agent-relay umbrella install**, choose a published whole
release whose image manifest contains both versions or a compatible newer
pair. A component chart release or an open suite candidate is not that release.
If no published suite contains the pair yet, [contact us](/docs/self-hosting/support)
for a reviewed coordinated patch plan for your existing chart and values.
Do not run two new component installs over workloads owned by the umbrella,
or change just one server image.

Keep the existing install's values, Secret references, database mode and image
mirror configuration. Review the backup and migration plan before applying any
upgrade. The cloud-specific steps below describe the normal whole-release
path; they do not authorize installing an unreleased candidate.

After all required migrations complete and both servers are healthy, reconnect the
bot's MCP connection and check that `get_relay_message_status` appears. Send
one authorized test message, retain its `message_id`, then check that ID using
the same sending identity. See [Messaging and Grok Bot](/docs/self-hosting/messaging)
for the receipt states, webhook wake-up setup and unconfirmed-message handling.

**Done when:** the intended image digests are running, both services'
migrations completed, the new MCP tool is listed, and you have either a
confirmed acknowledgment/reply or an explicitly reported unconfirmed message.

<!-- agent
Do not infer that a customer's server has upgraded because a chart or image
was published. Identify the existing Helm release and values-file order first.
Never print helm get values -a output or Secret data. Show a backup, migration
and image plan to the human before any cluster change. Missing receipts alone
never authorize resending a message or changing Desktop launch settings.
-->

### Coordinated receipt patch before a suite release

A paired image patch has been tested on an existing GKE install with its
original chart. **It has not been proven on AKS.** A full chart upgrade is a
separate qualification. For an Azure install, have your Agent Relay contact
review the existing release, database backend and backup plan before applying
this patch. The EKS upgrader does not support Azure.

This procedure keeps the deployed chart and every existing values file, in the
same order, and adds one final overlay. It changes only Relaycast and Control.
Use this patch only for SQLite or PostgreSQL Relaycast backends. If the install
uses the actors backend, stop for its separate compatibility plan. Do not
change backends or enable new features with this patch.

1. Record the deployed release, namespace, Helm revision, original chart archive
   and exact ordered values-file list. Keep these files private; they can
   contain credentials. Do not paste `helm get values --all` or Secret data
   into chat. If the original chart or values are missing, stop for support.
2. Back up **both** services' data and wait for a successful backup before
   continuing. PostgreSQL requires a database backup, including Control's
   database. For SQLite, quiesce writes and take a consistent copy or volume
   snapshot with Relaycast stopped; an Azure SQLite PVC has no automatic
   chart backup by default. Record the recovery procedure and backup IDs.
   See [Backup and restore](/docs/self-hosting/backup-and-restore) and the
   [infra backup runbook](https://github.com/AgentWorkforce/infra/blob/main/docs/selfhost-backup-restore.md).
3. Verify the published image attestations with `gh attestation verify` for
   both image references below. If your install uses a private image mirror,
   copy both images there and verify their digests before applying; preserve
   the existing repository settings. Do not switch the install to public
   registries as a shortcut.

Create `receipt-images.values.yaml` in your private install directory:

```yaml
relaycast:
  image:
    digest: sha256:ec062ef901af15cf575b53a71d7eb09f2e6ab6e7c0d5be2da35339a275a5c6cc
relay-control:
  image:
    digest: sha256:d1b6ca95fab240a9d41208d83de3b1f4245408b0765038762f1c419ee60f43bc
```

These are `ghcr.io/agentworkforce/relaycast-self-host:12.10.0` and
`ghcr.io/agentworkforce/relay-control:0.5.24`. **For a PostgreSQL Relaycast
backend**, also set `relaycast.runtime.postgres.image.digest` to the same
Relaycast digest in this overlay; that backend selects its image from this
separate key. Omit that addition for SQLite. Leave the database mode and all
other components unchanged.

Render with the original chart and original ordered `-f` arguments, then add
`-f receipt-images.values.yaml` **last**. Compare the rendered manifests with
the deployed manifests privately. Expected changes are the two server images
and their migration Job identities. Stop if anything else changes. Have the
operator approve this diff and the backup plan.

For example, an existing Azure-guide install uses the following order. Replace
the release, namespace and paths with those already used by that install; do
not run this example on a different install or substitute a new chart:

```sh
helm template <existing-release> <original-chart.tgz> -n <namespace> \
  -f <original-values-eks.yaml> -f <site-values.yaml> \
  -f <original-release-images.values.yaml> -f receipt-images.values.yaml

# Only after reviewing the render and completing the backups:
helm upgrade <existing-release> <original-chart.tgz> -n <namespace> \
  -f <original-values-eks.yaml> -f <site-values.yaml> \
  -f <original-release-images.values.yaml> -f receipt-images.values.yaml \
  --timeout 25m
```

Wait for Control's migration Job to complete. PostgreSQL Relaycast also has a
migration Job; SQLite migrates when its server starts, so check startup logs
and readiness instead. Wait for both Deployments to become ready, check the
API and Relaycast health endpoints and ingress, then perform the MCP receipt
check above. Store the overlay with the install's other values so the next
upgrade preserves it.

**Done when:** backups are recorded, the reviewed pair of digests is running,
all required migrations completed, both services are healthy, and the bot can
look up its own sent message. Publishing this procedure does not establish
that an Azure rollout has been tested or that a customer's install is upgraded.

If a migration or rollout fails, collect its status and logs and stop for
support. A Helm rollback does not restore the database. A downgrade needs a
reviewed backup-restore plan; do not assume the older images can use a migrated
schema.

<!-- agent
Do not turn this patch into an automatic customer upgrade. Confirm the actual
backend and original chart/values first. Keep rendered manifests and values
private. For Azure, say that this path has not been proven on AKS and obtain a
reviewed site-specific plan. Never run cluster commands from this guide without
the human's approval of the exact commands and completed backup evidence.
-->

## EKS

The upgrader, `scripts/selfhost/agent-relay-upgrade.sh` in the infra repository,
does the safe sequence for you. Plan-only by default, it:

1. downloads the release's chart, manifest, image overlay and checksums, checks
   every checksum and verifies the GitHub build attestations;
2. renders the chart with your values and prints every image and resource that
   would change; the last line is `plan: changes=true` or `plan: changes=false`;
3. mirrors exactly the release's image digests into your ECR. From a laptop
   that takes about 15 minutes; from CloudShell or an EC2 instance in the same
   region it's much faster.

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

**`checkout` refuses because of local changes?** That's the single-node
OpenSearch edit to `main.tf` from install step 4a. Keep it across the checkout,
because a later `terraform apply` without it grows the domain to six nodes:

```sh
git -C infra stash && git -C infra checkout "agent-relay-$AGENT_RELAY_VERSION" && git -C infra stash pop
```

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
with a new `runId`: lowercase letters, digits and dashes, at most 20
characters, for example `upgrade-2026-11-5`.

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
