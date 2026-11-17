---
title: Teardown
description: Remove a self-hosted install completely - the Helm release, the cloud resources Terraform made, and Agent Relay's data on a shared database.
---

Use this to remove a test install, or before you rebuild one. It deletes data
for good. Take a [backup](/docs/self-hosting/backup-and-restore) first if you
might want any of it.

<!-- agent
Every step on this page deletes data or cloud resources. ASK THE HUMAN to
confirm the exact install (account or project, cluster, namespace, domain)
before starting, and again before each numbered step. Never run teardown on
your own initiative.
-->

## 1. Remove the app from the cluster

```sh
helm -n agent-relay uninstall agent-relay
helm -n agent-relay uninstall agent-relay-secrets   # only if you used helm-secrets or vals
kubectl -n agent-relay delete ingress agent-relay --ignore-not-found
kubectl delete namespace agent-relay
```

**Done when:** `kubectl get namespace agent-relay` answers `NotFound`.

On EKS, delete the Ingress before the namespace so the AWS Load Balancer
Controller removes the load balancer. Remove the four DNS records for your
domain too.

## 2. EKS: remove the AWS resources

**2a. OpenSearch.** `terraform destroy` refuses to delete the OpenSearch domain:
it is protected against deletion. Delete it yourself, then drop it from
Terraform's state:

```sh
aws opensearch delete-domain --domain-name <search domain name>
cd infra/terraform/examples/aws-existing-cluster
terraform state list | grep -E 'aws_opensearch_domain|aws_opensearch_domain_policy'
terraform state rm <each address that printed>
```

**2b. Empty the sessions bucket.** It is versioned, so delete every version and
delete marker first, 1,000 at a time:

```sh
B=<sessions bucket>
while :; do
  aws s3api list-object-versions --bucket "$B" --max-items 1000 --output json |
    jq '{Objects: ([.Versions[]?, .DeleteMarkers[]?] | map({Key, VersionId})), Quiet: true}' > versions.json
  [ "$(jq '.Objects | length' versions.json)" -gt 0 ] || break
  aws s3api delete-objects --bucket "$B" --delete file://versions.json
done
rm -f versions.json
```

You can also empty it from the S3 console. **Done when:** the loop ends, and
`aws s3api list-object-versions --bucket "$B" --max-items 1` lists no versions.

**2c. Destroy the rest:**

```sh
terraform destroy
cd -
```

**Done when:** the destroy completes. It removes the bucket, the IAM roles and
Pod Identity associations, the certificate and, unless you reused your own, the
database.

**Bring-your-own resources:** delete them with your own tooling: the bucket, the
OpenSearch domain, the three IAM roles and five Pod Identity associations, and
the ACM certificate.

Also delete the Secrets Manager secret `agent-relay/rds-admin` if you made it,
and the SSM parameters under `/agent-relay/` if you used vals with SSM.

## 3. GKE: remove the Google Cloud resources

The Terraform sets `deletion_protection = true`. Set it to `false` in
`terraform.tfvars`, apply, then destroy:

```sh
cd infra/terraform/examples/gcp
terraform apply      # with deletion_protection = false
terraform destroy
cd -
gcloud compute addresses delete agent-relay-ingress --global
gcloud artifacts repositories delete agent-relay-mirror --location <region>
```

A versioned bucket that still holds objects can block the destroy: empty it
first with `gcloud storage rm --recursive --all-versions gs://<bucket>/**`.
If you used vals with Secret Manager, delete the `agent-relay--*` secrets too.

GKE teardown hasn't been rehearsed end to end the way the EKS one has: check
the destroy plan before you confirm.

## A shared RDS instance

To remove Agent Relay from an instance that other applications share, without
deleting the instance, your DBA drops its three databases, then its roles.
List the roles first and review them: drop only roles Agent Relay created.

```sql
DROP DATABASE IF EXISTS relaycontrol;
DROP DATABASE IF EXISTS relaycast;
DROP DATABASE IF EXISTS hoopdb;
SELECT rolname FROM pg_roles
WHERE rolname NOT LIKE 'pg\_%' AND rolname NOT LIKE 'rds%' ORDER BY 1;
```

Then drop each Agent Relay role with `DROP ROLE <name>;`, and
`agent_relay_admin` last, plus its Secrets Manager secret.

<!-- agent
The DBA runs this with their own credentials. Do not run SQL against a shared
database yourself. Never drop a role you cannot positively attribute to the
Agent Relay install.
-->

## 4. Clean up your machine

Remove `~/.agent-relay-install` and its copy in your secret store once you're
sure you won't restore this install: without its keys, a backup can't be read.
