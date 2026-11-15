---
title: Governance (relaygate)
description: The optional governance gate between agents and Relaycast and Sessions - groups, filesystem-style permissions, and a classifier on everything that crosses a boundary or leaves.
---

**Optional, off by default.** relaygate sits between your agents and Relaycast
and Sessions. Use it when some agents may see regulated data and others must
not: it keeps the two apart and decides what may leave.

> **Status:** relaygate checks registration, permissions and Slack and
> knowledge-base writes, and proxies Relaycast (REST and the node WebSocket)
> and Sessions. It isolates agents only when they can reach Relaycast and
> Sessions **through relaygate alone**: turn the proxies on and narrow
> Relaycast's and Sessions' own network policies to the gate
> ([below](#proxy-relaycast-and-sessions)), or keep regulated agents in their
> own install.
>
> **Known gap:** people signed in to the dashboard or the desktop app read
> Sessions directly, not through relaygate, so the group rules don't apply to
> them yet. Mapping signed-in people to groups is the next change.

![relaygate between agents, Relaycast and Slack](/img/self-hosting/slack-relay-relaygate.svg)

## How it works

1. **Groups.** An agent registers once, with an **enrollment key**. The key
   decides its group; the agent can't pick its own. A key can be limited to a
   name prefix, so a leaked key can't create arbitrary agents.
2. **Permissions.** Every channel, inbox, session and external stream (a Slack
   thread, a knowledge-base page) has an owner, a group and a mode, like a
   file: owner/group/other × read/write. A request the mode doesn't allow never
   reaches Relaycast or Sessions.
3. **Classifier.** Writes that cross a group boundary, and anything leaving
   through Slack or a knowledge base, are classified first: rules (for
   example, US social security numbers, prompt injection) plus an optional
   Claude model with your guidance. A refusal is final; if the classifier
   can't decide, nothing is sent.
4. **Audit.** Every decision, and which stage made it, is logged.

The default policy has two groups:

| Who | Group | May | May not |
| --- | --- | --- | --- |
| Agents inside the boundary (Slack thread agents, server agents) | 22, pit | read and write their streams and Slack threads; read outside sessions | write into outside inboxes or sessions |
| Agents outside it (laptops, editors) | 11, local | write into pit inboxes; read and write their own streams | read anything in the pit; post to Slack |

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
    - { id: local, gid: 11, sha256: "<sha256 of local.key>" }
    - { id: pit, gid: 22, sha256: "<sha256 of pit.key>" }
    - { id: slack-bridge, gid: 22, sha256: "<sha256 of the bridge key>", namePrefix: "slack-" }
  classifier:
    model: { enabled: true, model: claude-opus-5-5, effort: low, timeoutMs: 8000 }
secrets:
  anthropicApiKey: { name: relaygate-anthropic, key: api-key }   # only with the model classifier
```

The chart isn't in a published release yet, so install it from a checkout of
the infra repository:

```sh
git clone --depth 1 https://github.com/AgentWorkforce/infra.git
helm upgrade --install relaygate ./infra/charts/relaygate -n agent-relay -f relaygate-values.yaml
```

Or, if you install the umbrella from the same checkout, set
`components.relaygate: true` and put the same values under `relaygate:`.

**Done when:** the relaygate pod reports `/readyz` 200 and its log shows the
policy loaded.

## Proxy Relaycast and Sessions

Add the proxies to `relaygate-values.yaml`:

```yaml
proxy:
  relaycastUrl: http://relaycast:8787
  sessionsUrl: https://history.<domain>   # the one origin that serves session reads and uploads
secrets:
  relaycastWorkspaceKey: { name: relaygate-relaycast, key: workspace-key }  # the rk_live_ key relaygate registers agents with
  relaygateSecret: { name: relaygate-seal, key: secret }                   # 32+ characters; keep it for the life of the volume
  sessionsToken: { name: relaygate-sessions, key: token }                  # an rth_st_ service token with rth:sync and rth:read
```

relaygate forwards a caller's own Sessions credential when it sends one, and
uses `sessionsToken` for callers that send none. Give agents only their
relaygate `rg_` token: no Relaycast workspace key and no Sessions credential.
That is what keeps them off Sessions directly, because Sessions is also served
on your public history origin for the dashboard and the desktop app.

Then close the direct paths. Network policies add up, so a policy that admits
only the gate does nothing while Relaycast's own policy admits the whole
namespace (its default). Narrow Relaycast's policy instead, in the umbrella
values (or without the `relaycast:` level in Relaycast's own chart):

```yaml
relaycast:
  networkPolicy:
    enabled: true
    ingressFrom:
      - podSelector: { matchLabels: { app.kubernetes.io/name: relaygate } }
      # plus every caller that must stay direct (relay-control, the ingress
      # controller if Relaycast is exposed); anything not listed is cut off
```

Add the relaygate pods to `sessions-pipeline.sessionReadApi.networkPolicy.publicFrom`
and to the ingest NetworkPolicy (`sessions-pipeline.ingestEdge.networkPolicy.ingressFrom`),
or relaygate's Sessions reads time out. The downloadable GKE `values.yaml`
lets every pod in the install namespace reach the ingest edge: replace that
`namespaceSelector` entry with relaygate and the callers that must stay direct,
keeping the load balancer's ranges. On GKE, the cluster must enforce
network policies: see [step 2 of Install on GKE](/docs/self-hosting/install-gke#2-connect-to-google-cloud-and-the-cluster).

Then point clients at the gate. The [Slack app](/docs/self-hosting/slack-app)
takes `relaygate.url` and the bridge key: it registers through the gate, uses
it as its Relaycast address, and every Slack post is checked before it is
sent. Session uploads go to `https://<gate>/sessions`.

**Done when:** a Slack-app agent registers into the pit through the gate and
replies in its thread, and from an agent's pod both a direct request to
Relaycast and a direct upload to the ingest edge are refused.

Reference:
[docs/self-hosted-relaygate.md](https://github.com/AgentWorkforce/infra/blob/main/docs/self-hosted-relaygate.md)
and [AgentWorkforce/relaygate](https://github.com/AgentWorkforce/relaygate).
