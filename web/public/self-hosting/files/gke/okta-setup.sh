#!/usr/bin/env bash
# Create the Okta app for Agent Relay sign-in, assign a group, and store the
# client secret in the cluster. Run by your Okta admin, from the
# agent-relay-install folder, with kubectl access to the cluster.
#
#   OKTA_ORG=https://<your-org>.okta.com \
#   APP_DOMAIN=<app hostname, e.g. ar.example.com> \
#   OKTA_GROUP='<Okta group allowed to sign in>' \
#   ALLOWED_DOMAIN=<email domain, e.g. example.com> \
#     bash okta-setup.sh
#
# It asks for an Okta API token (Okta Admin > Security > API > Tokens) without
# echoing it. The token and the client secret are never printed. Needs curl,
# jq and kubectl.
set -euo pipefail
: "${OKTA_ORG:?set OKTA_ORG}" "${APP_DOMAIN:?set APP_DOMAIN}" "${OKTA_GROUP:?set OKTA_GROUP}" "${ALLOWED_DOMAIN:?set ALLOWED_DOMAIN}"
OKTA_ORG="${OKTA_ORG%/}"
NS=agent-relay
DIR="$HOME/.agent-relay-install/secret-files/agent-relay-secrets"
[ -d "$DIR" ] || { echo "no $DIR: run the install's step 8 first" >&2; exit 1; }
read -rs -p 'Okta API token: ' OKTA_TOKEN; echo
CFG="$(mktemp)"; chmod 600 "$CFG"; trap 'rm -f "$CFG"' EXIT
printf 'header = "Authorization: SSWS %s"\n' "$OKTA_TOKEN" > "$CFG"; unset OKTA_TOKEN
okta() { curl -fsS -K "$CFG" -H 'Accept: application/json' -H 'Content-Type: application/json' "$@"; }

# 1. Issuer: Okta's default custom authorization server if you have one, else the org server.
if curl -fsS -o /dev/null "$OKTA_ORG/oauth2/default/.well-known/openid-configuration" 2>/dev/null; then
  ISSUER="$OKTA_ORG/oauth2/default"
else
  ISSUER="$OKTA_ORG"
fi
echo "issuer: $ISSUER"

# 2. The group must exist.
GROUP_ID="$(okta -G "$OKTA_ORG/api/v1/groups" --data-urlencode "q=$OKTA_GROUP" |
  jq -r --arg n "$OKTA_GROUP" '[.[] | select(.profile.name == $n)][0].id // empty')"
[ -n "$GROUP_ID" ] || { echo "Okta group '$OKTA_GROUP' not found" >&2; exit 1; }

# 3. Create the app (OIDC web app, authorization code).
APP="$(jq -n --arg d "$APP_DOMAIN" '{
  name: "oidc_client", label: "Agent Relay", signOnMode: "OPENID_CONNECT",
  credentials: {oauthClient: {token_endpoint_auth_method: "client_secret_basic"}},
  settings: {oauthClient: {
    client_uri: ("https://" + $d),
    redirect_uris: [("https://" + $d + "/login/oidc/callback")],
    response_types: ["code"], grant_types: ["authorization_code"],
    application_type: "web", consent_method: "TRUSTED"}}}' |
  okta -X POST "$OKTA_ORG/api/v1/apps" --data-binary @-)"
APP_ID="$(jq -r .id <<<"$APP")"
CLIENT_ID="$(jq -r .credentials.oauthClient.client_id <<<"$APP")"
echo "app created: $APP_ID (client id $CLIENT_ID)"

# 4. Assign the group.
okta -X PUT "$OKTA_ORG/api/v1/apps/$APP_ID/groups/$GROUP_ID" --data-binary '{}' >/dev/null
echo "group assigned: $OKTA_GROUP"

# 5. Store the client secret with the other install secrets, and in the cluster.
( umask 077; jq -jr .credentials.oauthClient.client_secret <<<"$APP" > "$DIR/oidc-client-secret" )
unset APP
kubectl -n "$NS" create secret generic agent-relay-secrets --from-file="$DIR" \
  --dry-run=client -o yaml | kubectl apply -f - >/dev/null
echo "client secret stored in Secret agent-relay-secrets (key oidc-client-secret)"

cat <<EOF

Next, in values.yaml under relay-control:
  in secretKeys:, add
    oidcClientSecret: oidc-client-secret
  in auth:, add
    oidc:
      issuer: $ISSUER
      clientId: $CLIENT_ID
      allowedDomains: [$ALLOWED_DOMAIN]
      displayName: Okta
    autoJoinDomains: [$ALLOWED_DOMAIN]   # beside oidc:, lets these users join without an invite

Then run the helm upgrade from step 11 of the install guide (agentrelay.com/docs/self-hosting).
Back up ~/.agent-relay-install again: it now holds the Okta client secret.
EOF
