---
title: Single sign-on with Okta
description: Add Okta (OIDC) sign-in to a running install, beside password sign-in, in four steps.
---

> **Enterprise feature.** Single sign-on is part of Agent Relay Enterprise and
> needs an Enterprise agreement for production use. See
> [Licensing](/docs/self-hosting/overview#licensing).

<!-- agent
STOP before step 1 and ask the human to confirm their organization has an Agent
Relay Enterprise agreement, or that this is an evaluation install.
-->

**Safe to try:** password sign-in stays on beside Okta, and step 4 turns Okta
off again. With Okta on, people **don't need accounts created**: an Okta user
assigned to the app, whose email domain you allow, joins as a member the first
time they sign in. Nothing here is sent to Agent Relay.

These steps are written for EKS, and were run end to end against a real Okta
organization. On GKE they are the same, using step 11 of
[Install on GKE](/docs/self-hosting/install-gke) for the upgrade. Any OIDC provider works the same way:
create a web app with the redirect below and use its issuer.

## 1. Create the Okta app and store its secret (Okta admin, about 2 minutes)

From the `agent-relay-install` folder, with `kubectl` access and an Okta API
token (Okta Admin › Security › API › Tokens). `okta-setup.sh` came with step 1's
files. It writes to your current `kubectl` context, so check that first with
`kubectl config current-context`:

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
- uses your Okta org as the issuer (see [Issuer](#issuer) below);
- creates an OIDC web app with the redirect `https://<domain>/login/oidc/callback`;
- assigns the group;
- stores the client secret in the cluster (`agent-relay-secrets`, key
  `oidc-client-secret`) and in `~/.agent-relay-install`;
- prints the lines for step 2.

It never prints the token or the client secret. Run it once: it stops if an
active Okta app labelled "Agent Relay" already exists. To start over, deactivate
and delete that app in Okta first.

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

<a id="issuer"></a>**Issuer.** Use your org's issuer, `https://<org>.okta.com`. It needs no
extra Okta setup, and it's what `okta-setup.sh` uses. A custom authorization
server such as `https://<org>.okta.com/oauth2/default` also works, but only once
it has an access policy with a rule that allows the Authorization Code grant for
this app. Without one, every sign-in fails with "You are not allowed to access
this app" (`no_matching_policy` in Okta's System Log). To have the script use a
custom server, also set `OKTA_ISSUER=https://<org>.okta.com/oauth2/<id>`; it
stops before creating anything if that server has no access policy.

The `kubectl apply` rebuilds the whole `agent-relay-secrets` Secret from that
folder, so run it only with the complete folder from the install.

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
      autoJoinDomains: [<your email domain>]
  ```

`autoJoinDomains` (beside `oidc:`) lets those people join without an invite.

The client ID isn't secret; it's fine in `values.yaml`.

## 3. Apply and check

Run the same `helm upgrade` you installed with (step 11 of the install), with
every `-f` file and `--set` you used then, for example a release images
overlay from an upgrade. Helm replaces the release's values rather than merging
them, so leaving one out undoes it. Then:

```sh
curl -s "https://$DOMAIN/cloud/api/v1/auth/login-config" | jq '{methods, oidc}'
```

**Done when:**

- `oidc` shows `{"displayName": "Okta"}` (`methods` stays `["password"]`;
  that's expected);
- `https://<domain>/login` shows **Continue with Okta** beside the password form;
- someone in the group can sign in with it and lands in your organization as a
  member;
- someone outside the group is refused by Okta.

People sign in under the Okta app's authentication policy. Okta's default for
new apps requires two factors, so on first sign-in people are asked to set up
Okta Verify or a passkey. Change the app's policy in Okta (Applications ›
Agent Relay › Sign On) if that isn't what you want.

**Sign-in fails?** Okta's System Log (Reports › System Log) names the reason:
`no_matching_policy` means the issuer's authorization server needs an access
policy (see [Issuer](#issuer)); "User is not assigned to the client
application" means the person isn't in the group.

<!-- agent
ASK THE HUMAN for approval before the helm upgrade. The last two checks need
real people: ASK THE HUMAN to try both and report the result.
-->

## 4. To turn it off

Remove the `oidc:` block, `autoJoinDomains` and the `oidcClientSecret` line from `values.yaml`,
then run the `helm upgrade` again. Password sign-in keeps working throughout.
If that leaves `auth:` or `secretKeys:` with nothing under it, delete that line
too: an empty key removes the chart's defaults, and Helm refuses the upgrade.

To remove the stored secret as well, delete
`~/.agent-relay-install/secret-files/agent-relay-secrets/oidc-client-secret` and
rerun the `kubectl apply` from step 1. Then deactivate and delete the Agent
Relay app in Okta. People who joined through Okta stay members until an owner
removes them in **Settings → Members**.
