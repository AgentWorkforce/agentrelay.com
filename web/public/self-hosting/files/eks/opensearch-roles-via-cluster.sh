#!/usr/bin/env bash
# Step 7 of agentrelay.com/docs/self-hosting/install-eks, without VPC access: map the two OpenSearch roles through a
# temporary relay pod in the cluster.
#
# Needs: kubectl access to the cluster, AWS CLI v2, curl 7.75 or later, and AWS
# credentials for the OpenSearch admin role. Uses OPENSEARCH_URL, AWS_REGION,
# INDEXER_ROLE_ARN and READER_ROLE_ARN from settings.sh (step 6).
#
#   bash opensearch-roles-via-cluster.sh
#
# Credentials reach curl through a config file on a pipe, never the command
# line. The relay pod pulls alpine/socat from Docker Hub; mirror it first if the
# cluster cannot reach Docker Hub. The pod is deleted when the script exits.
set -euo pipefail
: "${OPENSEARCH_URL:?export OPENSEARCH_URL (settings.sh)}" "${AWS_REGION:?export AWS_REGION}"
: "${INDEXER_ROLE_ARN:?export INDEXER_ROLE_ARN (settings.sh)}" "${READER_ROLE_ARN:?export READER_ROLE_ARN (settings.sh)}"

HOST="${OPENSEARCH_URL#https://}"
pf=""
cleanup() {
  [ -n "$pf" ] && kill "$pf" 2>/dev/null || true
  kubectl -n default delete pod os-relay --ignore-not-found >/dev/null
}
trap cleanup EXIT

kubectl -n default run os-relay --image=alpine/socat:1.8.0.3 --restart=Never -- \
  TCP-LISTEN:9443,fork,reuseaddr "TCP:$HOST:443"
kubectl -n default wait --for=condition=Ready pod/os-relay --timeout=2m
kubectl -n default port-forward pod/os-relay 9443:9443 >/dev/null & pf=$!
sleep 3

eval "$(aws configure export-credentials --format env)"

os() { # method path [json]
  curl -sS --fail-with-body --aws-sigv4 "aws:amz:$AWS_REGION:es" \
    --connect-to "$HOST:443:127.0.0.1:9443" \
    -K <(printf 'user = "%s:%s"\nheader = "x-amz-security-token: %s"\n' \
          "$AWS_ACCESS_KEY_ID" "$AWS_SECRET_ACCESS_KEY" "${AWS_SESSION_TOKEN:-}") \
    -H 'Content-Type: application/json' -X "$1" "https://$HOST$2" ${3:+-d "$3"}
  echo
}

os PUT /_plugins/_security/api/roles/relayhistory_indexer \
  '{"cluster_permissions":["cluster_monitor","indices:data/write/bulk"],"index_permissions":[{"index_patterns":["relayhistory-*"],"allowed_actions":["write","create_index","indices:data/write/bulk*","indices:monitor/settings/get","indices:admin/mapping/put","indices:data/read/search*","indices:data/read/scroll*","indices:data/read/mget*","indices:data/write/delete/byquery","indices:admin/refresh*","indices:admin/get"]}]}'
os PUT /_plugins/_security/api/rolesmapping/relayhistory_indexer "{\"backend_roles\":[\"$INDEXER_ROLE_ARN\"]}"
os PUT /_plugins/_security/api/roles/relayhistory_reader \
  '{"cluster_permissions":["cluster_composite_ops_ro"],"index_permissions":[{"index_patterns":["relayhistory-*"],"allowed_actions":["read"]}]}'
os PUT /_plugins/_security/api/rolesmapping/relayhistory_reader "{\"backend_roles\":[\"$READER_ROLE_ARN\"]}"
echo "search roles done"
