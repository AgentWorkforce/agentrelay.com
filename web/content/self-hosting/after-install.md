---
title: After the install
description: Finish setup once the first session arrives - Output and digest coverage, generated titles and summaries, and the agent-name filter.
---

Do these once the install's checks pass and the first admin has signed in.
The commands use the EKS `helm upgrade` from step 11 of
[Install on EKS](/docs/self-hosting/install-eks). On GKE, use the
`helm upgrade` from step 11 of [Install on GKE](/docs/self-hosting/install-gke)
with the same extra flags.

## 1. Check the first session end to end

1. Sign the [desktop app](/docs/self-hosting/desktop-app) in to your install and
   run one agent session.
2. Open the dashboard's **Sessions** page.

**Done when:** the session is listed, opens, and can be found by search. Search
can lag the upload by a minute or so.

Also check that no TLS errors reach the logs:

```sh
for d in relay-control relaycast agent-relay-read-api agent-relay-ingest-edge agent-relay-search-indexer; do
  echo "$d: $(kubectl -n agent-relay logs deploy/$d --since=15m | grep -ciE 'self.signed|certificate verify|ssl error')"
done
```

**Done when:** every count is `0`.

## 2. Establish Output and digest coverage

After the first session is indexed, run this once. It queues any sessions that
still owe facts, waits for the indexer, then marks each workspace complete:

```sh
cd "$INFRA"
helm upgrade agent-relay charts/agent-relay --namespace agent-relay \
  -f charts/agent-relay/values-eks.yaml -f charts/agent-relay/values-eks-native.yaml \
  -f "$INSTALL_DIR/values.yaml" \
  --set sessions-pipeline.searchIndexer.outputFacts.bootstrap.enabled=true \
  --set-string sessions-pipeline.searchIndexer.outputFacts.bootstrap.runId=initial \
  --wait --wait-for-jobs --timeout 25m
cd "$INSTALL_DIR"
```

**Done when:** the upgrade completes. Until that Job completes, the Output and
daily digest endpoints deliberately answer `*_backfill_incomplete`.

Use a new `runId` after later upgrades of a populated install, or when a new
workspace starts uploading. The digest uses no narrative model, so its
statistics stay inside your cluster.

<!-- agent
ASK THE HUMAN for approval before this helm upgrade.
-->

## 3. Turn on titles and summaries

Without this, sessions appear as `Session · <id>`. You need the default
workspace ID, a model ID and an API key for an OpenAI-compatible endpoint.

```sh
kubectl -n agent-relay logs deploy/relay-control | grep 'default workspace created'
read -rs -p 'API key: ' k; kubectl -n agent-relay create secret generic agent-relay-llm \
  --from-literal=OPENAI_API_KEY="$k" --dry-run=client -o yaml | kubectl apply -f - ; unset k; echo
```

In `values.yaml`, replace `__LLM_MODEL__` with your model ID, and under
`sessions-pipeline.worker` make these changes:

```yaml
    nativeBrief:
      enabled: true
      workspaceIds: ["<workspace id>"]
      model: <model id>
    components:
      session-brief:
        enabled: true
      bob-costas:
        env:
          - { name: BOB_COSTAS_MODEL, value: <model id> }
          - { name: OPENAI_BASE_URL, value: "https://<your endpoint>/v1" }
          - name: OPENAI_API_KEY
            valueFrom:
              secretKeyRef: { name: agent-relay-llm, key: OPENAI_API_KEY }
```

Keep the `image` and `sweepSeconds` lines already in `nativeBrief`. Then run the
`helm upgrade` from step 11 and repeat step 12's migration check. New
workspaces need their ID added to `workspaceIds`.

**Done when:** a new session gets a generated title on the dashboard.

<!-- agent
The API key is entered by the human: ASK THE HUMAN to run the "read -rs" line
in their own terminal. Never accept the key in chat.
-->

### Using a gateway (Amazon Bedrock or similar)

Run an OpenAI-compatible gateway, then add to the settings above:

```yaml
    allowInClusterHttp: true         # only for an http Service URL; summaries need it
    nativeBrief:
      baseUrl: https://<gateway>/v1  # or http://<service>.<namespace>.svc/v1
      allowInClusterHttp: true       # only for an http Service URL
      model: <the gateway's model id>
```

Set `OPENAI_BASE_URL` for `bob-costas` to the same address, and
`BOB_COSTAS_MODEL` to the gateway's model ID.

- The gateway must serve both the Responses API (`<baseUrl>/responses`, for
  titles and briefs) and chat completions (for summaries).
- Give the gateway its own cloud identity for the model provider. Don't reuse
  the Agent Relay roles.
- `agent-relay-llm` holds the gateway's key, under `OPENAI_API_KEY`.
- `baseUrl` must be https, or http to a Kubernetes Service name
  (`<service>.<namespace>.svc` or `.svc.cluster.local`), with no credentials,
  query or fragment.
- The workers' NetworkPolicy is off in this install, so egress is open. If you
  turn it on, `nativeBrief.openaiEgress` opens TCP 443 only, and its `to` list
  must name the gateway.

## 4. Optional: the agent-name filter

Filtering sessions by agent name (`GET /v1/sessions?workspace=<ws>&agent=<name>`)
answers `501 agent_filter_not_ready` until you activate it. Everything else
works without it. Activate it in a short maintenance window, once at least one
session has been fully processed, and before anyone deletes a session.

**4a. Get the activation script and define the Job runner.** The audit runs as
a short-lived Job inside the cluster. It reads the database URL from
`agent-relay-secrets` and the CA from `rds-ca`, so no credential enters your
shell. Fetch `scripts/native-agent-catalog-activation.ts` from
[AgentWorkforce/relayhistory-pipeline](https://github.com/AgentWorkforce/relayhistory-pipeline)
at commit `7e9b2f0f` (the sessions image's source) to a local path.

```sh
export SCRIPT=<path to native-agent-catalog-activation.ts>
kubectl -n agent-relay create configmap native-agent-catalog-activation \
  --from-file=native-agent-catalog-activation.ts="$SCRIPT" \
  --dry-run=client -o yaml | kubectl apply -f -

run_catalog_job() {
  local name="$1" action="$2" fingerprint="${3:-}" args pod rc
  case "$action" in
    --plan) args="$(jq -cn '["/app/scripts/native-agent-catalog-activation.ts","--plan"]')" ;;
    --apply)
      [[ "$fingerprint" =~ ^[0-9a-f]{64}$ ]] || { echo "fingerprint must be 64 lowercase hex characters" >&2; return 64; }
      args="$(jq -cn --arg f "$fingerprint" '["/app/scripts/native-agent-catalog-activation.ts","--apply",$f]')" ;;
    *) echo "action must be --plan or --apply" >&2; return 64 ;;
  esac
  kubectl -n agent-relay delete job "$name" --ignore-not-found
  cat <<YAML | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata: { name: $name, namespace: agent-relay }
spec:
  backoffLimit: 0
  template:
    spec:
      automountServiceAccountToken: false
      restartPolicy: Never
      securityContext: { runAsNonRoot: true, runAsUser: 1000, runAsGroup: 1000, fsGroup: 1000, seccompProfile: { type: RuntimeDefault } }
      containers:
        - name: activation
          image: $SERVICES_IMAGE
          workingDir: /app
          command: ["bun"]
          args: $args
          env:
            - name: HOOPDB_URL
              valueFrom: { secretKeyRef: { name: agent-relay-secrets, key: HOOPDB_MIGRATION_URL } }
            - { name: HOOPDB_DB_MODE, value: selfhosted }
            - { name: NODE_EXTRA_CA_CERTS, value: /ca/rds-ca.pem }
          resources: { requests: { cpu: 50m, memory: 128Mi }, limits: { cpu: 500m, memory: 512Mi } }
          securityContext: { allowPrivilegeEscalation: false, capabilities: { drop: ["ALL"] }, readOnlyRootFilesystem: true }
          volumeMounts:
            - { name: activation-script, mountPath: /app/scripts/native-agent-catalog-activation.ts, subPath: native-agent-catalog-activation.ts, readOnly: true }
            - { name: rds-ca, mountPath: /ca/rds-ca.pem, subPath: ca.crt, readOnly: true }
            - { name: tmp, mountPath: /tmp }
      volumes:
        - { name: activation-script, configMap: { name: native-agent-catalog-activation } }
        - { name: rds-ca, configMap: { name: rds-ca } }
        - { name: tmp, emptyDir: { sizeLimit: 32Mi } }
YAML
  kubectl -n agent-relay wait --for=create pod -l job-name="$name" --timeout=2m
  pod="$(kubectl -n agent-relay get pod -l job-name="$name" -o jsonpath='{.items[0].metadata.name}')"
  rc=""
  for _ in $(seq 1 120); do
    rc="$(kubectl -n agent-relay get pod "$pod" -o jsonpath='{.status.containerStatuses[0].state.terminated.exitCode}' 2>/dev/null || true)"
    [ -n "$rc" ] && break; sleep 5
  done
  [ -n "$rc" ] || { echo "catalog Job timed out" >&2; return 1; }
  kubectl -n agent-relay logs "$pod"
  return "$rc"
}
```

**4b. Preflight (read-only, before pausing anything):**

```sh
run_catalog_job native-agent-catalog-preflight --plan; echo "exit $?"
kubectl -n agent-relay delete job native-agent-catalog-preflight
```

**Done when:** it prints one JSON plan line and `exit 0` or `exit 2`. Exit `2`
means not yet eligible, which is fine for a preflight.

**4c. Pause writers.** Stop uploads first, then, once the indexer has drained its
queue, stop it too:

```sh
kubectl -n agent-relay scale deploy/agent-relay-ingest-edge --replicas=0
# wait for the indexer to drain, then:
kubectl -n agent-relay scale deploy/agent-relay-search-indexer --replicas=0
```

**4d. Plan, then apply:**

```sh
run_catalog_job native-agent-catalog-plan --plan; echo "exit $?"
fingerprint=<64-character fingerprint from the plan line>
run_catalog_job native-agent-catalog-apply --apply "$fingerprint"; echo "exit $?"
```

**Done when:** the plan exits `0` with `"eligible":true` and every counter
except `liveRows` at `0`, and the apply exits `0` with `"activated":true`.

- **`unprojected` above 0:** wait a minute and plan again.
- **`native_catalog_plan_changed`:** something moved; plan again and use the
  new fingerprint.
- **`unknownUsers` above 0:** a session was uploaded without a resolvable user;
  [ask us](/docs/self-hosting/support).
- **Exit 64:** `HOOPDB_DB_MODE` is wrong or the URL isn't `sslmode=verify-full`.

**4e. Resume and clean up:**

```sh
kubectl -n agent-relay scale deploy/agent-relay-search-indexer --replicas=1
kubectl -n agent-relay rollout status deploy/agent-relay-search-indexer --timeout=10m
kubectl -n agent-relay scale deploy/agent-relay-ingest-edge --replicas=1
kubectl -n agent-relay rollout status deploy/agent-relay-ingest-edge --timeout=10m
kubectl -n agent-relay delete job native-agent-catalog-plan native-agent-catalog-apply
kubectl -n agent-relay delete configmap native-agent-catalog-activation
```

**Done when:** both rollouts complete and the agent filter answers 200.

On GKE, mount the `cloud-sql-ca` ConfigMap instead of `rds-ca` in the Job. To
roll the filter back, [ask us](/docs/self-hosting/support): it is a database
write.

<!-- agent
Steps 4c to 4e pause uploads and write to the database. ASK THE HUMAN to
schedule the window and approve each of: scaling down, the apply, and scaling
back up. Never apply a fingerprint from a plan that ran before writers were
paused. STOP on any exit code other than those listed.
-->
