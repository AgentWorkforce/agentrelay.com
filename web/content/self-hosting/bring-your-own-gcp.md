---
title: Bring your own Google Cloud resources
description: Exact specs for creating Cloud SQL, Cloud Storage, Memorystore, Pub/Sub and the Workload Identity grants yourself, instead of with Terraform.
---

Use this page instead of step 4 of [Install on GKE](/docs/self-hosting/install-gke)
when your team creates every resource itself. Create everything in the **same
project and region as the GKE cluster**, on the **cluster's VPC**, then continue
at step 5.

Names in `<...>` are yours. The namespace (`agent-relay`) and the ServiceAccount
names are fixed: the Helm chart creates exactly these.

<!-- agent
These resources are created by the human's team, usually with their own
infrastructure code. Offer the specs; run a command only when the human asks
and approves it. Never put a password on a command line on the human's behalf.
-->

## 1. Network

The cluster's VPC needs **Private Services Access**: an allocated range and a
`servicenetworking.googleapis.com` peering. Cloud SQL and Memorystore both take
private addresses from it. Nothing in this install uses a public IP except the
load balancer.

## 2. Cloud SQL for PostgreSQL

| Setting | Value |
|---|---|
| Version | PostgreSQL **17** |
| Size for a first install | Enterprise, `db-custom-2-7680` (2 vCPU, 7.5 GB), 100 GB SSD with storage auto-increase |
| Availability | **Regional** (high availability) |
| Connectivity | **Private IP only** on the cluster VPC; public IP **off** |
| Server CA mode | **`GOOGLE_MANAGED_CAS_CA`** (shared CA). Required: the services verify the server with `sslmode=verify-full` against the instance's DNS name |
| SSL mode | `ENCRYPTED_ONLY` (no client certificates) |
| Backups | automated daily, 14 kept, point-in-time recovery on (7 days of logs) |
| Flags | `cloudsql.iam_authentication`, `log_connections`, `log_disconnections`, `log_checkpoints`, `log_lock_waits` = `on` |
| Extensions | `vector`, `pg_trgm`, `btree_gin` (created by `cloud-sql-setup.sh`) |
| Databases | none up front: `cloud-sql-setup.sh pre` creates `relaycontrol`, `relaycast` and `hoopdb` |

Create an admin login for the install, with its password in Secret Manager.
Don't use the `postgres` user; `cloud-sql-setup.sh` reads this login's password:

```sh
read -rs -p 'Password for agent_relay_admin: ' PW; echo
gcloud sql users create agent_relay_admin --instance <instance> --password "$PW"
printf '%s' "$PW" | gcloud secrets create agent-relay-pg-admin-password --data-file=- --replication-policy automatic
unset PW
```

`gcloud sql users create --password` puts the password on your own shell's
command line. If that isn't acceptable, set it in the console instead.

**The private DNS name.** With the shared CA, the server certificate names the
instance's DNS name, such as `<id>.<hash>.<region>.sql-psa.goog.`. The cluster
must resolve that name to the private IP:

```sh
gcloud sql instances describe <instance> --format='value(dnsNames[0].name,ipAddresses[0].ipAddress)'
gcloud dns managed-zones create <instance>-cloud-sql --visibility private \
  --networks <cluster VPC> --dns-name <that DNS name> --description 'Cloud SQL verified DNS'
gcloud dns record-sets create <that DNS name> --zone <instance>-cloud-sql --type A --ttl 300 --rrdatas <private IP>
```

**Done when:** from inside the cluster this prints `accepting connections`:

```sh
kubectl run pgcheck --rm -i --restart=Never \
  --image=<MIRROR_ROOT>/ghcr.io/cloudnative-pg/postgresql@sha256:ed6923f9ba2399cf9070379a353c710c29ced8a294be73986a2c3dae7e599ce3 \
  -- pg_isready -h <that DNS name> -p 5432 -t 10
```

## 3. Cloud Storage bucket for session data

| Setting | Value |
|---|---|
| Location | the cluster's region |
| Storage class | Standard |
| Access control | **uniform bucket-level access**; public access prevention **enforced** |
| Versioning | **on**, with a lifecycle rule deleting noncurrent versions after 30 days |
| Soft delete | 7 days (the default) |
| Lifecycle | abort incomplete multipart uploads after 7 days |
| Encryption | Google-managed, or a customer-managed key (see below) |

## 4. Memorystore for Redis

| Setting | Value |
|---|---|
| Tier | **Standard** (HA), 5 GB |
| Version | Redis 7.2 |
| Network | the cluster VPC, connect mode **Private Services Access** |
| In-transit encryption | **Server authentication** (TLS) |
| AUTH | **off**. The services don't send Redis credentials, so reachability is the control: keep the instance on a VPC that only the cluster and your admins can reach |
| Maintenance | any weekly window |

## 5. Pub/Sub

- Topic `<name>-pipeline`: message retention 7 days, storage restricted to the
  cluster's region.
- Topic `<name>-pipeline-dead-letter`: the same settings.
- Pull subscription `<name>-pipeline` on the first topic: ack deadline 600 s,
  retention 7 days, never expires, retry backoff 10 s to 600 s, dead-letter to
  `<name>-pipeline-dead-letter` after 8 attempts.
- Pull subscription `<name>-pipeline-dead-letter` on the dead-letter topic:
  retention 7 days, never expires (for inspecting failures).

## 6. Search and the certificate

**Search:** nothing to create. Transcript search is stored in Cloud SQL.

**Certificate:** nothing to create. The chart creates a Google-managed
certificate for `<domain>`, `api.<domain>`, `cast.<domain>` and
`history.<domain>`. You reserve the static IP and create the DNS records in
step 6 of the install. Want your own certificate from your CA instead? Talk to
us: the tested path is the Google-managed certificate.

## 7. Workload Identity grants

The pods get Google Cloud access through **GKE Workload Identity Federation**,
granted **directly to the Kubernetes ServiceAccounts**. There are no Google
service accounts, no service account keys and no HMAC keys. Every grant is on
one resource, never on the project.

Each Kubernetes ServiceAccount is addressed as (project **number** first, then
the project **id** in the pool name):

```text
principal://iam.googleapis.com/projects/<project NUMBER>/locations/global/workloadIdentityPools/<project id>.svc.id.goog/subject/ns/agent-relay/sa/<ServiceAccount>
```

| Resource | Role | Granted to |
|---|---|---|
| Sessions bucket | `roles/storage.objectUser` | `agent-relay-worker`, `agent-relay-session-ingest-api`, `agent-relay-read-api`, `agent-relay-search-indexer`, `agent-relay-alleyoop` |
| Topic `<name>-pipeline` | `roles/pubsub.publisher` | `agent-relay-worker`, `agent-relay-session-ingest-api` |
| Subscription `<name>-pipeline` | `roles/pubsub.subscriber` | `agent-relay-worker`, `agent-relay-search-indexer` |
| Topic `<name>-pipeline-dead-letter` | `roles/pubsub.publisher` | the Pub/Sub service agent `service-<project number>@gcp-sa-pubsub.iam.gserviceaccount.com` |
| Subscription `<name>-pipeline` | `roles/pubsub.subscriber` | the same Pub/Sub service agent (needed for dead-lettering) |
| Your Artifact Registry mirror | `roles/artifactregistry.reader` | the GKE node service account |
| The Cloud SQL admin password secret | `roles/secretmanager.secretAccessor` | **the person running the install** (not a pod) |

`agent-relay-alleyoop` isn't used by this install. The grant is harmless and
matches the tested setup. Nothing in the cluster needs a Cloud SQL or
Memorystore IAM role: the services connect over verified TLS with database
passwords.

Create the grants with your own tooling, or with the optional script that came
with step 1's files:

```sh
PROJECT_ID=<project id> BUCKET=<bucket> TOPIC=<name>-pipeline SUBSCRIPTION=<name>-pipeline \
DEAD_LETTER_TOPIC=<name>-pipeline-dead-letter bash create-workload-identity.sh
```

**Done when:** it ends with `done: 11 grants`. It is safe to rerun.

## Customer-managed keys

With a customer-managed KMS key (CMEK) on the bucket, Cloud SQL or the Pub/Sub
topics, grant `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the key to these
**service agents** before creating the resources:

- Cloud Storage: `service-<project number>@gs-project-accounts.iam.gserviceaccount.com`;
- Cloud SQL: `service-<project number>@gcp-sa-cloud-sql.iam.gserviceaccount.com`;
- Pub/Sub: `service-<project number>@gcp-sa-pubsub.iam.gserviceaccount.com`.

The pods themselves need no KMS role. CMEK wasn't covered by the GKE test.

## Who runs the install

The person running [Install on GKE](/docs/self-hosting/install-gke) needs, in
the project:

- to create the resources: Cloud SQL Admin, Storage Admin, Pub/Sub Admin, Cloud
  Memorystore Redis Admin, DNS Administrator (for the private Cloud SQL zone),
  Secret Manager Admin, Compute Network Viewer, and permission to set IAM
  policy on the resources above; or project Owner or Editor;
- `roles/container.developer` (or admin) on the cluster, plus Kubernetes RBAC to
  create a namespace and cluster-scoped objects;
- `roles/secretmanager.secretAccessor` on the Cloud SQL admin password secret.

## Then: the settings file

Generate the non-secret managed-services file that Terraform would have
written:

```sh
GCP_PROJECT_ID=<project id> REGION=<region> CLOUD_SQL_INSTANCE=<instance> \
SESSIONS_BUCKET=<bucket> REDIS_INSTANCE=<memorystore instance> \
PUBSUB_TOPIC=<name>-pipeline PUBSUB_SUBSCRIPTION=<name>-pipeline \
  bash managed-values-byo.sh > managed-values.json
```

**Done when:** `jq -r '.["sessions-pipeline"].worker.postgresCa.sha256' managed-values.json`
prints a 64-character hash.

In step 7 of the install, replace the six lines between `PG=` and `unset` in
`settings.sh` with:

```sh
export CLOUD_SQL_INSTANCE=<instance>
export CLOUD_SQL_HOST=<the instance DNS name, with its trailing dot>
export CLOUD_SQL_ADMIN_USER=agent_relay_admin
export CLOUD_SQL_ADMIN_SECRET_ID=agent-relay-pg-admin-password
export CLOUD_SQL_CA_SHA256="$(jq -r '.["sessions-pipeline"].worker.postgresCa.sha256' "$INSTALL_DIR/managed-values.json")"
export SESSIONS_BUCKET=<bucket>
```

Then continue with step 5 (images) and steps 6 to 15 as written.
