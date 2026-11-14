---
title: Install on GKE
description: Install Agent Relay on an existing Google Kubernetes Engine cluster in 15 numbered steps, each with a check before you move on.
---

Run the steps in order. Copy each block, replace every `<...>`, and check the
**Done when** line before you move on. Expect about an hour and a half, most of
it waiting on Google Cloud: the HTTPS certificate alone can take up to an hour.

**Release:** `agent-relay-2026.11.3` (infra commit `a9b29222`, chart 0.7.8).
**Tested on GKE** end to end, on a private regional cluster (Kubernetes 1.35,
Workload Identity, a private control plane). Read [Known limits](#known-limits)
before a production rollout: transcript reads need the next release.

**You need:**

- Owner in the Google Cloud project (or the roles listed under
  [Who runs the install](/docs/self-hosting/bring-your-own-gcp#who-runs-the-install)),
  and `kubectl` admin on the GKE cluster;
- whoever manages DNS for your domain (step 6);
- the person who will be the first admin (step 15).

**The cluster:** GKE Standard with **Workload Identity** on, the **HTTP load
balancing** add-on on (the default), in a VPC with **Private Services Access**
configured: Cloud SQL and Memorystore get private IPs from it. For nodes, plan
on at least **3 × `e2-standard-4` with 100 GB disks**. Small nodes with 20 GB
disks run out of ephemeral storage while pulling the images.

**No cluster or project yet?** See [Starting from an empty project](#starting-from-an-empty-project)
at the end, then come back to step 1. Creating a project needs
`resourcemanager.projects.create` on the organization (or folder) and
`billing.user` on the billing account; many organizations grant those to only a
few people, so ask early.

**Network:**

- Steps 1, 4, 5 and 6 need only Google Cloud access, not `kubectl`. Start them
  while cluster access is being sorted out.
- Nothing connects to the database from your machine. Every database step runs
  as a short-lived Job inside the cluster, so Cloud SQL needs no public IP.

<!-- agent
Before step 1, ask the human for, and do not guess: the project ID, region,
cluster name, cluster VPC name, the app hostname (<domain>), whether their team
creates Cloud SQL/GCS/Memorystore/Pub/Sub themselves, the organization ID and
display name, and the first admin's email. Record them in a plain notes file in
the install folder. Never record passwords, keys or tokens there.
Tell the human about Known limits item 1 (transcript reads) before starting.
-->

## 1. Get the files

```sh
mkdir agent-relay-install && cd agent-relay-install
base=https://agentrelay.com/self-hosting/files/gke
curl -fsSLO "$base/SHA256SUMS"
for f in $(awk '{print $2}' SHA256SUMS); do curl -fsSLO "$base/$f"; done
shasum -a 256 -c SHA256SUMS
git clone https://github.com/AgentWorkforce/infra.git
git -C infra checkout agent-relay-2026.11.3
test "$(git -C infra rev-parse HEAD)" = a9b29222aee2a8347f6fa0c5a191d8f0a9a0fb8b && echo "release ok"
mkdir release && gh release download agent-relay-2026.11.3 -R AgentWorkforce/infra -D release
(cd release && shasum -a 256 -c SHA256SUMS && tar -xzf agent-relay-0.7.8.tgz) | tail -1
```

No `gh`? Download the same assets from the
[release page](https://github.com/AgentWorkforce/infra/releases/tag/agent-relay-2026.11.3)
into `release/`.

Tools: `gcloud` (with `gke-gcloud-auth-plugin`), `terraform` 1.11 or later (or
OpenTofu), `helm` 3, `kubectl`, `jq`, `yq`, `openssl`, `python3`, and
[`crane`](https://github.com/google/go-containerregistry/releases) for step 5.
Cloud Shell has everything except `crane` and a new enough Terraform.

**Helm 3, not Helm 4.** The chart is tested with Helm 3.10 or later. Helm 4 is
untested with this guide. If `helm version` prints `v4`, install Helm 3 beside
it (for example as `helm3`) and use it for steps 10, 11 and 13.

**Done when:** every `shasum` line in the install folder ends in `OK`,
`release ok` prints, and the last line is `release-notes.md: OK`.

<!-- agent
STOP if any checksum is not OK or "release ok" does not print.
-->

## 2. Connect to Google Cloud and the cluster

```sh
gcloud auth login && gcloud auth application-default login
gcloud config set project <project id>
gcloud services enable container.googleapis.com sqladmin.googleapis.com servicenetworking.googleapis.com \
  redis.googleapis.com pubsub.googleapis.com secretmanager.googleapis.com dns.googleapis.com \
  artifactregistry.googleapis.com compute.googleapis.com
gcloud container clusters get-credentials <cluster> --location <region>   # add --internal-ip for a private endpoint
kubectl auth can-i '*' '*' --all-namespaces
gcloud container clusters describe <cluster> --location <region> \
  --format='value(workloadIdentityConfig.workloadPool,addonsConfig.httpLoadBalancing.disabled)'
gcloud container node-pools list --cluster <cluster> --location <region> \
  --format='table(name,config.workloadMetadataConfig.mode)'
gcloud compute addresses list --global --filter='purpose=VPC_PEERING' --format='value(name,network)'
kubectl get storageclass
```

**Done when:**

- `can-i` prints `yes`;
- the `describe` line prints `<project id>.svc.id.goog` and nothing after it
  (HTTP load balancing is not disabled);
- every node pool shows `GKE_METADATA`;
- the `addresses` line lists a Private Services Access range on your cluster's
  VPC;
- one StorageClass is marked `(default)`.

**Private control plane?** Use the cluster's DNS endpoint
(`get-credentials --dns-endpoint`), or run the install from a machine inside the
VPC with `--internal-ip`.

**`billing account ... disabled` from Cloud Storage or Service Networking?**
Your Application Default Credentials bill API calls to a quota project that
has no billing. Point them at the install project:
`gcloud auth application-default set-quota-project <project id>`, or export
`GOOGLE_CLOUD_QUOTA_PROJECT=<project id>` and
`CLOUDSDK_BILLING_QUOTA_PROJECT=<project id>`.

<!-- agent
"gcloud auth login" and "application-default login" open a browser: ASK THE
HUMAN to complete them. Enabling services changes the project: ask first.
STOP and ask the human if any check fails.
-->

## 3. Using your own Cloud SQL, bucket or other resources? (skip if Terraform creates them)

Follow [Bring your own Google Cloud resources](/docs/self-hosting/bring-your-own-gcp)
instead of step 4, then continue at step 5.

## 4. Create the Google Cloud resources (Terraform, about 5 minutes)

This creates a regional Cloud SQL for PostgreSQL 17 instance (private IP only,
Google-managed shared CA, admin password in Secret Manager), the sessions
bucket, a Standard HA Memorystore for Redis with TLS, a Pub/Sub topic and
subscription with a dead-letter queue, a private DNS zone that resolves the
Cloud SQL certificate name inside your VPC, and the Workload Identity grants.
Every grant is on one resource, never on the project.

```sh
cd infra/terraform/examples/gcp
cat > terraform.tfvars <<'EOF'
project_id           = "<project id>"
region               = "<cluster region, e.g. us-central1>"
name                 = "agent-relay"
namespace            = "agent-relay"
release_name         = "agent-relay"
network_self_link    = "projects/<project id>/global/networks/<cluster VPC>"
sessions_bucket_name = "<globally unique bucket name, e.g. acme-agent-relay-sessions>"
deletion_protection  = true
image_mirror_repository = "agent-relay-mirror"   # step 5's registry, readable by the GKE nodes
# gke_node_service_account = "<email>"   # only if the node pool has its own service account
# kms_key_name = "projects/<p>/locations/<region>/keyRings/<ring>/cryptoKeys/<key>"   # optional CMEK
labels = { app = "agent-relay" }
EOF
grep -n '<' terraform.tfvars
terraform init
terraform plan -out tfplan
terraform apply tfplan
terraform output -json chart_values > ../../../../managed-values.json
cd -
```

**Done when:** the `grep` prints nothing, the plan shows `29 to add, 0 to
change, 0 to destroy` (27 without `image_mirror_repository`), the apply completes, and `managed-values.json` exists.

**Where the Terraform state lives.** The example has no `backend` block, so
`terraform init` keeps the state in a local file. To keep it in Cloud Storage
instead, create a private, versioned bucket and add a backend before
`terraform init`:

```sh
gcloud storage buckets create gs://<project id>-tfstate --location <region> \
  --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update gs://<project id>-tfstate --versioning
printf 'terraform {\n  backend "gcs" {}\n}\n' > backend_override.tf
terraform init -backend-config="bucket=<project id>-tfstate" -backend-config="prefix=agent-relay"
```

Either way, keep the state: upgrades and teardown need it.

- **`Error 403 ... servicenetworking`** or **`no private services access
  connection`:** the VPC has no Private Services Access. Your network team
  configures it on the cluster's VPC; then apply again.
- **CMEK:** first grant the Cloud SQL, Cloud Storage and Pub/Sub service agents
  `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the key (see
  [Bring your own Google Cloud resources](/docs/self-hosting/bring-your-own-gcp#customer-managed-keys)).

<!-- agent
Show the human the plan summary line. ASK THE HUMAN for approval before
"terraform apply". STOP if the plan changes or destroys an existing resource.
-->

## 5. Mirror the images to Artifact Registry

Copy the release images, by digest, into the registry step 4 created. Run this
from **Cloud Shell or a VM in Google Cloud**: there it takes about a minute,
from a laptop it can take half an hour.

```sh
REGION=<region>
export MIRROR_ROOT=$(terraform -chdir=infra/terraform/examples/gcp output -raw image_mirror_root)
gcloud auth print-access-token | crane auth login $REGION-docker.pkg.dev -u oauth2accesstoken --password-stdin
for ref in $(jq -r '.images[].ref' release/release-manifest.json); do
  crane copy "$ref" "$MIRROR_ROOT/${ref%@*}"
  [ "$(crane digest "$MIRROR_ROOT/$ref")" = "${ref#*@}" ] && echo "ok ${ref%@*}"
done
sed "s|__IMAGE_MIRROR_ROOT__|$MIRROR_ROOT|g" release/release-images.values.yaml > release-images.values.yaml
grep -c "$MIRROR_ROOT" release-images.values.yaml
```

The GKE **node service account** pulls these images. Step 4 granted it
`roles/artifactregistry.reader` on this repository only: the project's default
Compute Engine service account, or `gke_node_service_account`. Check which
account your node pool uses:

```sh
gcloud container node-pools list --cluster <cluster> --location $REGION --format='value(name,config.serviceAccount)'
```

`default` means the default Compute Engine service account. If it names another
account, set `gke_node_service_account` to it and apply step 4 again. In a new
project nothing else grants that read, and every pull fails with `403` (step
8's Job is the first pod that pulls).

**Done when:** `MIRROR_ROOT` is not empty, eight `ok` lines, and the `grep -c`
line prints a number above 10.

**Using a registry Terraform doesn't manage?** Leave `image_mirror_repository`
out of step 4, create the repository yourself, set
`MIRROR_ROOT=$REGION-docker.pkg.dev/<project id>/<repository>`, and grant the
node service account `roles/artifactregistry.reader` on it.

The release has eight images. A GKE install runs five of them (control API,
dashboard, Relaycast, the sessions services and the PostgreSQL client); the
other three are for other profiles, and mirroring them is harmless.

## 6. Reserve the IP address and point DNS at it (DNS owner)

The HTTPS certificate is a Google-managed certificate. Google issues it only
after all four names resolve to the load balancer's address, so create the
records now:

```sh
gcloud compute addresses create agent-relay-ingress --global --ip-version IPV4
gcloud compute addresses describe agent-relay-ingress --global --format='value(address)'
```

Create **A records** for `<domain>`, `api.<domain>`, `cast.<domain>` and
`history.<domain>`, all pointing at that address.

**Done when:** `dig +short api.<domain>` prints the address, for all four names.

**CAA records on your domain?** They must allow `pki.goog` and `letsencrypt.org`.

<!-- agent
Reserving the address changes the project: ask first. ASK THE HUMAN (DNS
owner) to create the four A records. Continue with steps 7 to 13 meanwhile.
-->

## 7. Create the settings file

```sh
cat > settings.sh <<'EOF'
export DOMAIN=<app hostname, e.g. ar.example.com>
export ORG_ID=<stable id, e.g. org_acme: never change it>
export ORG_NAME='<organization name>'
export ADMIN_EMAIL=<first admin's email>
export GCP_PROJECT_ID=<project id>
export REGION=<region>
export MIRROR_ROOT=<region>-docker.pkg.dev/<project id>/agent-relay-mirror
export NAMESPACE=agent-relay
export HELM_RELEASE=agent-relay
export STATIC_IP_NAME=agent-relay-ingress
export SERVICES_IMAGE=$MIRROR_ROOT/ghcr.io/agentworkforce/sessions-pipeline@sha256:42ccfba3c085d525846045a646b4c82cf8a849367ec94751934b3749fa90a36f
export PSQL_IMAGE=$MIRROR_ROOT/ghcr.io/cloudnative-pg/postgresql@sha256:ed6923f9ba2399cf9070379a353c710c29ced8a294be73986a2c3dae7e599ce3
export INSTALL_DIR="$PWD"   # run "source settings.sh" from the agent-relay-install folder
export CHART="$INSTALL_DIR/release/agent-relay"
TF="$INSTALL_DIR/infra/terraform/examples/gcp"
PG="$(terraform -chdir="$TF" output -json postgres)"
export CLOUD_SQL_INSTANCE="$(jq -r '.connection_name | split(":")[2]' <<<"$PG")"
export CLOUD_SQL_HOST="$(jq -r .dns_name <<<"$PG")"
export CLOUD_SQL_ADMIN_USER="$(jq -r .admin_username <<<"$PG")"
export CLOUD_SQL_ADMIN_SECRET_ID="$(jq -r .admin_password_secret_id <<<"$PG")"
export CLOUD_SQL_CA_SHA256="$(jq -r '.["sessions-pipeline"].worker.postgresCa.sha256' "$INSTALL_DIR/managed-values.json")"
export SESSIONS_BUCKET="$(jq -r '.["sessions-pipeline"].worker.locker.bucket' "$INSTALL_DIR/managed-values.json")"
unset PG TF
EOF
source settings.sh
bash -c 'source ./settings.sh; for v in DOMAIN ORG_ID ORG_NAME ADMIN_EMAIL GCP_PROJECT_ID REGION MIRROR_ROOT CLOUD_SQL_INSTANCE CLOUD_SQL_HOST CLOUD_SQL_ADMIN_USER CLOUD_SQL_ADMIN_SECRET_ID CLOUD_SQL_CA_SHA256 SESSIONS_BUCKET; do [ -n "${!v}" ] && [ "${!v}" != null ] && [[ "${!v}" != *"<"* ]] || echo "MISSING: $v"; done; echo "settings checked"'
```

**Brought your own resources (step 3)?** Replace the six lines between `PG=` and
`unset` with the values from
[Bring your own Google Cloud resources](/docs/self-hosting/bring-your-own-gcp#then-the-settings-file).

**Done when:** only `settings checked` prints.

**In every new terminal,** first run `cd agent-relay-install && source settings.sh`.

## 8. Set up the databases

```sh
bash cloud-sql-setup.sh pre
```

It creates the namespace, the `cloud-sql-ca` ConfigMap, the three databases and
their roles (in a Job inside the cluster), and writes every database credential
to `~/.agent-relay-install` (mode 0700). It reads the Cloud SQL admin password
from Secret Manager and never prints it.

**Done when:** it ends with `pre done`, after `tls: true` and
`extensions: btree_gin,pg_trgm,plpgsql,vector`.

Copy `~/.agent-relay-install` to your secret store: it holds the database
passwords. Never commit it. With Secret Manager, for example:

```sh
tar -C ~ -czf - .agent-relay-install | gcloud secrets create agent-relay-install-files \
  --project $GCP_PROJECT_ID --replication-policy automatic --labels app=agent-relay --data-file=-
```

Later copies add a version to the same secret: replace
`secrets create ... --replication-policy automatic --labels app=agent-relay`
with `secrets versions add`.

- **It waits about 10 minutes, then says the Job did not succeed:** look at the
  Job's pod (`kubectl -n $NAMESPACE describe pod -l job-name=agent-relay-cloud-sql-pre`).
  `ImagePullBackOff` or `403 Forbidden` means the node service account can't
  read the mirror: grant it as in step 5, then run `pre` again. Nothing was
  written to Cloud SQL, and the script recreates its Job.
- **`differs from CLOUD_SQL_CA_SHA256`:** `managed-values.json` is from an older
  apply. Rerun the last Terraform command of step 4, then `source settings.sh`.
- **The Job is evicted (`low on resource: ephemeral-storage`):** the nodes'
  disks are too small (see "The cluster" above).
- Run `pre` **once**, before step 11. After step 13 it refuses to run again, by
  design.

<!-- agent
Never print, cat or summarize any file under ~/.agent-relay-install.
-->

## 9. Fill in values.yaml

```sh
sed -i.orig -e "s|__NAMESPACE__|$NAMESPACE|g" -e "s|__ORG_ID__|$ORG_ID|g" \
  -e "s|__ORG_NAME__|$ORG_NAME|g" -e "s|__ADMIN_EMAIL__|$ADMIN_EMAIL|g" -e "s|__DOMAIN__|$DOMAIN|g" \
  -e "s|__REGION__|$REGION|g" -e "s|__SESSIONS_BUCKET__|$SESSIONS_BUCKET|g" \
  -e "s|__STATIC_IP_NAME__|$STATIC_IP_NAME|g" values.yaml
grep -n '__[A-Z_]*__' values.yaml
```

**Done when:** the only line printed is `__LLM_MODEL__`. You set that one later,
when you [turn on titles and summaries](/docs/self-hosting/after-install).

**Optional: co-branding.** The product stays Agent Relay; your logo goes beside
it. The sign-in page shows your square mark under the Agent Relay lockup, and
the dashboard shows one wide image with both logos. Put both PNGs in a
ConfigMap before step 11:

```sh
kubectl -n $NAMESPACE create configmap relay-brand \
  --from-file=mark.png=<your square mark>.png --from-file=cobrand.png=<Agent Relay + your logo>.png
```

Then uncomment the three "Optional co-branding" blocks in `values.yaml`
(`global.branding`, `relay-control.login`, `relay-webapp.customerProfile`) and
fill in their placeholders. For a branded desktop app,
`customerProfile.desktop` takes that build's link scheme and site.
`$CHART/values-branding-example.yaml` explains each value.

## 10. Create the secrets

This generates the remaining keys and creates the five Kubernetes Secrets.
Nothing is printed.

```sh
S=~/.agent-relay-install/secret-files
( umask 077
for k in selfhost-bootstrap-token selfhost-setup-key relaycast-internal-secret \
         relaycast-workspace-bootstrap-secret relaycontrol-introspect-secret session-read-api-secret \
         selfhost-encryption-key; do
  [ -s "$S/agent-relay-secrets/$k" ] || openssl rand -hex 32 | tr -d '\n' > "$S/agent-relay-secrets/$k"
done
[ -s "$S/agent-relay-secrets/SUMMARY_MASTER_KEYS" ] || printf 'k1:%s' "$(openssl rand -hex 32)" > "$S/agent-relay-secrets/SUMMARY_MASTER_KEYS"
cp "$S/agent-relay-secrets/relaycontrol-introspect-secret" "$S/agent-relay-ingest-edge-runtime/introspect-secret" )
for name in agent-relay-secrets agent-relay-read-api agent-relay-ingest-edge-runtime \
            search-indexer-runtime search-indexer-owner; do
  kubectl -n $NAMESPACE create secret generic "$name" --from-file="$S/$name" \
    --dry-run=client -o yaml | kubectl apply -f -
done
```

**Done when:** five lines end in `created`. Copy `~/.agent-relay-install` to
your secret store again (step 8 shows how): it now holds the encryption keys.

**Keep your secrets in SOPS (for example with Cloud KMS) or Google Secret
Manager?** Use one of the options in [Secrets](/docs/self-hosting/secrets)
instead of this block. vals with Google Secret Manager is tested on GKE.

## 11. Install with Helm

```sh
helm upgrade --install $HELM_RELEASE "$INSTALL_DIR/release/agent-relay-0.7.8.tgz" --namespace $NAMESPACE \
  -f "$CHART/values-gcp.yaml" -f "$CHART/values-gcp-native.yaml" \
  -f "$INSTALL_DIR/managed-values.json" -f "$INSTALL_DIR/values.yaml" \
  -f "$INSTALL_DIR/release-images.values.yaml" --timeout 25m
```

The order matters: the two GCP profiles, then Terraform's managed services,
then your site values, then the release images **last**. Without
`release-images.values.yaml` you would get the previous release's images.

**Done when:** it prints `STATUS: deployed`. Don't add `--wait`.

<!-- agent
ASK THE HUMAN for approval before this helm command. STOP if a release named
agent-relay already exists in the namespace: that is an upgrade.
-->

## 12. Wait for the database migrations

```sh
for j in $(kubectl -n $NAMESPACE get jobs -o name | grep -E 'relay-control-migrate|relaycast-migrate|agent-relay-worker-migrate'); do
  kubectl -n $NAMESPACE wait --for=condition=complete "$j" --timeout=20m
done
```

**Done when:** three lines say `condition met` (about 2 minutes).

**Expected at this point:** the read API, ingest edge, search indexer and the
`search-indexer-bootstrap` Job fail. Step 13 fixes them.

## 13. Switch on the service logins

```sh
bash cloud-sql-setup.sh post
kubectl -n $NAMESPACE rollout restart deploy/agent-relay-read-api deploy/agent-relay-ingest-edge deploy/agent-relay-search-indexer
for j in $(kubectl -n $NAMESPACE get jobs -o name | grep search-indexer-bootstrap); do kubectl -n $NAMESPACE delete "$j"; done
helm upgrade --install $HELM_RELEASE "$INSTALL_DIR/release/agent-relay-0.7.8.tgz" --namespace $NAMESPACE \
  -f "$CHART/values-gcp.yaml" -f "$CHART/values-gcp-native.yaml" \
  -f "$INSTALL_DIR/managed-values.json" -f "$INSTALL_DIR/values.yaml" \
  -f "$INSTALL_DIR/release-images.values.yaml" --timeout 25m
kubectl -n $NAMESPACE wait --for=condition=complete "$(kubectl -n $NAMESPACE get jobs -o name | grep search-indexer-bootstrap)" --timeout=10m
kubectl -n $NAMESPACE rollout status deploy --timeout=10m
kubectl -n $NAMESPACE get pods
```

**Done when:**

- `post done` prints after three `login ok ... tls=true` lines;
- the bootstrap Job shows `condition met`;
- every pod is `Running` and ready (completed Jobs show `Completed`).

**`PostgresTlsConfigError` in the read API, ingest edge or indexer logs:** the
`cloud-sql-ca` ConfigMap doesn't match the pin in `managed-values.json`.
Compare `kubectl -n $NAMESPACE get cm cloud-sql-ca -o jsonpath='{.data.ca\.crt}' | sha256sum`
with `echo $CLOUD_SQL_CA_SHA256`.

## 14. Wait for the certificate and check (up to 60 minutes)

```sh
kubectl -n $NAMESPACE get managedcertificate agent-relay -o jsonpath='{.status.certificateStatus}{"\n"}'
```

Repeat until it prints `Active`. Then:

```sh
curl -fsS "https://api.$DOMAIN/readyz" && echo " api ok"
curl -fsS "https://cast.$DOMAIN/health" && echo " cast ok"
curl -fsS -o /dev/null -w "dashboard %{http_code}\n" "https://$DOMAIN/"
curl -s -o /dev/null -w "history %{http_code}\n" "https://history.$DOMAIN/v1/sessions"
```

**Done when:** `Active`, then `api ok`, `cast ok`, `dashboard 200` and
`history 401`.

- **Still `Provisioning` after an hour:** one of the four names doesn't resolve
  to the address from step 6, or a CAA record blocks Google. Fix DNS; the
  certificate retries by itself.
- **`FailedNotVisible`:** the same: DNS doesn't point at the load balancer yet.
- **502 for a few minutes after `Active`:** the load balancer's health checks
  are still converging. Wait 5 minutes.

<!-- agent
Poll the certificate status every 2 minutes for up to 60 minutes. Do not
change the Ingress or ManagedCertificate while it provisions: a change restarts
provisioning.
-->

## 15. First sign-in, then add users

The first admin does this **before signing in any other way**, including from
the desktop app:

```sh
kubectl -n $NAMESPACE get secret agent-relay-secrets -o jsonpath='{.data.selfhost-setup-key}' | base64 -d; echo
```

1. Open `https://<domain>/login` and choose **First-time setup: enter setup
   key**.
2. Paste the key and choose a password.

**No `kubectl` from the admin's machine?** With a private control plane, the
first admin often can't reach the cluster. Whoever runs the install does the
same first sign-in through the API instead, without the key or the password
ever being shown:

```sh
bash first-admin.sh "$DOMAIN" "$GCP_PROJECT_ID" "$NAMESPACE"
```

It stores a generated password in Secret Manager as
`agent-relay-first-admin-password`, then posts it with the setup key, and
prints `first admin set`. The admin then reads the password with
`gcloud secrets versions access latest --secret agent-relay-first-admin-password --project <project id>`
and signs in at `https://<domain>/login`. The setup key works once, within 24
hours: the script never retries, and it stops if the secret already exists. A
`403 csrf_rejected` means the request lacked your dashboard's origin; it is
refused before the key is read, so the key stays unused.

Then add users:

```sh
bash add-user.sh "$DOMAIN"
```

It prints a temporary password for each user; they choose their own at first
sign-in.

**Done when:** the admin is signed in to the dashboard.

<!-- agent
Do NOT run the setup-key command or add-user.sh yourself: each prints a
credential. ASK THE HUMAN (the first admin) to run them in their own terminal
and to tell you only "signed in" when done.
Run first-admin.sh only if the human explicitly asks you to. It prints no
credential. STOP on anything but "first admin set".
-->

## Next

- **Before people start:** in the dashboard, under **Settings › Policies**, set
  what the desktop app uploads.
- **Desktop app:** [Desktop app rollout](/docs/self-hosting/desktop-app).
- **Search:** transcript search is stored in Cloud SQL (`search.backend:
  postgres`); there is no search cluster to run.
- **Problems:** [Troubleshooting](/docs/self-hosting/troubleshooting), then
  [Support](/docs/self-hosting/support).

## Known limits

What release `agent-relay-2026.11.3` does not yet qualify on GKE:

1. **Transcript reads on Cloud Storage: fixed, check pending.** The 2026.11.1
   sessions image recorded every upload as stored in S3, even when it was in
   Cloud Storage, so transcript reads (`GET /v1/sessions/<id>/turns`) answered
   `501 turns_canonical_pointer_invalid`. This release's sessions image records
   the configured store, so a fresh install writes correct records from the
   start. An install upgraded from 2026.11.1 keeps its older records as they
   were. The transcript-read check on a GKE install with this image is pending.
2. **The release image overlay is the EKS one.** The images are cloud-neutral
   and this guide applies the overlay on GKE, which the test proved, but the
   release pipeline doesn't produce or check a GKE overlay yet.
3. **No automated install or upgrade on GKE.** The release upgrader supports
   only EKS. On GKE the install is the manual sequence above, and upgrades are
   manual Helm upgrades with a Cloud SQL backup first.
4. **Search runs in PostgreSQL, not OpenSearch.** Fine for a first install;
   search at large scale on GKE isn't load tested.
5. **Memorystore without AUTH.** The services can't send Redis credentials, so
   the instance uses TLS with AUTH off. Keep it reachable only from the
   cluster's VPC.
6. **Not highly available.** The control API, dashboard, Relaycast and search
   indexer each run one replica, as on EKS.
7. **Not covered by the test:** customer-managed encryption keys, GKE Autopilot,
   Shared VPC, single sign-on, titles and summaries with a model, and a live
   desktop app upload (the upload path was proven with a test driver).
8. **Desktop builds for a GKE install don't update themselves.** The signed
   desktop release feed that the control API can serve signs with AWS KMS and
   stores in S3 only. A desktop build for a GKE install works, but a newer
   version means installing the new build over the old one. See
   [Desktop app rollout](/docs/self-hosting/desktop-app).

## Starting from an empty project

The steps above assume a GKE cluster in a VPC with Private Services Access.
If you have neither, this creates a dedicated project with a minimal shape that
meets "The cluster" at the top: private nodes, Cloud NAT for their outbound
traffic, and a public control plane open only to the addresses you list. Change
the ranges if they overlap your other networks.

```sh
P=<project id>; R=<region, e.g. us-central1>
gcloud projects create $P --organization <organization id> --labels app=agent-relay
gcloud billing projects link $P --billing-account <billing account id>
gcloud config set project $P
gcloud services enable container.googleapis.com compute.googleapis.com servicenetworking.googleapis.com \
  cloudresourcemanager.googleapis.com iam.googleapis.com storage.googleapis.com
gcloud compute networks create agent-relay-vpc --subnet-mode custom
gcloud compute networks subnets create agent-relay-subnet --network agent-relay-vpc --region $R \
  --range 10.10.0.0/20 --secondary-range pods=10.20.0.0/16,services=10.30.0.0/20 \
  --enable-private-ip-google-access
gcloud compute addresses create agent-relay-psa --global --purpose VPC_PEERING \
  --prefix-length 16 --network agent-relay-vpc --addresses 10.40.0.0
gcloud services vpc-peerings connect --service servicenetworking.googleapis.com \
  --network agent-relay-vpc --ranges agent-relay-psa
gcloud compute routers create agent-relay-router --network agent-relay-vpc --region $R
gcloud compute routers nats create agent-relay-nat --router agent-relay-router --region $R \
  --auto-allocate-nat-external-ips --nat-all-subnet-ip-ranges
gcloud container clusters create agent-relay --location $R --num-nodes 1 \
  --machine-type e2-standard-4 --disk-type pd-balanced --disk-size 100 \
  --network agent-relay-vpc --subnetwork agent-relay-subnet --enable-ip-alias \
  --cluster-secondary-range-name pods --services-secondary-range-name services \
  --workload-pool=$P.svc.id.goog --workload-metadata=GKE_METADATA \
  --addons HttpLoadBalancing,GcePersistentDiskCsiDriver --release-channel regular \
  --enable-private-nodes --master-ipv4-cidr 172.16.0.0/28 \
  --enable-master-authorized-networks --master-authorized-networks <your IP>/32 \
  --enable-shielded-nodes
```

A regional cluster with `--num-nodes 1` gets one node in each of the region's
three zones. Then continue at step 1 with `<cluster>` = `agent-relay` and
`<cluster VPC>` = `agent-relay-vpc`, and grant the node service account in step 5.
Run everything that needs `kubectl` from an address in the authorized list.

**Done when:** step 2's checks pass on the new cluster.

<!-- agent
Creating a project, linking billing and every resource here are changes: show
the human the exact commands with their values and ASK THE HUMAN before
running them. If project creation is denied, STOP: a person with
resourcemanager.projects.create runs the first two commands.
-->
