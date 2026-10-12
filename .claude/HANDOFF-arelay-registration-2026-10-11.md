# arelay.to registration — handoff, 2026-10-11 10:30 PDT

## The goal
Khaliq is onboarding customers onto arelay.to handles. Registration is broken in
production for essentially every workspace. One PR stands between here and fixed.

## The single blocker
**cloud#4727** needs a replacement head, then: label `mergeable` → merge →
**cloud#4725** (promotion, currently DRAFT) un-drafts → promotes → `main` → deploy.

**cloud-pr-triage owns #4727.** They have explicitly asked for no second
implementation. Do not open a competing PR on the compensation path.

## THE ONLY CHECK THAT MEANS "DONE"
```bash
cd ~/Projects/AgentWorkforce/cloud && git fetch -q origin main
git show origin/main:packages/web/lib/workflows/require-bound-relay-workspace.ts | grep -c relaycastWorkspaceId
# 0 = still broken. 2 = fixed and on main.
```
Do NOT infer readiness from a merge, a promotion, or a green PR. Check `main`.

## Root cause (fixed, on trunk, not yet main)
relay-agent compared Relaycast's minted workspace id against Cloud's `rw_` handle —
two different namespaces. 11 of 13 bound workspaces 422'd; every NEW workspace gets a
Relaycast-minted id. `arelay_delivery_identities` had exactly one row ever: `prpm`, failed.

## Done and verified
- **relay-agent#54** merged + deployed (run 38124981379, workflow Deploy, `npx wrangler deploy`).
- **cloud#4718** merged → on trunk.
- **agentrelay.com#205** merged `5717eba6f`, deployed run 38159042377, **verified live**:
  `/directory` shows "Agent directory" + "registered by its owner"; no "Verified agents".
- `arelay-answerer@sf-frame` squatting the reserved name — removed, name free.

## Open, not blocking
- **cloud#4704** — reserved answerer name collides with a customer's own agent
  (permanent dead end, "try again" can never work). Green, needs its own intake.
- **relay-agent#55** — host-scoped verification; unblocks `*.workers.dev` etc.
- **agentrelay.com#204** — A2A adapter template, needs 2 reviews.
- **relay-agent#56** — muse/openclaw/hermes integration research.
- Devin 🔴 on #4718: historical null-provider-id workspaces still fail. Deferred
  deliberately — every workspace created since Aug has an id, so new signups are fine.

## The race that is blocking (#4727)
`ProviderWorkspaceUnresolved` cleanup released the delivery identity AFTER the claim
lock dropped. `releaseDeliveryIdentity` matches on source + cloud_workspace_id +
owner_hash — all IDENTICAL for the same person registering the same handle twice — so
A's cleanup could revoke B's live identity.

Moving it under the lock + fencing by `identityId` is NOT sufficient: root reproduced a
pending/unknown remote release landing AFTER B recovers the same id and registers.
Likely needs the release CONFIRMED before the lock drops, or recovery refusing an id
with an in-flight release.

## Landmines — mistakes made today, do not repeat
1. **`git checkout` on uncommitted work** wiped an implementation twice during mutation
   testing. ALWAYS commit before mutating.
2. **Stale checkout**: this repo was ~30 commits behind; greps found nothing and I
   wrongly reported the public site was already label-free. Use `git show origin/main:<path>`.
3. **Cited the wrong run id** as deploy evidence (CI run, not Deploy run).
4. **Tests that pass with the defect present.** Two written for the #4727 race both
   false-green. Branch `handoff/arelay-compensation-evidence` preserves them as
   NON-PROOF examples. Mutation-check every claim.
5. A vacuous assertion (`deps(owner).saga` reads a FRESH saga) passed unconditionally.

## Product decisions in force
- **BYO agent only** — Cloud does not host or build answer agents.
- **No verification labels at the start**; any org registers any name, zero friction.
  Domain badge KEPT (DNS-proven, not caller-chosen); the ✓ renders only for `proven`.

## Coordination
- `codex-cloud-b6eefa` — release/train lane, routes work.
- `codex-cloud-review-successor-1011b` — independent exact-head reviewer.
- `cloud-pr-triage` — owns #4727.
- Train: feature PRs → `trunk`; only `trunk` → `main`. Label `mergeable` for intake.
  Unresolved+unanswered review threads hold a promotion.
