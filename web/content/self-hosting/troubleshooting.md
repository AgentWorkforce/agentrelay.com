---
title: Troubleshooting
description: Fixes for the problems people actually hit installing and running self-hosted Agent Relay on EKS and GKE.
---

## First: stop and keep the evidence

Don't uninstall, roll back, delete volumes, retry migrations or rerun with
`--atomic`. Collect read-only evidence first, then fix forward:

```sh
helm -n agent-relay status agent-relay
helm -n agent-relay history agent-relay
kubectl -n agent-relay get jobs,deploy,statefulset,pods
kubectl -n agent-relay get events --sort-by=.lastTimestamp | tail -40
kubectl -n agent-relay logs job/<job name> --all-containers --tail=100
```

Remove any secret from logs before you share them. If nothing below matches,
go to [Support](/docs/self-hosting/support).

<!-- agent
Run only the read-only commands above without asking. Check every output for
secrets (URLs with passwords, tokens, keys, PEM blocks) and redact before
showing it. Propose a fix from this page, show the exact command, and ASK THE
HUMAN before running anything that changes the cluster or cloud account.
-->

## Expected during the install (not a problem)

- **The `search-indexer-bootstrap` Job fails after step 11,** with
  `consumer bootstrap: trusted credential probe unavailable`, and the read API,
  ingest edge and search indexer restart. Its database login doesn't exist until
  step 13 (`rds-setup.sh post` or `cloud-sql-setup.sh post`), which reruns it.
- **The search indexer restarts until the bootstrap Job completes** in step 13,
  with `permission denied for schema sessions`. It recovers once the bootstrap
  Job has rerun after `rds-setup.sh post`. Helm does not rerun a failed Job
  that keeps its name, so step 13 deletes it first and runs `helm upgrade`
  again.
- **`helm upgrade --install` prints `STATUS: deployed` with a failed migration
  Job.** Helm doesn't wait for Jobs here: always run the migration check.
- **On GKE, the Ingress has no address for 15 to 20 minutes after step 11,**
  and its events may show one `Translation failed ... no BackendConfig for
  service port exists` warning. The load balancer controller read the Services
  before their BackendConfigs; a later sync fixes it by itself. Worry only if
  the address is still empty, or the warning still repeats, after about 20
  minutes (see [step 14 of the GKE guide](/docs/self-hosting/install-gke#14-wait-for-the-certificate-and-check-up-to-60-minutes)).
- **On GKE, `/internal` and other closed paths answer 502.** The chart sends
  them to the `...-cast-edge-deny` Service, which has no endpoints on purpose.
  Without a Cloud Armor policy the load balancer answers 502 there, not 403 or
  404. This is not an outage: the four checks in step 14 tell you whether the
  install is up.

## Common problems

| Symptom | Likely cause and fix |
|---|---|
| `helm` stops with `agent-relay: N values problems. Nothing was installed.` (chart 0.7.87 and later) | Each numbered problem names the value, what is wrong and the fix. Fix them all, then run helm again; `scripts/selfhost/check-values.sh` with the same `-f` files lists them without a cluster. A `contradicts site.<key>` problem means a value is set both in `site:` and further down the file: delete the one further down |
| A pod shows `CreateContainerConfigError` | A Secret or key is missing. Recheck step 10, or [Secrets](/docs/self-hosting/secrets) |
| `helm install` stops with `AR_DB_LOGIN`, the `agent-relay-db-guard` Job fails, or the migration Jobs fail as listed under [Database logins](#database-logins) | A database URL uses the RDS master user or a login that doesn't exist: see [Database logins](#database-logins) |
| The control API exits at startup naming a variable | A Secret value is too short, or a URL isn't a public https origin |
| `ImagePullBackOff` | The nodes can't pull the image: check ECR or Artifact Registry pull access, and that the mirror copied the pinned digest |
| `cloud-sql-setup.sh pre` waits about 10 minutes, then says its Job did not succeed | On a new Google Cloud project the node service account has no roles, so the Job's image pull fails with `403`. Grant it `roles/artifactregistry.reader` on the mirror repository ([step 5 of the GKE guide](/docs/self-hosting/install-gke)), then run `pre` again |
| `billing account ... disabled` from Cloud Storage or Service Networking | Your Application Default Credentials use a quota project without billing: `gcloud auth application-default set-quota-project <project id>` |
| `PERMISSION_DENIED ... resourcemanager.projects.create` | You can't create projects in the organization. Someone with that permission and `billing.user` on the billing account creates the project, then grants you Owner on it |
| `no Locker credentials` in a worker log | `agent-relay-worker` has no Pod Identity association. Create it with the sessions role (step 6 of [Install on EKS](/docs/self-hosting/install-eks) lists every one to check), then `kubectl -n agent-relay rollout restart deploy` |
| S3 or OpenSearch `AccessDenied` | A Pod Identity association is missing, or the namespace or release name differs from Terraform's. Create it, then `kubectl -n agent-relay rollout restart deploy` |
| OpenSearch 403 | The role mapping in step 7 of the EKS guide is missing, or step 7 ran as the wrong role |
| Pods stay in `ContainerCreating` with `configmap "rds-ca" not found` | Nothing created the RDS CA. Set `site.rds: true` (with `site.region`), or `global.rdsCa.bundle` to your RDS region, in `values.yaml` and upgrade: the chart creates `rds-ca` |
| The install stops with `ConfigMap rds-ca already exists ... this release does not own it` | `rds-setup.sh pre` or an earlier install created it. Run `kubectl -n agent-relay delete configmap rds-ca`, then install again: the chart creates its own. Running pods keep their copy |
| The install says a `sha256` or `caSha256` `does not match the chart-managed RDS CA` | A hash is set by hand next to `global.rdsCa.bundle`. Delete it: the chart computes the hash |
| Self-signed or certificate errors to the database | `global.rdsCa.bundle` names another region than the database's: set the RDS region, or `global`, and upgrade. If you bring your own CA, its ConfigMap or hash is wrong |
| `PostgresTlsConfigError` on GKE | `cloud-sql-ca` doesn't match the pin in `managed-values.json`: see step 13 of the GKE guide |
| 504 from the load balancer on EKS | A load balancer subnet isn't listed in `values.yaml`'s `networkPolicy` blocks. Add its CIDR and upgrade |
| `Could not resolve host` in the smoke checks | DNS hasn't propagated yet: wait a couple of minutes |
| Sessions show as `Session · <id>` | Titles and summaries aren't on: see [After the install](/docs/self-hosting/after-install#3-turn-on-titles-and-summaries) |
| Output or digest endpoints answer `*_backfill_incomplete` | The coverage Job hasn't run: see [After the install](/docs/self-hosting/after-install#2-establish-output-and-digest-coverage) |
| The agent filter answers `501 agent_filter_not_ready`, or the dashboard says "The session agent index isn't ready yet" | Expected until you [activate it](/docs/self-hosting/after-install#4-optional-the-agent-name-filter); on GKE, [step 16 of the GKE guide](/docs/self-hosting/install-gke#16-turn-on-agent-search-once-after-first-sign-in) |
| Transcript reads answer `501` on GKE for sessions uploaded before an upgrade | Releases 2026.11.1 to 2026.11.5 recorded Cloud Storage sessions as if they were in S3. After upgrading, run [Re-stamp sessions uploaded before 2026.11.6](/docs/self-hosting/install-gke#re-stamp-sessions-uploaded-before-2026116-upgrades-only) once. A `501 turns_canonical_deadline` on a long session means the read deadline is too short: keep `READ_API_CANONICAL_DEADLINE_MS=15000` from the downloadable `values.yaml` |
| The setup key is refused with `409 admin_already_signed_in` | The admin already signed in another way. Sign in with that method; the key is only for the very first sign-in |
| The setup key is expired or lost | Mint a new one with the bootstrap token: step 16 of the EKS guide |

## Database logins

All of the symptoms below have one cause: a database URL in the install
Secrets logs in with the wrong login. Usually every URL uses the RDS master
user `postgres`, or the per-service logins were never created. Each service
needs its own login. `rds-setup.sh pre` (step 8) creates them and writes their
URLs in the right shapes, and step 10 creates the Secrets from those files.
Never put the master user in a Secret. If you write the Secrets yourself,
follow [RDS database setup by hand](https://github.com/AgentWorkforce/infra/blob/agent-relay-2026.11.21/docs/self-hosted-rds-manual-setup.md)
from step 1.3.

**`helm install` or `helm upgrade` refuses** (agent-relay-2026.11.21, chart
0.7.85, and later), and nothing is installed or changed:

```text
Error: INSTALLATION FAILED: execution error at (agent-relay/templates/db-guard.yaml:10:4):
AR_DB_LOGIN: the database credentials in this release's Secrets are wrong; nothing was installed or changed:
  - agent-relay-secrets: database-url logs in as "postgres" (the RDS master user). Each service needs its own login.
  - search-indexer-runtime: RELAYHISTORY_PIPELINE_CONSUMER_SECRET holds a bare URL; it must be JSON {"hoopdb_url":"postgresql://..."}.
```

Helm also refuses two services sharing one login, a missing Secret or key, and
a URL without a host. Helm can only read the Secrets on a real install or
`--dry-run=server`. `helm template` and a plain `--dry-run` skip the check.

**`failed pre-install: resource Job/agent-relay/agent-relay-db-guard ... Failed`**
means Helm connected with each URL and found a login with administrator
privileges, a wrong password or a database it can't reach. The reason is in
the Job's log:

```sh
kubectl -n agent-relay logs job/agent-relay-db-guard
```

**With an older chart, or with `databaseGuard.enabled=false`,** the same
mistake shows up later, as unrelated-looking migration failures:

- `relaycast-migrate` exits 65 after a list of `FAIL` checks (`not_createdb`,
  `no_role_memberships`, `owns_schema` and others) ending in
  `refusing: the session is not a correctly scoped owner identity`;
- `relay-control-migrate` crashes with a stack trace ending in
  `routine: 'get_role_oid'` (`role "control_api_runtime" does not exist`);
- `agent-relay-worker-migrate` logs `"error_code":"runtime_role_missing"`;
- everything else waits or restarts.

Fix the Secrets, delete the failed Jobs and run `helm upgrade` again.

## A migration Job failed

Read its log:

```sh
kubectl -n agent-relay logs job/<job name> --tail=100
```

Fix the cause, delete the failed Job, and run the same `helm upgrade` again,
which recreates it. A Job name includes a hash of its spec, so a changed
setting gives a new Job.

- **`role "<name>" does not exist`:** usually the logins were never created:
  see [Database logins](#database-logins). Otherwise the database's runtime
  role has another name than the chart expects. Check with your migration owner connection:
  `SELECT rolname FROM pg_roles WHERE rolname NOT LIKE 'pg_%' ORDER BY 1;`
  and share only role names.
- **`42501` with `role check failed bootstrap:...`:** the database roles weren't
  set up. Run `rds-setup.sh pre` (or `cloud-sql-setup.sh pre`) on a new install.
- **`"error_code":"rds_profile_unproven"` after a later `helm upgrade`:** if
  you installed with `configure-rds.sh`, it passed
  `~/.agent-relay-install/hoopdb-layout-values.yaml` as the last `-f` file. A
  later upgrade without it drops
  `sessions-pipeline.worker.migrations.rdsLayout: separate-database`. Add that
  file again, or copy its settings into your `values.yaml`, and upgrade.
- **The `search-indexer-bootstrap` Job failed with `SearchIndexError: search
  index: unavailable (network)` or `(credentials)`:** it can't reach OpenSearch,
  or has no AWS credentials to sign its requests. Check the OpenSearch URL, the
  VPC security group and the search indexer's Pod Identity association, then
  delete the Job and run `helm upgrade` again. Until it succeeds, the search
  indexer reports `permission denied for schema sessions`.
- **A migration checksum mismatch:** the image changed a migration the database
  already applied. Don't edit the migration ledger:
  [escalate](/docs/self-hosting/support) with the old and new image digests,
  the migration number and the Job log.
- **`field is immutable` on a migration Job during an upgrade:** delete the
  completed old Job and run the upgrade again.

## "already belongs to another HoopDb install"

One database instance holds only one Agent Relay install, because one of its
roles is server-wide. Use a separate instance.

## EKS: load balancer, certificate and Pod Identity

- **The Ingress has no hostname, or no healthy targets:** check the
  IngressClass is `alb`, that the AWS Load Balancer Controller is running, and
  that `values.yaml` admits the load balancer subnets' CIDRs.
- **TLS fails, or `https` origins are refused:** the ACM certificate must be
  `ISSUED` in the cluster's region and cover all four hostnames.
- **Requests to `//internal` reach the API:** the Ingress was edited by hand.
  Regenerate it with `eks-alb-ingress.sh` (step 14) rather than editing rules.
- **`CreateRule` AccessDenied on EKS Auto Mode:** custom tags on the load
  balancer. Auto Mode only allows its own tag keys; remove the tags.
- **The sessions bucket is denied, or a locker-init Job failed:** the Pod
  Identity associations were missing when the pods started. Create them,
  restart the pods, and recreate the failed Job.

## GKE: certificate, sockets and private clusters

### TLS resets on every host after adding a host

GKE uses one managed certificate for all hostnames. Adding a hostname replaces
the certificate, and the load balancer serves no valid certificate for any host
until the new one is `Active`, often 10 to 15 minutes. Schedule hostname changes
as maintenance, create the DNS record **before** adding the host, then wait:

```sh
kubectl -n agent-relay get managedcertificate -o wide
```

Don't roll back mid-provisioning: that starts another replacement.

### relay-control exits: signer and storage must be set together

relay-control restarts again and again, and its log ends with
`SELFHOST_DESKTOP_FEED_SIGNER and SELFHOST_DESKTOP_FEED_STORAGE must be set together`.
`desktop_feed_bucket_name` is set in `terraform.tfvars`, so
`managed-values.json` carries the desktop feed's storage settings, but the
feed's signing key isn't in place yet.

Keep the bucket, and take the storage settings out until the key exists. From
the install folder:

```sh
jq 'del(.["relay-control"].extraEnv)' managed-values.json > managed-values.tmp && mv managed-values.tmp managed-values.json
```

Also remove any `SELFHOST_DESKTOP_FEED_*` entries you copied into
`values.yaml`. The service account annotations can stay. Then run step 11's
`helm upgrade` command again. The Terraform in `agent-relay-2026.11.16` has
no setting that does this for you, so use the `jq` line.

When the key is in place, follow
[Signed desktop update feed](/docs/self-hosting/install-gke#signed-desktop-update-feed-optional):
its first item writes `managed-values.json` again with the storage settings.

### Other GKE issues

- **Certificate stuck in `Provisioning` or `FailedNotVisible`:** a hostname
  doesn't resolve to the reserved address yet, or a CAA record blocks
  `pki.goog`.
- **WebSockets on the cast host drop every 30 seconds:** the Relaycast Service
  isn't bound to the cast BackendConfig, so the load balancer keeps its
  30-second default. Keep `relaycast.service.backendConfig` from the GCP profile.
- **`kubectl` can't reach a private control plane:** use the cluster's DNS
  endpoint (`gcloud container clusters get-credentials <cluster> --location <region> --dns-endpoint`),
  or run the install from a machine inside the VPC with `--internal-ip`.
- **gcloud asks you to reauthenticate midway:** run `gcloud auth login` again in
  your own terminal. Never copy access tokens anywhere.
- **The database setup Job is evicted (`low on resource: ephemeral-storage`):**
  the nodes' disks are too small; use 100 GB.
- **Empty Secrets after a vals retry:** delete `secrets.yaml.dec` and run again
  (see [Secrets](/docs/self-hosting/secrets#vals-with-google-secret-manager)).

## The desktop app

- **Sessions don't appear:** check that the app is signed in to your domain,
  that the upload policy (**Settings › Policies**) allows them, and give it a
  minute or two.
- **Sessions inside WSL don't appear:** you need a desktop build from
  2026.11.11 or later.
- **Copilot chats in VS Code don't appear:** they're captured on VS Code 1.143
  or later with the default Copilot harness, not the older "Local" harness.
