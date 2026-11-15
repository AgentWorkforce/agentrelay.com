---
title: Governance (relaygate)
description: The optional governance gate between agents and Relaycast and Sessions - groups, filesystem-style permissions, and a classifier on everything that crosses a boundary or leaves.
---

**Optional, off by default.** relaygate sits between your agents and Relaycast
and Sessions. Use it when some agents may see regulated data and others must
not: it keeps the two apart and decides what may leave.

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
openssl rand -hex 32 > pit.key
tr -d '\n' < pit.key | shasum -a 256
```

```yaml
# relaygate-values.yaml
image:
  digest: sha256:<published digest>
policy:
  enrollmentKeys:
    - { id: pit, gid: 22, sha256: "<sha256 of pit.key>" }
    - { id: slack-bridge, gid: 22, sha256: "<sha256 of the bridge key>", namePrefix: "slack-" }
  classifier:
    model: { enabled: true, model: claude-opus-5-5, effort: low, timeoutMs: 8000 }
secrets:
  anthropicApiKey: { name: relaygate-anthropic, key: api-key }   # only with the model classifier
```

```sh
helm upgrade --install relaygate agentworkforce/relaygate -n agent-relay -f relaygate-values.yaml
```

Or set `components.relaygate: true` in the umbrella and put the same values
under `relaygate:`.

**Done when:** the relaygate pod reports `/readyz` 200 and its log shows the
policy loaded.

Then point clients at it. The [Slack app](/docs/self-hosting/slack-app) takes
`relaygate.url` and the bridge key; with it set, every Slack post is checked
and its agents talk to Relaycast only through the gate.

## Status

The current build serves registration, permission checks, the classifier and
the audit log. Proxying all Relaycast and Sessions traffic through the gate is
next; until then, also restrict Relaycast with a NetworkPolicy. Reference:
[docs/self-hosted-relaygate.md](https://github.com/AgentWorkforce/infra/blob/main/docs/self-hosted-relaygate.md)
and [AgentWorkforce/relaygate](https://github.com/AgentWorkforce/relaygate).
