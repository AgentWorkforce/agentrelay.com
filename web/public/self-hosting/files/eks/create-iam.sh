#!/usr/bin/env bash
# Optional: create the three Agent Relay IAM roles and five Pod Identity
# associations described at agentrelay.com/docs/self-hosting/iam-pod-identity, with the AWS CLI.
#
#   CLUSTER=<eks cluster> REGION=<region> BUCKET=<sessions bucket> \
#   DOMAIN_ARN=<opensearch domain arn> [KMS_KEY_ARN=<bucket key arn>] \
#     bash 2-create-iam.sh
#
# Needs aws and jq. Safe to rerun: existing roles keep their name, and their
# inline policy is replaced; existing associations are skipped.
set -euo pipefail
: "${CLUSTER:?set CLUSTER}" "${REGION:?set REGION}" "${BUCKET:?set BUCKET}" "${DOMAIN_ARN:?set DOMAIN_ARN}"
KMS_KEY_ARN="${KMS_KEY_ARN:-}"
NS=agent-relay
ACCT="$(aws sts get-caller-identity --query Account --output text)"
B="arn:aws:s3:::$BUCKET"

trust='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"pods.eks.amazonaws.com"},"Action":["sts:AssumeRole","sts:TagSession"]}]}'

kms() { # kms ACTION...: one KMS statement, or nothing without a key
  [ -n "$KMS_KEY_ARN" ] || { echo '[]'; return; }
  jq -cn --arg k "$KMS_KEY_ARN" --arg s "s3.$REGION.amazonaws.com" '[{Sid:"UseBucketKey",Effect:"Allow",Action:$ARGS.positional,Resource:[$k],Condition:{StringEquals:{"kms:ViaService":$s}}}]' --args "$@"
}

sessions_policy="$(jq -cn --arg b "$B" --argjson kms "$(kms kms:Decrypt kms:GenerateDataKey)" '{Version:"2012-10-17",Statement:([
  {Sid:"ListBucket",Effect:"Allow",Action:["s3:ListBucket","s3:GetBucketLocation"],Resource:[$b]},
  {Sid:"ReadWriteObjects",Effect:"Allow",Action:["s3:GetObject","s3:PutObject","s3:AbortMultipartUpload","s3:ListMultipartUploadParts","s3:DeleteObject"],Resource:[$b+"/*"]}
] + $kms)}')"

search_policy() { # search_policy ACTION...
  jq -cn --arg b "$B" --arg d "$DOMAIN_ARN/*" --argjson kms "$(kms kms:Decrypt)" '{Version:"2012-10-17",Statement:([
    {Sid:"OpenSearchHttp",Effect:"Allow",Action:$ARGS.positional,Resource:[$d]},
    {Sid:"ListSessionsBucket",Effect:"Allow",Action:["s3:ListBucket"],Resource:[$b]},
    {Sid:"ReadSessionObjects",Effect:"Allow",Action:["s3:GetObject"],Resource:[$b+"/*"]}
  ] + $kms)}' --args "$@"
}

role() { # role NAME POLICY
  if aws iam get-role --role-name "$1" >/dev/null 2>&1; then
    echo "role $1 exists"
  else
    aws iam create-role --role-name "$1" --assume-role-policy-document "$trust" >/dev/null
    echo "role $1 created"
  fi
  aws iam put-role-policy --role-name "$1" --policy-name agent-relay --policy-document "$2"
}

role agent-relay-sessions "$sessions_policy"
role agent-relay-search-indexer "$(search_policy es:ESHttpGet es:ESHttpHead es:ESHttpPost es:ESHttpPut es:ESHttpDelete es:ESHttpPatch)"
role agent-relay-search-reader "$(search_policy es:ESHttpGet es:ESHttpHead es:ESHttpPost)"

link() { # link SERVICEACCOUNT ROLE
  if aws eks list-pod-identity-associations --cluster-name "$CLUSTER" --region "$REGION" --namespace "$NS" \
       --service-account "$1" --query 'associations[0].associationId' --output text | grep -qv None; then
    echo "association $1 exists"
  else
    aws eks create-pod-identity-association --cluster-name "$CLUSTER" --region "$REGION" --namespace "$NS" \
      --service-account "$1" --role-arn "arn:aws:iam::$ACCT:role/$2" >/dev/null
    echo "association $1 -> $2 created"
  fi
}
for sa in agent-relay-worker agent-relay-alleyoop agent-relay-session-ingest-api; do link "$sa" agent-relay-sessions; done
link agent-relay-search-indexer agent-relay-search-indexer
link agent-relay-session-read agent-relay-search-reader

echo
echo "For settings.sh:"
echo "export INDEXER_ROLE_ARN=arn:aws:iam::$ACCT:role/agent-relay-search-indexer"
echo "export READER_ROLE_ARN=arn:aws:iam::$ACCT:role/agent-relay-search-reader"
echo
echo "Next: allow these two role ARNs (and your master-user role) es:ESHttp* in the OpenSearch domain's access policy."
