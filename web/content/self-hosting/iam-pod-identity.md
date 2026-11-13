---
title: IAM and Pod Identity
description: The three IAM roles and five EKS Pod Identity associations the install needs, with their exact policies and an optional script that creates them.
---

The pods get AWS access through **EKS Pod Identity**. No access keys are used.
The Terraform in [Install on EKS](/docs/self-hosting/install-eks) creates all
of this for you; read this page if your team creates IAM itself, or to review
the grants.

The namespace (`agent-relay`) and the ServiceAccount names are fixed: the Helm
chart creates exactly these. The cluster needs the **EKS Pod Identity Agent**
add-on.

## The three roles

| Role (suggested name) | ServiceAccounts in `agent-relay` | Purpose |
|---|---|---|
| `agent-relay-sessions` | `agent-relay-worker`, `agent-relay-alleyoop`, `agent-relay-session-ingest-api` | Store and read session data in the S3 bucket |
| `agent-relay-search-indexer` | `agent-relay-search-indexer` | Write the search index; read session data |
| `agent-relay-search-reader` | `agent-relay-session-read` | Search; read session data |

`agent-relay-alleyoop` isn't used by this install. Linking it is harmless and
matches the tested setup.

## Trust policy (all three roles)

```json
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"pods.eks.amazonaws.com"},"Action":["sts:AssumeRole","sts:TagSession"]}]}
```

## Permissions

**`agent-relay-sessions`**

```json
{"Version":"2012-10-17","Statement":[
 {"Sid":"ListBucket","Effect":"Allow","Action":["s3:ListBucket","s3:GetBucketLocation"],"Resource":["arn:aws:s3:::<bucket>"]},
 {"Sid":"ReadWriteObjects","Effect":"Allow","Action":["s3:GetObject","s3:PutObject","s3:AbortMultipartUpload","s3:ListMultipartUploadParts","s3:DeleteObject"],"Resource":["arn:aws:s3:::<bucket>/*"]}
]}
```

**`agent-relay-search-indexer`**

```json
{"Version":"2012-10-17","Statement":[
 {"Sid":"OpenSearchHttp","Effect":"Allow","Action":["es:ESHttpGet","es:ESHttpHead","es:ESHttpPost","es:ESHttpPut","es:ESHttpDelete","es:ESHttpPatch"],"Resource":["<domain arn>/*"]},
 {"Sid":"ListSessionsBucket","Effect":"Allow","Action":["s3:ListBucket"],"Resource":["arn:aws:s3:::<bucket>"]},
 {"Sid":"ReadSessionObjects","Effect":"Allow","Action":["s3:GetObject"],"Resource":["arn:aws:s3:::<bucket>/*"]}
]}
```

**`agent-relay-search-reader`:** the same as the indexer, with the first
statement's actions limited to `["es:ESHttpGet","es:ESHttpHead","es:ESHttpPost"]`.

**With a customer-managed KMS key on the bucket:** also allow `kms:Decrypt` and
`kms:GenerateDataKey` on that key for `agent-relay-sessions`, and `kms:Decrypt`
for both search roles. Conditioning on `kms:ViaService` =
`s3.<region>.amazonaws.com` is a good idea.

## Pod Identity associations (five)

| ServiceAccount (namespace `agent-relay`) | Role |
|---|---|
| `agent-relay-worker` | `agent-relay-sessions` |
| `agent-relay-alleyoop` | `agent-relay-sessions` |
| `agent-relay-session-ingest-api` | `agent-relay-sessions` |
| `agent-relay-search-indexer` | `agent-relay-search-indexer` |
| `agent-relay-session-read` | `agent-relay-search-reader` |

## On the OpenSearch domain

- **Access policy:** allow `es:ESHttp*` on `<domain arn>/*` for both search roles
  and for the IAM role that is the domain's fine-grained access control master
  user.
- **Inside OpenSearch:** step 7 of the install maps the two search roles to
  OpenSearch roles with `opensearch-roles-via-cluster.sh`, run as that master
  user role.

## Optional: create it with the AWS CLI

`create-iam.sh` creates the three roles and the five associations. It came
with the files in step 1 of the install
([download it on its own](/docs/self-hosting/downloads)). It is safe to rerun:
existing roles keep their names and get their inline policy replaced, and
existing associations are skipped. It needs `aws` and `jq`.

```sh
CLUSTER=<cluster name> REGION=<region> BUCKET=<sessions bucket> \
DOMAIN_ARN=<opensearch domain arn> KMS_KEY_ARN=<bucket key arn, or leave empty> \
  bash create-iam.sh
```

Then allow the two printed role ARNs, and your master user role, `es:ESHttp*`
in the OpenSearch domain's access policy.

**Done when:** it prints the two `export ..._ROLE_ARN=` lines, and the association list in
[Bring your own AWS resources](/docs/self-hosting/bring-your-own-aws#4-iam-roles-and-pod-identity)
shows five ServiceAccounts.

<!-- agent
create-iam.sh changes IAM in the human's account. Show the exact command with
values filled in and ASK THE HUMAN for approval before running it.
-->

## What the install needs back

Two values for `settings.sh`:

```sh
export INDEXER_ROLE_ARN=<arn of agent-relay-search-indexer>
export READER_ROLE_ARN=<arn of agent-relay-search-reader>
```

The sessions role needs no setting: the pods pick it up through Pod Identity.

If the associations were missing when the pods first started, create them and
restart the pods: `kubectl -n agent-relay rollout restart deploy`.
