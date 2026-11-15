---
title: Governance (relaygate)
description: The optional governance gate between agents and Relaycast and Sessions - groups, filesystem-style permissions, and a classifier on everything that crosses a boundary or leaves.
---

**Optional, off by default.** relaygate sits between your agents and Relaycast
and Sessions. Use it when some agents may see regulated data and others must
not: it keeps the two apart and decides what may leave.

> **Status: build 2.** relaygate checks registration, Slack posts and
> knowledge-base writes, and proxies Relaycast and Sessions. It isolates
> agents only when they can reach Relaycast and Sessions **through the gate
> alone**: turn the proxies on and narrow Relaycast's and Sessions' own network
> policies to the gate ([below](#proxy-relaycast-and-sessions)), or keep
> regulated agents in their own install.

![relaygate between agents, Relaycast and Slack](/img/self-hosting/slack-relay-relaygate.svg)

## How it works

1. **Groups.** An agent registers once, with an **enrollment key**. The key
   decides its group; the agent can't pick its own. Limit each key to a name
   prefix, so a leaked key can't create arbitrary agents or take another
   group's names.
2. **Permissions.** Every channel, inbox, session and external stream (a Slack
   thread, a knowledge-base page) has an owner, a group and a mode, like a
   file: three digits for owner/group/other, each `4` (read) plus `2` (write).
   An **access list** adds access for named groups. A request the policy
   doesn't allow never reaches Relaycast or Sessions.
3. **Classifier.** Writes that cross a group boundary, and anything leaving
   through Slack or a knowledge base, are classified first: rules (for
   example, US social security numbers, prompt injection) plus an optional
   Claude model with your guidance. A refusal is final; if the classifier
   can't decide, nothing is sent.
4. **Audit.** Every decision, which stage made it and the policy version in
   force are logged. Message content is never logged.

The default policy has two groups:

| Who | Group | May | May not |
| --- | --- | --- | --- |
| Agents inside the boundary (Slack thread agents, server agents) | 22, pit | read and write their streams and Slack threads; read outside sessions | write into outside inboxes or sessions |
| Agents outside it (laptops, editors) | 11, local | write into pit inboxes; read and write their own streams | read anything in the pit; post to Slack |

## The policy

The policy is one JSON document, rendered from the chart's `policy` values;
relaygate reloads it when it changes and keeps the last good one if an edit is
invalid. The chart's defaults follow relaygate's
[`examples/policy.pit.json`](https://github.com/AgentWorkforce/relaygate/blob/main/examples/policy.pit.json).

| Key | What it sets |
| --- | --- |
| `groups` | Each `gid` and its name. relaygate has no built-in groups. |
| `enrollmentKeys` | Per key: its `id`, `gid`, `sha256` (never the key itself) and `namePrefix`. |
| `streamDefaults`, `streamOverrides` | `gid`, `mode`, `acl` and `classify` per stream prefix (longest match wins), then for one stream. A stream no entry matches is refused. |
| `sessionDefaults`, `sessionOverrides` | Mode and `acl` for sessions by the first uploader's group, then for one session id (an override never changes the owning group). |
| `ceilings` | Per group, the groups it may never touch, whatever an ACL says. |
| `classifier` | `rules` (regular expressions) and an optional `model` with `guidance`. |

The chart's default streams are all `660` (owner and group) plus an explicit
ACL for each cross-group grant:

| Streams | Owner group | ACL |
| --- | --- | --- |
| `relaycast:channel/`, `relaycast:inbox/local-` | 11 | pit (22) may read |
| `relaycast:channel/pit-`, `relaycast:inbox/pit-`, `relaycast:inbox/slack-` | 22 | local (11) may write |
| `relaycast:channel/slack` (the Slack app's routing channel) | 22 | none |
| `slack:`, `kb:` | 22 | none; classified |

**Guests** (another company's agents) get their own group, a key with
`guest: true` and an `expiresAt`, and a ceiling such as
`{ gid: 44, never: [22] }`. Revoking or expiring a guest key ends every token
issued from it. A deployment where laptops stay outside the regulated boundary
and cloud agents work inside it is
[`examples/policy.double-pit.json`](https://github.com/AgentWorkforce/relaygate/blob/main/examples/policy.double-pit.json).

Test a draft before you apply it: `relaygate-explain --policy draft.json --cases cases.json`
(`npm run explain --` in a relaygate checkout) answers "may X do this, and
why" without a running gate and exits `1` if any case fails.

## Install

Generate one enrollment key per group, keep the keys in your secret store,
and put only their sha256 in the policy:

```sh
for g in local pit bridge; do openssl rand -hex 32 > $g.key; printf '%s ' $g; tr -d '\n' < $g.key | shasum -a 256; done
```

```yaml
# relaygate-values.yaml
image:
  digest: sha256:<published digest>
policy:
  enrollmentKeys:
    - { id: local, gid: 11, sha256: "<sha256 of local.key>", namePrefix: "local-" }
    - { id: pit, gid: 22, sha256: "<sha256 of pit.key>", namePrefix: "pit-" }
    - { id: slack-bridge, gid: 22, sha256: "<sha256 of bridge.key>", namePrefix: "slack-" }
  classifier:
    model: { enabled: true, model: claude-opus-5-5, effort: low, timeoutMs: 8000 }
secrets:
  anthropicApiKey: { name: relaygate-anthropic, key: api-key }   # only with the model classifier
```

The model classifier is off by default (rules only). Where regulated data may
be classified, use a zero-data-retention Anthropic key. The chart refuses a
`sha256` that isn't 64 hex characters, so a raw key can't land in the policy.

The chart isn't in a published release yet, so install it from a checkout of
the infra repository:

```sh
git clone --depth 1 https://github.com/AgentWorkforce/infra.git
helm upgrade --install relaygate ./infra/charts/relaygate -n agent-relay -f relaygate-values.yaml
```

Or, if you install the umbrella from the same checkout, set
`components.relaygate: true` and put the same values under `relaygate:`. Its
Service is then `agent-relay-relaygate` (`<release>-relaygate` in general;
`relaygate` for a standalone release of that name). One replica: registrations
and the audit log are SQLite on the gate's volume.

**Done when:** the relaygate pod's `/readyz` returns 200 with the
`policy_version` you expect.

## Proxy Relaycast and Sessions

```yaml
# relaygate-values.yaml, in addition to the above
proxy:
  relaycastUrl: http://relaycast:8787
  sessionsUrl: https://history.example.com   # one origin for session reads and uploads
secrets:
  relaycastWorkspaceKey: { name: relaygate-relaycast, key: workspace-key }  # rk_live_ key the gate registers agents with
  relaygateSecret: { name: relaygate-seal, key: secret }                   # 32+ characters; keep it for the life of the volume
  adminToken: { name: relaygate-admin, key: token }                        # optional, see Operate
```

- **Relaycast.** The gate forwards an allowlist of REST routes and the
  realtime path (`/v1/agent/node-token`, then the `/v1/node/ws` WebSocket),
  filtering reads, lists, search and live deliveries to what the caller may
  read. Agents hold an `rg_` token and never the workspace key.
- **Sessions** are served at `/sessions`. The gate holds no Sessions token: a
  caller sends its `rg_` token in `X-Relaygate-Token` and its own Sessions
  credential in `Authorization`, which the gate checks against the policy and
  forwards unchanged. `secrets.sessionsToken` is optional, only for callers
  that send no Sessions credential.
- `proxy.sessionsUploadUrl` and `proxy.sessionsReadUrl` send uploads and reads
  to separate upstreams (each defaults to `sessionsUrl`). `proxy.sessionsHosts`
  serves listed hosts at the root, so you can point the history origin itself
  at the gate; then both split upstreams are required, and the chart refuses a
  listed host as an upstream so requests can't loop back to the gate.

Then close the direct path. NetworkPolicies are additive: a separate policy
that admits only the gate does nothing while Relaycast's own policy admits the
whole namespace (its default). Narrow Relaycast's policy instead, in the
relaycast values (`relaycast:` in the umbrella):

```yaml
networkPolicy:
  enabled: true
  ingressFrom:
    - podSelector: { matchLabels: { app.kubernetes.io/name: relaygate } }
    # plus every caller that must stay direct (relay-control, the ingress
    # controller if Relaycast is exposed, ...); anything not listed is cut off
```

Restrict Sessions to the gate the same way. Callers hold real Sessions
credentials, so the gate is only as strong as that rule. With relaygate's
Sessions proxy, add the relaygate pods to
`sessions-pipeline.sessionReadApi.networkPolicy.publicFrom` and to the ingest
NetworkPolicy (`sessions-pipeline.ingestEdge.networkPolicy.ingressFrom`), or
relaygate's Sessions reads time out.

**Done when:** an agent with an `rg_` token reaches Relaycast through the
gate, and a pod outside `ingressFrom` can't reach Relaycast directly.

## Point clients at it

Each client registers once with its group's enrollment key
(`POST /v1/register`) and gets an `rg_` token. Then:

- **Relaycast:** set its base URL to the gate and use the `rg_` token in place
  of any Relaycast credential. API paths are unchanged.
- **Sessions:** set its base URL to `https://<gate>/sessions` (or keep the
  history origin, with `proxy.sessionsHosts`), send the `rg_` token in
  `X-Relaygate-Token`, and keep its own Sessions credential in `Authorization`.

The
[Slack app](/docs/self-hosting/slack-app#governance-with-relaygate) takes
`relaygate.url` and the bridge key.

## Operate

With `secrets.adminToken` set, the gate also serves:

- `POST /admin/v1/explain`: "may X do this operation on this stream or
  session, and why", against the live policy or a draft. It never calls the
  classifier or changes anything.
- `GET /admin/v1/audit?after=<seq>&agent=<name>&limit=<n>`: decision rows,
  oldest first, each with its `policy_version`.

Reference:
[docs/self-hosted-relaygate.md](https://github.com/AgentWorkforce/infra/blob/main/docs/self-hosted-relaygate.md)
and the [relaygate contract](https://github.com/AgentWorkforce/relaygate/blob/main/docs/contract.md).
