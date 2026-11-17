---
title: Durable actors
description: The optional durable-actors mode for Relaycast and Relayfile - what it is, its status, requirements and known issues.
---

**Optional, off by default, and not part of the standard install.** Install the
standard setup first, from [Install on EKS](/docs/self-hosting/install-eks) or
[Install on GKE](/docs/self-hosting/install-gke). Add durable actors only when
you need them, and [talk to us](/docs/self-hosting/support) first: its images
are outside the release image set, and it hasn't been qualified on the 2026.11
profiles.

## What it is

In durable-actors mode, Relaycast (and optionally Relayfile) run their stateful
core as one durable actor per workspace, behind a stateless gateway, instead of
one PostgreSQL- or SQLite-backed process. The chart can run the actor control
plane itself (`components.durableActors`). Relaycast switches with
`relaycast.runtime.backend: durable-actors`; Relayfile with
`components.relayfile` and `relayfile.runtime.backend: durable-actors`.

## On AWS EKS

- **Profile:** `charts/agent-relay/values-eks-actors.yaml` in the infra
  repository, a standalone profile with Relaycast and Relayfile in actor mode
  and everything else off. Layer it over the EKS profile and turn the other
  components back on after it.
- **Storage:** S3 for actor state and deploy artifacts.
- **Credentials:** per-actor STS by default. The control plane assumes an actor
  role with a session policy narrowed to one actor, so one actor can't read
  another's state. The control plane's role needs `sts:AssumeRole` and
  `sts:TagSession` on that role.
- **Nodes:** actor hosts run hardened (non-root, read-only root filesystem,
  seccomp, no ServiceAccount token, metadata service blocked) on a dedicated
  node group labelled `durable-actors/role=actor-host` and tainted
  `durable-actors/actor-host=true:NoSchedule`. For untrusted actor code, add a
  gVisor RuntimeClass.
- **Identity:** EKS Pod Identity; the role list is in the profile's header.
- **Database:** a managed PostgreSQL with TLS for the control plane.
- **Example tooling:** `scripts/selfhost/eks-actors-install.sh` shows every
  step. Its in-namespace PostgreSQL and generated Secrets are examples only.

## On Google Cloud GKE

GKE Standard with Workload Identity, NetworkPolicy enforcement and a **GKE
Sandbox (gVisor)** node pool; one Standard Cloud Storage bucket for actor state
(no lifecycle deletion) plus buckets for Relaycast files and Relayfile blobs; a
PostgreSQL database for the control plane; and DNS for `actors.<domain>` (and
`files.<domain>` for Relayfile). Adding hosts replaces the managed certificate,
so every host's TLS resets for 10 to 15 minutes: see
[Troubleshooting](/docs/self-hosting/troubleshooting#tls-resets-on-every-host-after-adding-a-host).

## Settings that matter

- `durable-actors.actors.hostIdleTimeoutMs`: set it well above Relaycast's
  15-second maintenance alarm, for example `120000`. The upstream default of 10
  seconds lets the actor sleep between alarms, and every wake closes all
  sockets with code 4012 "actor restarted".
- Raw `/v1/ws` observers must reconnect on close code 4012; SDK agents
  reconnect by themselves.
- More than one gateway replica needs an S3 or Cloud Storage file store.

## Limits

- Fresh installs only: existing workspaces are not migrated.
- Changing the storage mode or bucket later needs a data migration.
- Keyed (Idempotency-Key) workspace creates answer 503
  `workspace_create_idempotency_unavailable`. Nothing in the standard flow uses
  them.

## Check it (if enabled)

A new workspace is created in a few seconds; agents register and message
across gateway replicas; an idle WebSocket stays up for 5 minutes; and a forced
reconnect followed by an action still works.

<!-- agent
Do not enable durable actors on your own initiative. If the human asks for it,
STOP and recommend they contact Agent Relay support first.
-->
