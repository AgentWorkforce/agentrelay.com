---
title: Install on EKS
description: Install Agent Relay on an existing Amazon EKS cluster in 16 numbered steps, each with a check before you move on.
---

Run the steps in order. Copy each block, replace every `<...>`, and check the
**Done when** line before you move on. Expect about two hours, most of it
waiting on AWS.

**Release:** `agent-relay-2026.11.16` (infra commit `ece71b9d`, chart 0.7.54).
These steps were run end to end on an existing EKS cluster on 2026-11-14:
installed with `agent-relay-2026.11.3`, then upgraded to `agent-relay-2026.11.5`
with [Upgrades](/docs/self-hosting/upgrades). `values.yaml` renders against
`agent-relay-2026.11.16` but was not installed from it. To run a newer release,
install this one and then follow Upgrades.

**You need:**

- AWS admin in the target account, and `kubectl` admin on the EKS cluster;
- whoever manages DNS for your domain (steps 5 and 15);
- the person who will be the first admin (step 16).

**Namespace:** use `agent-relay` exactly. The commands, `values.yaml` and the
Pod Identity associations all assume it.

**Network:**

- Steps 1, 4 and 5 need only AWS access, not `kubectl` or VPN. Start them while
  cluster access is being sorted out.
- With your own RDS, the database check in
  [Use an existing or shared RDS](/docs/self-hosting/existing-rds) is the only
  step that connects to the database directly. Every later database step runs
  inside the cluster.

<!-- agent
Before step 1, ask the human for, and do not guess: the AWS profile and region,
the EKS cluster name, the app hostname (<domain>), whether to reuse an existing
RDS instance, whether their team creates S3/OpenSearch/IAM/ACM themselves, the
organization ID and display name, and the first admin's email.
Record the answers in a plain notes file in the install folder. Never record
passwords, keys or tokens there.
-->

## 1. Get the files

```sh
mkdir agent-relay-install && cd agent-relay-install
base=https://agentrelay.com/self-hosting/files/eks
curl -fsSLO "$base/SHA256SUMS"
for f in $(awk '{print $2}' SHA256SUMS); do curl -fsSLO "$base/$f"; done
shasum -a 256 -c SHA256SUMS
git clone https://github.com/AgentWorkforce/infra.git
git -C infra checkout agent-relay-2026.11.16
test "$(git -C infra rev-parse HEAD)" = ece71b9df93df64cb63676d2a0ca2767eccc6599 && echo "release ok"
```

Tools: `terraform` 1.11 or later, `helm` 3.10 or later (Helm 3, not Helm 4),
`kubectl`, `aws` (CLI v2), `jq`, `yq`, `openssl`, `python3`, `curl` 7.75 or
later, and [`crane`](https://github.com/google/go-containerregistry/releases),
which every [upgrade](/docs/self-hosting/upgrades) needs. On a Mac:

```sh
brew install hashicorp/tap/terraform helm@3 kubectl awscli jq yq crane
export PATH="$(brew --prefix helm@3)/bin:$PATH"   # also add this line to your shell profile
helm version --short
```

`brew install helm` installs Helm 4, which this guide isn't tested with, so
`helm version` must print `v3`. `helm@3` isn't on your `PATH` until you add it.

`rds-setup.sh` uses `sha256sum`, which macOS has from version 14. On older
macOS, also run `brew install coreutils`.

**Done when:** every `shasum` line ends in `OK`, and `release ok` prints.

<!-- agent
STOP if any checksum line is not OK or "release ok" does not print. Do not edit
the downloaded files to make a check pass.
-->

## 2. Connect to AWS and the cluster

```sh
aws sts get-caller-identity
aws eks update-kubeconfig --name <cluster name> --region <region> --profile <your AWS profile>
kubectl config current-context
kubectl auth can-i '*' '*' --all-namespaces
kubectl get storageclass
aws eks list-addons --cluster-name <cluster name> --region <region>
kubectl -n kube-system get deploy aws-load-balancer-controller
```

**Done when:**

- `current-context` names your cluster, and `can-i` prints `yes`;
- one StorageClass is marked `(default)`;
- the add-ons include the EKS Pod Identity Agent and the EBS CSI driver, and the
  AWS Load Balancer Controller is running (as an add-on or with Helm).

**No `(default)` StorageClass?** Mark your gp3 class as the default:

```sh
kubectl patch storageclass gp3 -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

**Can't pull images from `ghcr.io`?** Mirror them first: see
[Mirror the images to ECR](#mirror-the-images-to-ecr) at the end of this page.

<!-- agent
STOP and ask the human if: can-i is not "yes", the context names a different
cluster, a required add-on is missing, or there is no default StorageClass.
Patching the StorageClass changes the cluster: ask before running it.
-->

## 3. Reusing an existing RDS instance? (skip if Terraform should create one)

Do every step of [Use an existing or shared RDS](/docs/self-hosting/existing-rds)
now, then come back to step 4.

**Your team creates the S3 bucket, OpenSearch, IAM roles and certificate
itself?** Skip steps 4 and 5. Follow
[Bring your own AWS resources](/docs/self-hosting/bring-your-own-aws) instead,
then continue at step 6.

## 4. Create the AWS resources (Terraform, about 20 minutes)

This creates an S3 bucket, a small OpenSearch domain, the HTTPS certificate and
the IAM roles with their Pod Identity associations, plus the database unless
you reuse your own.

**4a.** Make OpenSearch a single small node for a first install: one data node,
no dedicated master nodes and 20 GB of disk, instead of the production default
of three data nodes and three master nodes.

```sh
cd infra/terraform/examples/aws-existing-cluster
python3 - <<'EOF'
m=open('main.tf').read()
old='  instance_type      = var.search_instance_type\n'
new=old+'  instance_count           = 1\n  dedicated_master_enabled = false\n  ebs_volume_size          = 20\n'
assert m.count(old)==1; open('main.tf','w').write(m.replace(old,new)); print('search: 1 node')
EOF
```

**Done when:** `search: 1 node` prints.

**4b.** Find your own role's ARN. It becomes the OpenSearch admin, so step 7
needs no role switch:

```sh
aws iam get-role --role-name "$(aws sts get-caller-identity --query Arn --output text | cut -d/ -f2)" --query Role.Arn --output text
```

**4c.** Find the cluster's security group and its private subnets:

```sh
aws eks describe-cluster --name <cluster name> --query cluster.resourcesVpcConfig.clusterSecurityGroupId --output text
VPC="$(aws eks describe-cluster --name <cluster name> --query cluster.resourcesVpcConfig.vpcId --output text)"
aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC Name=tag-key,Values=kubernetes.io/role/internal-elb \
  --query 'Subnets[].[SubnetId,CidrBlock,AvailabilityZone]' --output table
```

The cluster security group works for search and the database: the nodes of
EKS managed node groups are in it, and it allows all traffic from itself. If
your nodes use another security group, use one that allows TCP 443 and 5432
from them. If the subnet list is empty, your private subnets aren't tagged: use
the cluster's own (`--query cluster.resourcesVpcConfig.subnetIds`).

Then write `terraform.tfvars`, replacing every `<...>`:

```sh
cat > terraform.tfvars <<'EOF'
account_id       = "<12-digit account of the EKS cluster>"
region           = "<cluster region, e.g. us-west-2>"
eks_cluster_name = "<cluster name>"
domain           = "<app hostname, e.g. ar.example.com>"

sessions_bucket_name = "<globally unique bucket name, e.g. acme-agent-relay-sessions>"

# Search (one node, see 4a): one private subnet in the cluster's VPC, a security
# group allowing TCP 443 from the cluster, and the role ARN from 4b.
search_subnet_ids        = ["<private subnet id>"]
search_security_group_id = "<security group id>"
search_admin_role_arn    = "<role ARN from 4b>"
search_instance_type     = "m7g.medium.search"

# Database. With your own RDS (step 3) these are required but unused: leave
# them as they are. Otherwise: two private subnets in different Availability
# Zones, and a security group allowing TCP 5432 from the cluster.
database_subnet_ids        = ["<subnet id>", "<subnet id>"]
database_security_group_id = "<security group id>"
database_instance_class    = "db.t4g.medium"
EOF
grep -n '<' terraform.tfvars
```

**Done when:** the `grep` prints nothing. With your own RDS it may print only
the two database lines.

To keep Terraform state in S3, add a `backend "s3" {}` block to the `terraform`
block in `main.tf` and pass your settings with `-backend-config`. Without one,
state stays in a local file: keep it safe.

**4d.** Plan and apply:

```sh
terraform init
terraform plan -out tfplan
terraform apply tfplan
cd -
```

**Done when:** the apply completes. The plan creates one `aws_opensearch_domain`,
and no `aws_db_instance` if you reuse your own RDS.

- **An OpenSearch "service-linked role" error?** Run
  `aws iam create-service-linked-role --aws-service-name opensearchservice.amazonaws.com`,
  then apply again.
- **AWS rejects `m7g.medium.search`?** Use `m6g.large.search`.

<!-- agent
Show the human the plan summary line ("Plan: N to add, M to change, K to
destroy") and the resource types it creates. ASK THE HUMAN for approval before
"terraform apply". STOP if the plan changes or destroys anything that already
existed, or creates an aws_db_instance when the human chose an existing RDS.
-->

## 5. Validate the certificate (DNS owner)

```sh
terraform -chdir=infra/terraform/examples/aws-existing-cluster output certificate_dns_records
```

Add those CNAME records in DNS.

**Done when:** the certificate check in step 6 prints `ISSUED`. That takes a few
minutes once the records exist.

<!-- agent
ASK THE HUMAN (DNS owner) to create these CNAME records. You do not change DNS.
Continue with step 6 while they do it.
-->

## 6. Create the settings file

```sh
cat > settings.sh <<'EOF'
export DOMAIN=<app hostname, e.g. ar.example.com>
export ORG_ID=<stable id, e.g. org_acme: never change it>
export ORG_NAME='<organization name>'
export ADMIN_EMAIL=<first admin's email>
export AWS_REGION=<region>
export ALB_SUBNET_CIDR_A=<CIDR of load balancer subnet 1>
export ALB_SUBNET_CIDR_B=<CIDR of load balancer subnet 2>
export IMAGE_REPO_PREFIX=ghcr.io/agentworkforce
export SERVICES_IMAGE=ghcr.io/agentworkforce/sessions-pipeline@sha256:fd2efd61dca4761dfb55256aa4797cb7f61c3434cc8af4833287e0e7bb7b59a9
export PSQL_IMAGE=ghcr.io/cloudnative-pg/postgresql:17-standard-trixie@sha256:ed6923f9ba2399cf9070379a353c710c29ced8a294be73986a2c3dae7e599ce3
export NAMESPACE=agent-relay
export INSTALL_DIR="$PWD"   # run "source settings.sh" from the agent-relay-install folder
export INFRA="$INSTALL_DIR/infra"
TF="$INFRA/terraform/examples/aws-existing-cluster"
export RDS_HOST="$(terraform -chdir="$TF" output -raw database_host)"
export RDS_ADMIN_SECRET_ARN="$(terraform -chdir="$TF" output -raw database_admin_secret_arn)"
export SESSIONS_BUCKET="$(terraform -chdir="$TF" output -raw sessions_bucket)"
export OPENSEARCH_URL="$(terraform -chdir="$TF" output -raw search_url)"
export CERT_ARN="$(terraform -chdir="$TF" output -raw certificate_arn)"
export INDEXER_ROLE_ARN="$(terraform -chdir="$TF" output -json search_roles | jq -r .indexer)"
export READER_ROLE_ARN="$(terraform -chdir="$TF" output -json search_roles | jq -r .reader)"
EOF
```

**Load balancer subnets:** the subnets your AWS Load Balancer Controller uses,
tagged `kubernetes.io/role/elb` (internet-facing) or
`kubernetes.io/role/internal-elb` (internal). This lists the cluster VPC's
subnets with their CIDRs:

```sh
VPC="$(aws eks describe-cluster --name <cluster name> --query cluster.resourcesVpcConfig.vpcId --output text)"
aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC Name=tag-key,Values=kubernetes.io/role/elb \
  --query 'Subnets[].[SubnetId,CidrBlock,AvailabilityZone]' --output table
```

Most VPCs have one per Availability Zone, so you may see three. Put two here
and add the third in step 9: the load balancer uses every tagged subnet.

**Reusing your own RDS?** In `settings.sh`, replace the two `RDS_` lines with
`export RDS_HOST=<rds endpoint>` and `export RDS_ADMIN_SECRET_ARN=<secret ARN from the existing-RDS page>`.

**Brought your own AWS resources?** Replace the Terraform lines as
[Bring your own AWS resources](/docs/self-hosting/bring-your-own-aws#then-the-settings-file)
shows.

Then load and check it:

```sh
source settings.sh
bash -c 'source ./settings.sh; for v in DOMAIN ORG_ID ORG_NAME ADMIN_EMAIL AWS_REGION ALB_SUBNET_CIDR_A ALB_SUBNET_CIDR_B RDS_HOST RDS_ADMIN_SECRET_ARN SESSIONS_BUCKET OPENSEARCH_URL CERT_ARN INDEXER_ROLE_ARN READER_ROLE_ARN; do [ -n "${!v}" ] && [[ "${!v}" != *"<"* ]] || echo "MISSING: $v"; done; echo "settings checked"'
aws acm describe-certificate --certificate-arn "$CERT_ARN" --query Certificate.Status --output text
```

**Done when:** only `settings checked` prints, and the certificate status is
`ISSUED`.

**In every new terminal,** first run `cd agent-relay-install && source settings.sh`.

<!-- agent
Fill DOMAIN, ORG_ID, ORG_NAME and ADMIN_EMAIL only with the human's answers.
If more than two load balancer subnets are listed, ASK THE HUMAN which ones the
load balancer uses (by default, all of them). Put two in settings.sh and add a
third with step 9's "third load balancer subnet" block.
If the certificate is not ISSUED yet, wait and re-check; do not continue past
step 13 without it.
-->

## 7. Give the app access to search

Run this as the role that is the OpenSearch admin (`search_admin_role_arn`). If
that is your own role from 4b:

```sh
bash opensearch-roles-via-cluster.sh
```

It maps the indexer and reader roles inside OpenSearch, through a short-lived
relay pod in the cluster, so you need no VPC access. The pod pulls
`alpine/socat` from Docker Hub; mirror it first if the cluster can't reach
Docker Hub.

**Done when:** four responses show `CREATED` or `OK`, then `search roles done`.

**A 403?** You aren't using the OpenSearch admin role.

## 8. Set up the databases

```sh
bash rds-setup.sh pre
```

It creates the `relaycontrol`, `hoopdb` and `relaycast` databases and their
roles in short-lived Jobs inside the cluster, plus the `rds-ca` ConfigMap that
verified TLS needs. It writes every credential to `~/.agent-relay-install`,
which only you can read, and prints none of them.

**Done when:** it ends with `pre done`.

Copy `~/.agent-relay-install` to your secret store now: it holds the database
passwords. Never commit it.

**"already belongs to another HoopDb install"?** One RDS instance holds only one
Agent Relay install, because one of its roles is server-wide. Use a separate
instance.

<!-- agent
Never print, cat, copy into chat or summarize any file under
~/.agent-relay-install. ASK THE HUMAN to copy that folder to their secret
store; do not do it yourself unless they name the exact destination.
-->

## 9. Fill in values.yaml

```sh
export RDS_CA_SHA256="$(cat ~/.agent-relay-install/rds-ca.sha256)"
sed -i.orig -e "s|__IMAGE_REPO_PREFIX__|$IMAGE_REPO_PREFIX|g" -e "s|__ORG_ID__|$ORG_ID|g" \
  -e "s|__ORG_NAME__|$ORG_NAME|g" -e "s|__ADMIN_EMAIL__|$ADMIN_EMAIL|g" -e "s|__DOMAIN__|$DOMAIN|g" \
  -e "s|__REGION__|$AWS_REGION|g" -e "s|__SESSIONS_BUCKET__|$SESSIONS_BUCKET|g" \
  -e "s|__OPENSEARCH_URL__|$OPENSEARCH_URL|g" -e "s|__RDS_CA_SHA256__|$RDS_CA_SHA256|g" \
  -e "s|__ALB_SUBNET_CIDR_A__|$ALB_SUBNET_CIDR_A|g" -e "s|__ALB_SUBNET_CIDR_B__|$ALB_SUBNET_CIDR_B|g" \
  values.yaml
grep -n '__[A-Z_]*__' values.yaml
```

**Done when:** the only line printed is `__LLM_MODEL__`. You set that one later,
when you [turn on titles and summaries](/docs/self-hosting/after-install).

**A third load balancer subnet?** Add it to every network policy, or requests
through that subnet answer 504:

```sh
export ALB_SUBNET_CIDR_C=<CIDR of load balancer subnet 3>
python3 - <<'EOF'
import os, re
b, c = os.environ['ALB_SUBNET_CIDR_B'], os.environ['ALB_SUBNET_CIDR_C']
v = open('values.yaml').read()
v, n = re.subn(r'^( *)- ipBlock: \{ cidr: ' + re.escape(b) + r' \}\n',
               lambda m: m.group(0) + m.group(1) + '- ipBlock: { cidr: ' + c + ' }\n', v, flags=re.M)
open('values.yaml', 'w').write(v); print('third subnet:', n, 'blocks')
EOF
```

**Done when:** it prints `third subnet: 4 blocks`.

`values.yaml` holds no secret values, only the names of Secrets and keys, so it
is safe to keep in version control.

## 10. Create the secrets

This generates the remaining keys and creates the five Kubernetes Secrets.
Nothing is printed.

```sh
S=~/.agent-relay-install/secret-files
( umask 077
for k in selfhost-bootstrap-token selfhost-setup-key relaycast-internal-secret \
         relaycast-workspace-bootstrap-secret relaycontrol-introspect-secret session-read-api-secret; do
  [ -s "$S/agent-relay-secrets/$k" ] || openssl rand -hex 32 | tr -d '\n' > "$S/agent-relay-secrets/$k"
done
[ -s "$S/agent-relay-secrets/selfhost-encryption-key" ] || openssl rand -hex 32 | tr -d '\n' > "$S/agent-relay-secrets/selfhost-encryption-key"
[ -s "$S/agent-relay-secrets/SUMMARY_MASTER_KEYS" ] || printf 'k1:%s' "$(openssl rand -hex 32)" > "$S/agent-relay-secrets/SUMMARY_MASTER_KEYS"
cp "$S/agent-relay-secrets/relaycontrol-introspect-secret" "$S/agent-relay-ingest-edge-runtime/introspect-secret" )
put_secret() { # create the Secret, or replace it in place; never kubectl apply, which copies
               # every value into a last-applied annotation (replace also drops an old one)
  if kubectl -n agent-relay get secret "$1" >/dev/null 2>&1; then
    kubectl -n agent-relay create secret generic "$@" --dry-run=client -o yaml | kubectl replace -f -
  else
    kubectl -n agent-relay create secret generic "$@"
  fi
}
for name in agent-relay-secrets agent-relay-read-api agent-relay-ingest-edge-runtime \
            search-indexer-runtime search-indexer-owner; do
  put_secret "$name" --from-file="$S/$name"
done
```

**Done when:** five lines end in `created`.

Copy `~/.agent-relay-install` to your secret store again: it now holds the
encryption keys. Data encrypted with `selfhost-encryption-key` and
`SUMMARY_MASTER_KEYS` can't be recovered without them.

**Keep your secrets in SOPS, SSM Parameter Store or another store?** Use one of
the options in [Secrets](/docs/self-hosting/secrets) instead of this block.

## 11. Install with Helm

```sh
cd "$INFRA"
scripts/selfhost/helm-deps.sh
helm upgrade --install agent-relay charts/agent-relay --namespace agent-relay \
  -f charts/agent-relay/values-eks.yaml -f charts/agent-relay/values-eks-native.yaml \
  -f "$INSTALL_DIR/values.yaml" --timeout 25m
cd "$INSTALL_DIR"
```

**Done when:** it prints `STATUS: deployed`.

`scripts/selfhost/helm-deps.sh` builds the chart dependencies (`charts/sessions-pipeline`,
then `charts/agent-relay`) with no `helm repo add`, and leaves your own Helm
repositories unchanged.

Don't add `--wait`: the read API, ingest edge and search indexer can't become
ready until step 13, so `--wait` would stall, and it wouldn't report a failed
migration anyway.

<!-- agent
ASK THE HUMAN for approval before this helm command. This command is for a
fresh install on an empty database only. STOP if "helm list -n agent-relay"
already shows a release: that is an upgrade, see the Upgrades guide.
-->

## 12. Wait for the database migrations

```sh
for j in $(kubectl -n agent-relay get jobs -o name | grep -E 'relay-control-migrate|relaycast-migrate|agent-relay-worker-migrate'); do
  kubectl -n agent-relay wait --for=condition=complete "$j" --timeout=20m
done
```

**Done when:** three lines say `condition met`.

**Expected at this point:** the `search-indexer-bootstrap` Job fails, and some
pods restart. Step 13 fixes both.

**A migration Job failed?** Read its log with
`kubectl -n agent-relay logs job/<job name> --tail=100`, fix the cause, delete
the failed Job, and run step 11 again, which recreates it.

<!-- agent
STOP if any of the three migration Jobs fails. Show the human the last 100 log
lines (check them for secrets first) and do not delete Jobs without approval.
-->

## 13. Switch on the service logins

```sh
export RELEASE=agent-relay
export MIGRATION_JOB="$(helm get manifest "$RELEASE" -n agent-relay |
  yq -r 'select(.kind == "Job" and .metadata.labels."app.kubernetes.io/component" == "hoopdb-migrate") | .metadata.name')"
echo "$MIGRATION_JOB"   # exactly one name, agent-relay-worker-migrate-<hash>
bash rds-setup.sh post
kubectl -n agent-relay rollout restart deploy/agent-relay-read-api deploy/agent-relay-ingest-edge deploy/agent-relay-search-indexer
for j in $(kubectl -n agent-relay get jobs -o name | grep search-indexer-bootstrap); do kubectl -n agent-relay delete "$j"; done
cd "$INFRA"
helm upgrade --install agent-relay charts/agent-relay --namespace agent-relay \
  -f charts/agent-relay/values-eks.yaml -f charts/agent-relay/values-eks-native.yaml \
  -f "$INSTALL_DIR/values.yaml" --timeout 25m
cd "$INSTALL_DIR"
kubectl -n agent-relay wait --for=condition=complete "$(kubectl -n agent-relay get jobs -o name | grep search-indexer-bootstrap)" --timeout=10m
kubectl -n agent-relay rollout status deploy --timeout=10m
kubectl -n agent-relay get pods
```

**Done when:**

- `post done` prints after three `login ok ... tls=true` lines;
- the bootstrap Job shows `condition met`;
- every pod is `Running` and ready.

The search indexer restarts until the bootstrap Job finishes. That's expected,
which is why the `rollout status` check comes last.

**A 403 from the bootstrap Job?** Redo step 7.

## 14. Create the load balancer

```sh
cd "$INFRA"
EKS_ALB_DOMAIN="$DOMAIN" EKS_ALB_CERT_ARN="$CERT_ARN" EKS_ALB_INGEST=true \
  scripts/selfhost/eks-alb-ingress.sh agent-relay > "$INSTALL_DIR/ingress.yaml"
cd "$INSTALL_DIR"
kubectl apply -f ingress.yaml
sleep 60; kubectl -n agent-relay get ingress agent-relay -o jsonpath='{.status.loadBalancer.ingress[0].hostname}{"\n"}'
```

For an internal load balancer, change `internet-facing` to `internal` in
`ingress.yaml` before `kubectl apply`.

**Done when:** it prints a hostname ending in `elb.amazonaws.com`. If it's
empty, run the last line again.

<!-- agent
ASK THE HUMAN whether the load balancer is internet-facing or internal before
kubectl apply.
-->

## 15. Point DNS at it and check (DNS owner)

Create CNAME records for `<domain>`, `api.<domain>`, `cast.<domain>` and
`history.<domain>`, all pointing at that hostname. After a minute or two:

```sh
curl -fsS "https://api.$DOMAIN/readyz" && echo " api ok"
curl -fsS "https://cast.$DOMAIN/health" && echo " cast ok"
curl -fsS -o /dev/null -w "dashboard %{http_code}\n" "https://$DOMAIN/"
curl -s -o /dev/null -w "history %{http_code}\n" "https://history.$DOMAIN/v1/sessions"
```

**Done when:** `api ok`, `cast ok`, `dashboard 200` and `history 401`. The
history host answers 401 without a token, by design.

- **`Could not resolve host`:** wait, then run it again. New records can take a
  couple of minutes.
- **504:** a load balancer subnet is missing from `values.yaml`. Fix step 9,
  then run step 11 again.

<!-- agent
ASK THE HUMAN (DNS owner) to create the four CNAME records and tell you when
done. Then poll the checks every 30 seconds for up to 10 minutes.
-->

## 16. First sign-in, then add users

The first admin does this **before signing in any other way**, including from
the desktop app. The setup key works only while the admin has never signed in,
and it expires 24 hours after the API first starts.

```sh
kubectl -n agent-relay get secret agent-relay-secrets -o jsonpath='{.data.selfhost-setup-key}' | base64 -d; echo
```

1. Open `https://<domain>/login` and choose **First-time setup: enter setup
   key**.
2. Paste the key and choose a password (12 to 128 characters).

Then add users:

```sh
bash add-user.sh "$DOMAIN"
```

It signs you in as the owner, invites each email you type, and prints a
single-use temporary password for each. They sign in at `https://<domain>/login`
and choose their own. With [single sign-on](/docs/self-hosting/okta-sso), people
don't need to be added at all.

**Done when:** the admin is signed in to the dashboard.

**Key lost or expired?** Mint a new one with the bootstrap token:

```sh
BOOTSTRAP_TOKEN="$(cat ~/.agent-relay-install/secret-files/agent-relay-secrets/selfhost-bootstrap-token)"
curl -fsS -X POST -H "Authorization: Bearer $BOOTSTRAP_TOKEN" \
  "https://api.$DOMAIN/api/v1/installation/setup-key"; unset BOOTSTRAP_TOKEN
```

<!-- agent
Do NOT run the setup-key command, the bootstrap-token command or add-user.sh
yourself: each prints a credential. ASK THE HUMAN (the first admin) to run them
in their own terminal and to tell you only "signed in" when done.
-->

## Next

- **Before people start:** in the dashboard, under **Settings › Policies**, set
  what the desktop app uploads.
- **Desktop app:** roll it out with [Desktop app rollout](/docs/self-hosting/desktop-app),
  run one agent session, and check it appears under **Sessions**.
- **Then:** [After the install](/docs/self-hosting/after-install) (titles and
  summaries), [single sign-on](/docs/self-hosting/okta-sso), and
  [backups](/docs/self-hosting/backup-and-restore).
- **Problems:** [Troubleshooting](/docs/self-hosting/troubleshooting), then
  [Support](/docs/self-hosting/support).
- **Removing it:** [Uninstall](#uninstall).

## Uninstall

This deletes the install and everything in it: every session, transcript and
search index. It can't be undone. Step 4 keeps a final database snapshot until
you delete it, so stop before step 4 if you might need the data again.

<!-- agent
Start this section only when the human has asked, in so many words, to
uninstall Agent Relay from this cluster. ASK THE HUMAN before every numbered
step and show the exact commands first. STOP if `terraform plan -destroy`
lists anything that is not this install's (step 3), and never run step 4
unless the human confirms they don't need the data.
-->

Run everything from the `agent-relay-install` folder after `source settings.sh`
(step 6).

**1. Remove the load balancer.** Delete the Ingress first, so the AWS Load
Balancer Controller deletes the load balancer it created. Uninstalling the
chart first can leave the load balancer behind.

```sh
kubectl delete -f ingress.yaml --wait
aws elbv2 describe-load-balancers --region "$AWS_REGION" \
  --query "LoadBalancers[?starts_with(LoadBalancerName,'k8s-agentrel')].LoadBalancerName" --output text
```

**Done when:** the second command prints nothing.

**2. Remove the app and its disks.** The cluster keeps persistent volumes and
their EBS disks after the namespace is gone, so list them first:

```sh
kubectl get pv -o json | jq -r '.items[] | select(.spec.claimRef.namespace=="agent-relay")
  | "\(.metadata.name) \(.spec.csi.volumeHandle // .spec.awsElasticBlockStore.volumeID)"' > pv-list.txt
cat pv-list.txt
helm uninstall agent-relay --namespace agent-relay --wait
kubectl delete namespace agent-relay --wait
while read -r pv vol; do
  kubectl delete pv "$pv"
  aws ec2 wait volume-available --region "$AWS_REGION" --volume-ids "$vol"
  aws ec2 delete-volume --region "$AWS_REGION" --volume-id "$vol"
done < pv-list.txt
```

**Done when:** `kubectl get namespace agent-relay` says `NotFound`, and every
volume in `pv-list.txt` is gone.

**3. Destroy the AWS resources.** Three things stop `terraform destroy` on
purpose, to protect real data: the sessions bucket must be empty (including
old versions), the database has deletion protection, and the OpenSearch domain
has a destroy guard. Clear all three for this install only:

```sh
while :; do
  batch="$(aws s3api list-object-versions --bucket "$SESSIONS_BUCKET" --max-items 500 --output json \
    | jq '{Objects: [((.Versions // []) + (.DeleteMarkers // []))[] | {Key, VersionId}], Quiet: true}')"
  [ "$(jq '.Objects | length' <<<"$batch")" = 0 ] && break
  aws s3api delete-objects --bucket "$SESSIONS_BUCKET" --delete "$batch" >/dev/null
done
echo "bucket empty"
aws rds modify-db-instance --region "$AWS_REGION" --db-instance-identifier agent-relay-pg \
  --no-deletion-protection --apply-immediately >/dev/null
aws rds wait db-instance-available --region "$AWS_REGION" --db-instance-identifier agent-relay-pg
sed -i.bak 's/prevent_destroy = true/prevent_destroy = false/' "$INFRA/terraform/modules/aws/search/main.tf"
terraform -chdir="$TF" plan -destroy -out destroy.tfplan
```

Read the plan. Every line must destroy something of this install: the
`agent-relay-pg` database, the `agent-relay-search` domain, your sessions
bucket, the `agent-relay-*` IAM roles and their Pod Identity associations, and
the certificate. Then:

```sh
terraform -chdir="$TF" apply destroy.tfplan
```

**Done when:** `Destroy complete!` prints. Expect about 15 minutes, most of it
OpenSearch.

**4. Delete the backups (only if you don't need the data).** The destroy keeps
a final snapshot of the database, and RDS keeps its automated backups:

```sh
for s in $(aws rds describe-db-snapshots --region "$AWS_REGION" --db-instance-identifier agent-relay-pg \
    --snapshot-type manual --query 'DBSnapshots[].DBSnapshotIdentifier' --output text); do
  echo "deleting snapshot $s"
  aws rds delete-db-snapshot --region "$AWS_REGION" --db-snapshot-identifier "$s" >/dev/null
done
for id in $(aws rds describe-db-instance-automated-backups --region "$AWS_REGION" \
    --db-instance-identifier agent-relay-pg --query 'DBInstanceAutomatedBackups[].DbiResourceId' --output text); do
  aws rds delete-db-instance-automated-backup --region "$AWS_REGION" --dbi-resource-id "$id" >/dev/null
done
```

**5. The rest.**

- Mirrored images: if you mirrored to ECR, delete those repositories:
  ```sh
  for r in $(aws ecr describe-repositories --region "$AWS_REGION" \
      --query "repositories[?starts_with(repositoryName,'agent-relay/')].repositoryName" --output text); do
    aws ecr delete-repository --region "$AWS_REGION" --repository-name "$r" --force >/dev/null && echo "deleted $r"
  done
  ```
- DNS (DNS owner): delete the four host records from step 15 and the four
  certificate validation records from step 5.
- Secrets: delete `~/.agent-relay-install`, and the copy in your secret store
  once you no longer need it. Then delete the `agent-relay-install` folder.
- The cluster and the add-ons the install needs (the AWS Load Balancer
  Controller, the Pod Identity Agent) stay: step 2 checked for them but
  didn't install them.

## Images

Everything the install runs, pinned by digest. A render of the chart pulls the
first four; `rds-setup.sh` runs the services image and the PostgreSQL client.

| Image | Version | `image@digest` |
|---|---|---|
| Control API | 0.5.34 (`2258889a`) | `ghcr.io/agentworkforce/relay-control@sha256:377bc2b9477d0bbd966cccd61380dd9d7f6e022a76ff0f7ad80e391d56ec0a83` |
| Dashboard | `be770cac` | `ghcr.io/agentworkforce/relay-webapp@sha256:da0cc80476eac734299c0c6ceb94e2bca7dae7913cce56a8ca8592cf086dd02e` |
| Relaycast | 12.10.0 | `ghcr.io/agentworkforce/relaycast-self-host@sha256:ec062ef901af15cf575b53a71d7eb09f2e6ab6e7c0d5be2da35339a275a5c6cc` |
| Sessions services | `b96e1e1e` | `ghcr.io/agentworkforce/sessions-pipeline@sha256:fd2efd61dca4761dfb55256aa4797cb7f61c3434cc8af4833287e0e7bb7b59a9` |
| PostgreSQL client | 17-standard-trixie | `ghcr.io/cloudnative-pg/postgresql:17-standard-trixie@sha256:ed6923f9ba2399cf9070379a353c710c29ced8a294be73986a2c3dae7e599ce3` |

Each image line in `values.yaml` sits under `x-pins`. Don't swap an image on
its own: move to a new release instead (see [Upgrades](/docs/self-hosting/upgrades)).

## Mirror the images to ECR

Skip this if the cluster can pull from `ghcr.io`. Otherwise mirror the five
images into ECR before step 8 (which already runs two of them). Each image is
copied by digest with its whole multi-architecture index, so the digests stay
the same. It needs `aws` and [`crane`](https://github.com/google/go-containerregistry/releases),
and runs much faster from AWS CloudShell or an EC2 instance in the same region
than from a laptop.

```sh
export AWS_REGION=<region>
export ECR=<account>.dkr.ecr.<region>.amazonaws.com
aws ecr get-login-password --region "$AWS_REGION" | crane auth login "$ECR" -u AWS --password-stdin
copied=0
for src in \
  ghcr.io/agentworkforce/relay-control@sha256:377bc2b9477d0bbd966cccd61380dd9d7f6e022a76ff0f7ad80e391d56ec0a83 \
  ghcr.io/agentworkforce/relay-webapp@sha256:da0cc80476eac734299c0c6ceb94e2bca7dae7913cce56a8ca8592cf086dd02e \
  ghcr.io/agentworkforce/relaycast-self-host@sha256:ec062ef901af15cf575b53a71d7eb09f2e6ab6e7c0d5be2da35339a275a5c6cc \
  ghcr.io/agentworkforce/sessions-pipeline@sha256:fd2efd61dca4761dfb55256aa4797cb7f61c3434cc8af4833287e0e7bb7b59a9 \
  ghcr.io/cloudnative-pg/postgresql@sha256:ed6923f9ba2399cf9070379a353c710c29ced8a294be73986a2c3dae7e599ce3
do
  repo="agent-relay/${src%@*}"; digest="${src#*@}"
  aws ecr describe-repositories --region "$AWS_REGION" --repository-names "$repo" >/dev/null 2>&1 \
    || aws ecr create-repository --region "$AWS_REGION" --repository-name "$repo" >/dev/null
  if crane copy "$src" "$ECR/$repo:${digest/:/-}" && crane digest "$ECR/$repo@$digest" >/dev/null; then
    echo "ok $repo"; copied=$((copied+1))
  else
    echo "FAILED $src" >&2
  fi
done
echo "$copied of 5 copied"
```

**Done when:** it ends with `5 of 5 copied`. If any line says `FAILED`, run the
whole block again; images already copied are quick.

Then, in `settings.sh` (step 6):

- `IMAGE_REPO_PREFIX=$ECR/agent-relay/ghcr.io/agentworkforce`;
- `SERVICES_IMAGE=$ECR/agent-relay/ghcr.io/agentworkforce/sessions-pipeline@sha256:fd2efd61…`
  and `PSQL_IMAGE=$ECR/agent-relay/ghcr.io/cloudnative-pg/postgresql@sha256:ed6923f9…`,
  with the full digests from the loop.
