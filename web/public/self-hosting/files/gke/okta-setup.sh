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
# The issuer is the org authorization server (OKTA_ORG). To use a custom
# authorization server, also set OKTA_ISSUER=https://<your-org>.okta.com/oauth2/<id>;
# it then needs an access policy and rule allowing the Authorization Code grant
# for this app, or every sign-in fails with "no_matching_policy" (the script
# stops before creating anything if that server has no access policy).
# Run it once: it refuses if an active app labelled "Agent Relay" already exists.
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
read -rs -p 'Okta API token: ' OKTA_TOKEN; [ -t 0 ] && echo
CFG="$(mktemp)"; chmod 600 "$CFG"; trap 'rm -f "$CFG"' EXIT
printf 'header = "Authorization: SSWS %s"\n' "$OKTA_TOKEN" > "$CFG"; unset OKTA_TOKEN
okta() { curl -fsS -K "$CFG" -H 'Accept: application/json' -H 'Content-Type: application/json' "$@"; }

# 1. Issuer: the org authorization server, which needs no extra Okta setup.
# Set OKTA_ISSUER to use a custom authorization server instead (for example
# $OKTA_ORG/oauth2/default); it must have an access policy that allows this app.
ISSUER="${OKTA_ISSUER:-$OKTA_ORG}"
ISSUER="${ISSUER%/}"
curl -fsS -o /dev/null "$ISSUER/.well-known/openid-configuration" ||
  { echo "no OpenID configuration at $ISSUER" >&2; exit 1; }
echo "issuer: $ISSUER"
if [ "$ISSUER" != "$OKTA_ORG" ]; then
  AS_ID="${ISSUER##*/oauth2/}"
  POLICIES="$(okta "$OKTA_ORG/api/v1/authorizationServers/$AS_ID/policies" 2>/dev/null)" || POLICIES=unknown
  if [ "$POLICIES" = "[]" ]; then
    echo "authorization server $AS_ID has no access policy, so every sign-in would fail." >&2
    echo "Add an access policy and rule for this app in Okta, or unset OKTA_ISSUER to use the org issuer." >&2
    exit 1
  fi
fi

# Run once: a second run would create a second app and replace the stored secret.
EXISTING="$(okta -G "$OKTA_ORG/api/v1/apps" --data-urlencode 'q=Agent Relay' --data-urlencode 'limit=200' |
  jq -r '[.[] | select(.label == "Agent Relay" and .status == "ACTIVE")][0].id // empty')"
[ -z "$EXISTING" ] || { echo "an active Okta app labelled \"Agent Relay\" already exists ($EXISTING). To start over, deactivate and delete it in Okta first." >&2; exit 1; }

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
