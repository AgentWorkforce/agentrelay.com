---
title: Use an existing or shared RDS
description: Put Agent Relay's databases on an RDS PostgreSQL 17 instance you already run, including a shared one, instead of letting Terraform create one.
---

Do these steps in place of step 3 of [Install on EKS](/docs/self-hosting/install-eks),
then go back to step 4 there. This path was tested end to end on a separate,
already-populated RDS instance, and the existing data was untouched.

**The instance must be:**

- RDS for PostgreSQL **17**;
- reachable from the EKS cluster's pods on TCP 5432;
- free of databases named `relaycontrol`, `hoopdb` or `relaycast`, and not
  already used by another Agent Relay install (one install per instance).

**Network:** step 2 is the only step in the whole install that connects to the
database directly, from your machine. Every other database step runs inside the
cluster. If the database and the cluster sit behind different VPNs, do step 2 on
the database VPN, then switch to the cluster VPN for everything else.

## Know this first, on a shared instance

The dedicated login you create in step 2, `agent_relay_admin`, is a member of
`rds_superuser`, so it **can read every database on the instance**, not only
Agent Relay's. Its credentials end up in two Kubernetes Secrets in the
`agent-relay` namespace (`agent-relay-secrets` and `search-indexer-owner`).
Anyone who can read Secrets in that namespace gets the same reach.

On a shared instance, restrict who can read Secrets in `agent-relay`, or use a
dedicated instance.

<!-- agent
ASK THE HUMAN to confirm they have read "Know this first" and accept it for this
instance, or choose a dedicated instance. Do not continue without an explicit
answer.
-->

## 1. Check the cluster can reach the database

Run this on the cluster VPN:

```sh
kubectl run pgcheck --rm -i --restart=Never \
  --image=ghcr.io/cloudnative-pg/postgresql:17-standard-trixie@sha256:ed6923f9ba2399cf9070379a353c710c29ced8a294be73986a2c3dae7e599ce3 \
  -- pg_isready -h <rds endpoint> -p 5432 -t 10
```

If you mirrored the images to your own registry, use your mirror's PostgreSQL
image instead.

**Done when:** it prints `accepting connections`.

**`no response`:** the cluster can't reach the database, usually because of a
security group, or because the database is in another VPC or account. Fix that
first, or let Terraform create a database instead.

## 2. Check the instance and create the Agent Relay login (DBA)

Your DBA runs this on the database VPN. It checks the version and extensions,
creates a dedicated admin login, and stores its credentials in AWS Secrets
Manager. Don't use the master user: this login's credentials are stored in the
cluster. The new password never appears on a command line, and `psql` asks for
the master password.

```sh
export PW="$(openssl rand -hex 24)"
{ printf '\\set pw %s\n' "$PW"; cat <<'SQL'; } | psql "host=<rds endpoint> dbname=postgres user=<master user> sslmode=require"
SHOW server_version;
SELECT name FROM pg_available_extensions WHERE name IN ('vector','pg_trgm','btree_gin') ORDER BY 1;
SELECT datname FROM pg_database WHERE datname IN ('relaycontrol','hoopdb','relaycast');
CREATE ROLE agent_relay_admin LOGIN CREATEDB CREATEROLE PASSWORD :'pw';
GRANT rds_superuser TO agent_relay_admin;
SQL
jq -n '{username:"agent_relay_admin",password:env.PW}' |
  aws secretsmanager create-secret --name agent-relay/rds-admin --secret-string file:///dev/stdin \
    --query ARN --output text
unset PW
```

**Done when:**

- the version starts with `17`;
- all three extensions are listed;
- the `pg_database` query returns no rows;
- the last command prints a secret ARN. Keep it: it becomes
  `RDS_ADMIN_SECRET_ARN` in step 6 of the install.

**A check fails?** Stop and [tell us](/docs/self-hosting/support).
`DROP ROLE agent_relay_admin;` undoes the login.

**Tip for DBAs on PostgreSQL 16 and later:** a master user that isn't a
superuser and creates a role must `GRANT <role> TO <master user>` before it can
`SET ROLE` to it or create objects as it.

<!-- agent
This step needs the DBA's master credentials: ASK THE HUMAN (DBA) to run it in
their own terminal. Never ask for, accept or type the master password.
Ask them to paste back only: the version line, the extension names, whether the
pg_database query returned rows, and the secret ARN.
STOP if the version is not 17, an extension is missing, or any of the three
databases already exists.
-->

## 3. Stop Terraform creating a database

Terraform still creates the S3 bucket, OpenSearch, the certificate and the IAM
roles. This removes only its database module and the two database outputs:

```sh
cd infra/terraform/examples/aws-existing-cluster
python3 - <<'EOF'
import re
m=open('main.tf').read(); open('main.tf','w').write(re.sub(r'\nmodule "database" \{.*?\n\}\n','\n',m,count=1,flags=re.S))
o=open('outputs.tf').read(); open('outputs.tf','w').write(re.sub(r'output "database_host" \{.*?\n\}\n\noutput "database_admin_secret_arn" \{.*?\n\}\n\n','',o,count=1,flags=re.S))
EOF
grep -c 'module "database"' main.tf
cd -
```

**Done when:** it prints `0`.

Skip this step if your team also creates every other AWS resource itself
([Bring your own AWS resources](/docs/self-hosting/bring-your-own-aws)): then
you don't run Terraform at all.

## Then

Continue at step 4 of [Install on EKS](/docs/self-hosting/install-eks). In
step 4c the two database variables are required but unused: leave their
placeholders as they are. In step 6, set:

```sh
export RDS_HOST=<rds endpoint>
export RDS_ADMIN_SECRET_ARN=<secret ARN from step 2>
```

## Password rotation

If your RDS rotates the `agent_relay_admin` password, refresh the two Secrets
that carry it before every later upgrade (see
[Upgrades](/docs/self-hosting/upgrades#eks)). Never run `rds-setup.sh pre` again
after `post`: it refuses, by design.

## Removing Agent Relay from a shared instance

See [Teardown](/docs/self-hosting/teardown#a-shared-rds-instance).
