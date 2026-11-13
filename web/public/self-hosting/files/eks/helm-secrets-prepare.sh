#!/usr/bin/env bash
# For teams using the helm-secrets plugin: turn the install's generated secret
# files into one values file you can encrypt with SOPS, plus a tiny chart that
# creates the five Kubernetes Secrets from it.
#
#   bash helm-secrets-prepare.sh        # after rds-setup.sh pre (step 8)
#   VALS_SSM=/agent-relay bash helm-secrets-prepare.sh
#
# Writes, in the current folder:
#   agent-relay-secrets-chart/   the chart (5 Secrets, nothing else)
#   secrets.yaml                 PLAINTEXT values: encrypt it, then delete it
# With VALS_SSM=<path prefix>, each value goes to SSM Parameter Store instead
# (SecureString, <prefix>/<secret>/<key>, overwriting), and secrets.yaml holds
# only vals references (ref+awsssm://...), no secret values. Needs the aws CLI
# and AWS_REGION for that.
# Needs python3 (standard library only).
set -euo pipefail
SRC="${SECRET_FILES:-$HOME/.agent-relay-install/secret-files}"
[ -d "$SRC/agent-relay-secrets" ] || { echo "no $SRC/agent-relay-secrets: run rds-setup.sh pre first" >&2; exit 1; }

# The generated keys from step 10 of the install guide, created here if missing.
S="$SRC"
( umask 077
for k in selfhost-bootstrap-token selfhost-setup-key relaycast-internal-secret \
         relaycast-workspace-bootstrap-secret relaycontrol-introspect-secret session-read-api-secret; do
  [ -s "$S/agent-relay-secrets/$k" ] || openssl rand -hex 32 | tr -d '\n' > "$S/agent-relay-secrets/$k"
done
[ -s "$S/agent-relay-secrets/selfhost-encryption-key" ] || openssl rand -hex 32 | tr -d '\n' > "$S/agent-relay-secrets/selfhost-encryption-key"
[ -s "$S/agent-relay-secrets/SUMMARY_MASTER_KEYS" ] || printf 'k1:%s' "$(openssl rand -hex 32)" > "$S/agent-relay-secrets/SUMMARY_MASTER_KEYS"
cp "$S/agent-relay-secrets/relaycontrol-introspect-secret" "$S/agent-relay-ingest-edge-runtime/introspect-secret" )

mkdir -p agent-relay-secrets-chart/templates
cat > agent-relay-secrets-chart/Chart.yaml <<'EOF'
apiVersion: v2
name: agent-relay-secrets
description: The Kubernetes Secrets the agent-relay chart references by name.
version: 0.1.0
EOF
cat > agent-relay-secrets-chart/templates/secrets.yaml <<'EOF'
{{- range $name, $data := .Values.secrets }}
---
apiVersion: v1
kind: Secret
metadata:
  name: {{ $name }}
type: Opaque
data:
{{- range $key, $value := $data }}
  {{ $key }}: {{ $value | b64enc | quote }}
{{- end }}
{{- end }}
EOF

NAMES="agent-relay-secrets agent-relay-read-api agent-relay-ingest-edge-runtime search-indexer-runtime search-indexer-owner"

if [ -n "${VALS_SSM:-}" ]; then
  : "${AWS_REGION:?set AWS_REGION for SSM}"
  P="${VALS_SSM%/}"; [[ "$P" == /* ]] || P="/$P"
  for n in $NAMES; do
    for f in "$SRC/$n"/*; do
      [ -f "$f" ] || continue
      aws ssm put-parameter --region "$AWS_REGION" --type SecureString --overwrite \
        --name "$P/$n/$(basename "$f")" --value "file://$f" >/dev/null
    done
  done
  python3 - "$SRC" "$P" "$AWS_REGION" > secrets.yaml <<'EOF'
import json, os, sys
src, prefix, region = sys.argv[1:4]
names = ["agent-relay-secrets", "agent-relay-read-api", "agent-relay-ingest-edge-runtime",
         "search-indexer-runtime", "search-indexer-owner"]
out = {}
for n in names:
    d = os.path.join(src, n)
    out[n] = {k: "ref+awsssm:/%s/%s/%s?region=%s" % (prefix, n, k, region)
              for k in sorted(os.listdir(d)) if os.path.isfile(os.path.join(d, k)) and not k.startswith(".")}
print(json.dumps({"secrets": out}, indent=1))
EOF
  echo "stored $(grep -c 'ref+awsssm' secrets.yaml) values in SSM under $P/ and wrote vals references to secrets.yaml"
  echo "Next: helm secrets --backend vals upgrade --install agent-relay-secrets ./agent-relay-secrets-chart -n agent-relay -f secrets.yaml"
  exit 0
fi

( umask 077
python3 - "$SRC" > secrets.yaml <<'EOF'
import json, os, sys
src = sys.argv[1]
names = ["agent-relay-secrets", "agent-relay-read-api", "agent-relay-ingest-edge-runtime",
         "search-indexer-runtime", "search-indexer-owner"]
out = {}
for n in names:
    d = os.path.join(src, n)
    out[n] = {k: open(os.path.join(d, k)).read() for k in sorted(os.listdir(d))
              if os.path.isfile(os.path.join(d, k)) and not k.startswith(".")}
# JSON is valid YAML; one key per line keeps SOPS diffs readable.
print(json.dumps({"secrets": out}, indent=1))
EOF
)
echo "wrote agent-relay-secrets-chart/ and secrets.yaml ($(grep -c '": "' secrets.yaml) values)"
echo "Next: sops -e secrets.yaml > secrets.enc.yaml && rm secrets.yaml"
