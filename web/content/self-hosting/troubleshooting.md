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
  with `permission denied for schema sessions`. It recovers by itself.
- **`helm upgrade --install` prints `STATUS: deployed` with a failed migration
  Job.** Helm doesn't wait for Jobs here: always run the migration check.

## Common problems

| Symptom | Likely cause and fix |
|---|---|
| A pod shows `CreateContainerConfigError` | A Secret or key is missing. Recheck step 10, or [Secrets](/docs/self-hosting/secrets) |
| The control API exits at startup naming a variable | A Secret value is too short, or a URL isn't a public https origin |
| `ImagePullBackOff` | The nodes can't pull the image: check ECR or Artifact Registry pull access, and that the mirror copied the pinned digest |
| `cloud-sql-setup.sh pre` waits about 10 minutes, then says its Job did not succeed | On a new Google Cloud project the node service account has no roles, so the Job's image pull fails with `403`. Grant it `roles/artifactregistry.reader` on the mirror repository ([step 5 of the GKE guide](/docs/self-hosting/install-gke)), then run `pre` again |
| `billing account ... disabled` from Cloud Storage or Service Networking | Your Application Default Credentials use a quota project without billing: `gcloud auth application-default set-quota-project <project id>` |
| `PERMISSION_DENIED ... resourcemanager.projects.create` | You can't create projects in the organization. Someone with that permission and `billing.user` on the billing account creates the project, then grants you Owner on it |
| S3 or OpenSearch `AccessDenied` | A Pod Identity association is missing, or the namespace or release name differs from Terraform's. Create it, then `kubectl -n agent-relay rollout restart deploy` |
| OpenSearch 403 | The role mapping in step 7 of the EKS guide is missing, or step 7 ran as the wrong role |
| Self-signed or certificate errors to the database | The `rds-ca` ConfigMap or `__RDS_CA_SHA256__` is wrong: rerun `rds-setup.sh pre` before `post`, and compare the hash |
| `PostgresTlsConfigError` on GKE | `cloud-sql-ca` doesn't match the pin in `managed-values.json`: see step 13 of the GKE guide |
| 504 from the load balancer on EKS | A load balancer subnet isn't listed in `values.yaml`'s `networkPolicy` blocks. Add its CIDR and upgrade |
| `Could not resolve host` in the smoke checks | DNS hasn't propagated yet: wait a couple of minutes |
| Sessions show as `Session · <id>` | Titles and summaries aren't on: see [After the install](/docs/self-hosting/after-install#3-turn-on-titles-and-summaries) |
| Output or digest endpoints answer `*_backfill_incomplete` | The coverage Job hasn't run: see [After the install](/docs/self-hosting/after-install#2-establish-output-and-digest-coverage) |
| The agent filter answers `501 agent_filter_not_ready` | Expected until you [activate it](/docs/self-hosting/after-install#4-optional-the-agent-name-filter) |
| Transcript reads answer `501 turns_canonical_pointer_invalid` on GKE | A known limit of 2026.11.1 on Cloud Storage: see [Install on GKE](/docs/self-hosting/install-gke#known-limits) |
| The setup key is refused with `409 admin_already_signed_in` | The admin already signed in another way. Sign in with that method; the key is only for the very first sign-in |
| The setup key is expired or lost | Mint a new one with the bootstrap token: step 16 of the EKS guide |

## A migration Job failed

Read its log:

```sh
kubectl -n agent-relay logs job/<job name> --tail=100
```

Fix the cause, delete the failed Job, and run the same `helm upgrade` again,
which recreates it. A Job name includes a hash of its spec, so a changed
setting gives a new Job.

- **`role "<name>" does not exist`:** the database's runtime role has another
  name than the chart expects. Check with your migration owner connection:
  `SELECT rolname FROM pg_roles WHERE rolname NOT LIKE 'pg_%' ORDER BY 1;`
  and share only role names.
- **`42501` with `role check failed bootstrap:...`:** the database roles weren't
  set up. Run `rds-setup.sh pre` (or `cloud-sql-setup.sh pre`) on a new install.
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
