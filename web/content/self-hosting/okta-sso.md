---
title: Single sign-on with Okta
description: Add Okta (OIDC) sign-in to a running install, beside password sign-in, in four steps.
---

**Safe to try:** password sign-in stays on beside Okta, and step 4 turns Okta
off again. With Okta on, people **don't need accounts created**: an Okta user
assigned to the app, whose email domain you allow, joins as a member the first
time they sign in. Nothing here is sent to Agent Relay.

These steps were written and tested on EKS. On GKE they are the same, using
step 11 of [Install on GKE](/docs/self-hosting/install-gke) for the upgrade,
but they haven't been run there yet. Any OIDC provider works the same way:
create a web app with the redirect below and use its issuer.

## 1. Create the Okta app and store its secret (Okta admin, about 2 minutes)

From the `agent-relay-install` folder, with `kubectl` access and an Okta API
token (Okta Admin › Security › API › Tokens). `okta-setup.sh` came with step 1's
files:

```sh
source settings.sh
OKTA_ORG=https://<your-org>.okta.com \
APP_DOMAIN="$DOMAIN" \
OKTA_GROUP='<Okta group allowed to use Agent Relay>' \
ALLOWED_DOMAIN=<your email domain> \
  bash okta-setup.sh
```

The script:

- asks for the API token without echoing it;
- creates an OIDC web app with the redirect `https://<domain>/login/oidc/callback`;
- assigns the group;
- picks the issuer;
- stores the client secret in the cluster (`agent-relay-secrets`, key
  `oidc-client-secret`) and in `~/.agent-relay-install`;
- prints the lines for step 2.

It never prints the token or the client secret.

**Done when:** it prints `client secret stored`, followed by the values for
step 2.

**Prefer the Okta console?** Create an OIDC **Web Application** with the
Authorization Code grant, sign-in redirect `https://<domain>/login/oidc/callback`,
and assign the group. Then store the secret:

```sh
read -rs -p 'Okta client secret: ' X; echo
printf '%s' "$X" > ~/.agent-relay-install/secret-files/agent-relay-secrets/oidc-client-secret; unset X
kubectl -n agent-relay create secret generic agent-relay-secrets \
  --from-file=$HOME/.agent-relay-install/secret-files/agent-relay-secrets --dry-run=client -o yaml | kubectl apply -f -
```

The issuer is `https://<org>.okta.com/oauth2/default` if you have Okta API
Access Management, otherwise `https://<org>.okta.com`.

**Using helm-secrets or vals** ([Secrets](/docs/self-hosting/secrets))? After
this step, rerun your secrets commands. They pick up the new
`oidc-client-secret` file, and stop a later upgrade from dropping it.

<!-- agent
This step needs an Okta admin's API token: ASK THE HUMAN (Okta admin) to run
okta-setup.sh, or the console steps, in their own terminal. Never ask for,
accept or type the token or the client secret. Ask them to paste back only the
issuer and client ID lines the script prints.
-->

## 2. Add the settings to values.yaml

Under `relay-control:` in `values.yaml`:

- in `secretKeys:`, add `oidcClientSecret: oidc-client-secret`;
- in `auth:`, add (the script prints these filled in):

  ```yaml
      oidc:
        issuer: <issuer>
        clientId: <client ID>
        allowedDomains: [<your email domain>]
        displayName: Okta
  ```

The client ID isn't secret; it's fine in `values.yaml`.

## 3. Apply and check

Run the `helm upgrade` from step 11 of the install, then:

```sh
curl -s "https://api.$DOMAIN/cloud/api/v1/auth/login-config" | jq '{methods, oidc}'
```

**Done when:**

- `oidc` shows `Okta`;
- `https://<domain>/login` shows **Continue with Okta** beside the password form;
- someone in the group can sign in with it;
- someone outside the group is refused by Okta.

<!-- agent
ASK THE HUMAN for approval before the helm upgrade. The last two checks need
real people: ASK THE HUMAN to try both and report the result.
-->

## 4. To turn it off

Remove the `oidc:` block and the `oidcClientSecret` line from `values.yaml`,
then run the `helm upgrade` again. Password sign-in keeps working throughout.
