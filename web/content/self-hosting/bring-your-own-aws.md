---
title: Bring your own AWS resources
description: Exact specs for creating the S3 bucket, OpenSearch domain, IAM roles, Pod Identity associations and ACM certificate yourself, instead of with Terraform.
---

Use this page instead of steps 4 and 5 of [Install on EKS](/docs/self-hosting/install-eks)
when your team creates every AWS resource with its own tooling. Create
everything in the **same region as the EKS cluster**, then continue at step 6.

Names in `<...>` are yours. The namespace (`agent-relay`) and the ServiceAccount
names are fixed: the Helm chart creates exactly these.

## 1. PostgreSQL

RDS for PostgreSQL 17, with a dedicated admin login:
[Use an existing or shared RDS](/docs/self-hosting/existing-rds), steps 1 and 2.
Skip its step 3: you aren't running Terraform.

## 2. S3 bucket for session data

- Block all public access.
- Default encryption on: SSE-S3, or SSE-KMS with your key.
- Versioning on. A lifecycle rule that expires noncurrent versions after 30
  days is recommended.

**Done when:** `aws s3api get-bucket-versioning --bucket <bucket>` prints
`"Status": "Enabled"`.

## 3. OpenSearch domain

| Setting | Value |
|---|---|
| Engine | OpenSearch 2.19 |
| Network | VPC: private subnet(s) in the cluster's VPC, and a security group allowing TCP 443 from the cluster |
| Size for a first install | 1 × `m7g.medium.search`, 20 GB gp3, no dedicated master nodes |
| Encryption | at rest **on**; node-to-node **on**; HTTPS required, TLS 1.2 or later |
| Fine-grained access control | **on**; master user = an **IAM role ARN** (your admin role); internal user database **off** |
| Access policy | allow `es:ESHttp*` on `<domain arn>/*` for the admin role and the two search roles from step 4 |

**Done when:** `aws opensearch describe-domain --domain-name <name> --query DomainStatus.Endpoints`
prints a `vpc-...es.amazonaws.com` endpoint.

## 4. IAM roles and Pod Identity

Create the three roles and five Pod Identity associations in
[IAM and Pod Identity](/docs/self-hosting/iam-pod-identity), with your own
tooling or with its optional script.

**Done when:** this lists five ServiceAccounts:

```sh
aws eks list-pod-identity-associations --cluster-name <cluster name> --region <region> --namespace agent-relay \
  --query 'associations[].serviceAccount' --output text
```

## 5. The certificate

Request an ACM certificate in the cluster's region for `<domain>` plus
`api.<domain>`, `cast.<domain>` and `history.<domain>`, validated by DNS:

```sh
R=<region>
aws acm request-certificate --region $R --domain-name <domain> \
  --subject-alternative-names api.<domain> cast.<domain> history.<domain> \
  --validation-method DNS --query CertificateArn --output text
aws acm describe-certificate --region $R --certificate-arn <cert arn> \
  --query 'Certificate.DomainValidationOptions[].ResourceRecord' --output table
```

The DNS owner adds those CNAME records.

**Done when:** `aws acm describe-certificate --region $R --certificate-arn <cert arn> --query Certificate.Status --output text`
prints `ISSUED`.

<!-- agent
Every resource on this page is created by the human's team, usually with their
own infrastructure code. Offer the specs; do not create resources unless the
human asks you to and approves each command. ASK THE HUMAN (DNS owner) to add
the validation records.
-->

## Then: the settings file

In step 6 of [Install on EKS](/docs/self-hosting/install-eks), replace the
Terraform lines of `settings.sh` (from `TF=` to the end) with your values:

```sh
export RDS_HOST=<rds endpoint>
export RDS_ADMIN_SECRET_ARN=<secret ARN from the existing-RDS page>
export SESSIONS_BUCKET=<bucket>
export OPENSEARCH_URL=https://<domain endpoint, e.g. vpc-xxxx.us-west-2.es.amazonaws.com>
export CERT_ARN=<cert arn>
export INDEXER_ROLE_ARN=<indexer role arn>
export READER_ROLE_ARN=<reader role arn>
```

Then continue with steps 6 to 16 as written. Step 7 must run as the role you
made the OpenSearch master user.
