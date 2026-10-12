# arelay.to handoff — 2026-10-11 ~02:00Z

Session: `claude-agentrelay-com-efef42`. Lane: arelay.to registration, paid handles, prpm proof point.

## The product decision that overrides earlier plans

**Khaliq, 2026-10-11:** *"we're not going to offer to host or build their agent, YET. We just want to expose the ability for customers to bring their own agent to start with."*

So: **bring-your-own-agent only.** Do not build or reland Cloud-hosted answering as a customer-facing option. See "Known conflict" below — there is live UI that contradicts this.

## What is live in production right now

| Capability | State | Evidence |
|---|---|---|
| Register a handle with only an Agent Relay workspace (no DNS) | **live** | relay-agent#47, merged `7fab392`, deployed 23:54Z |
| Honest "answer agent not connected yet" state | **live** | `GET https://arelay.to/api/v1/agents/agent-relay` returns `answerAgentConnected` |
| Paid extra handles (Stripe add-on checkout) | **live** | cloud#4614, prod `buildSha c0ba8053` then `bc411065` |
| Browser registration UI (`/cloud/dashboard/connections`) | **live** | cloud#4574 merged, contained in prod sha |
| Fully agent-led registration via public API | **live, pre-existing** | `arelay.to/register`, 1119 lines; `RegistrationInputSchema` accepts `accountCredential` instead of `domain` |
| Cloud-hosted answer agent (deploys an agent for the customer) | **reverted** | cloud#4618 reverted by #4647 (bundle gate); do not reland per decision above |

Free allowance is **2 handles per account**; extra handles are a Stripe add-on.

## Known conflict — highest priority fix

cloud#4574 shipped with the **Cloud-hosted answerer as the pre-selected default** in the create form:

```js
// incoming-addresses.tsx:288
const [deliveryAddress, setDeliveryAddress] = useState(CLOUD_HOSTED_TARGET);
```

Choosing it reserves an answerer address, registers the handle, and the handle goes **active immediately** (relay-agent#47 skips the echo for `cloud-hosted`) — but **nothing can ever connect it**, because the deploy code was reverted. Visitors are told "not connected yet" (so it is not silent), but there is no route out of that state.

**Agreed fix, not yet written:** default to bring-your-own; replace the hosted option with a contact prompt — Khaliq's words: *"want us to build your agent, contact us and list our email address"* — using `hello@agentrelay.com` (the canonical `SITE_EMAIL` in `web/lib/site.ts`, also the published security.txt contact). Also **reject `CLOUD_HOSTED_TARGET` server-side**, since the UI is not the only way in. A branch was started at `fix/byo-agent-only-default` off `origin/trunk` (worktree `scratchpad/wt-byo`) with no commits.

## Blocked on Khaliq (nothing technical in the way)

1. **Stripe price is wrong.** Test-mode `lookup_key agent_relay_arelay_handle_monthly` is **$10.00** (`unit_amount: 1000`); he specified **$29.99**. Shape is correct (`month`, `licensed`, `per_unit`). The **live** price is unverified — 1Password item `mthshvupnol6od3lhix5bbbmrq` holds only test keys plus `STRIPE_PROD_WEBHOOK_SECRET`. Stripe amounts are immutable: fixing means a new price plus moving the lookup_key.
2. **Test-card purchase** needs a browser session and his organization id. Everything either side is proven: add-on route returns 401 (deployed, auth-gated), and billing is genuinely configured — the webhook returns `{"error":"Invalid signature"}` rather than `"not configured"`, a branch only reachable with real credentials loaded. Webhook endpoint in Stripe test mode is correctly `https://agentrelay.com/cloud/api/v1/webhooks/stripe`, enabled, on `customer.subscription.created/updated/deleted`.
3. **PRPM Cloud account** for the proof point (steps below).

## prpm proof point — exact steps

`prpm` is **free** (profile 404). The directory currently holds exactly one agent (`agent-relay`), so prpm would be the first external registration.

**Human-only (Khaliq):**
1. Sign into Cloud as PRPM: `https://agentrelay.com/cloud?invite_token=relay-2026`. Google sign-in; agents must not impersonate it.
2. Create a workspace named exactly what should appear on the badge — "PRPM".
3. Make it the **active** workspace. The badge is `currentWorkspace.name` resolved by `verifyCloudAccountCredential` at registration.
4. Connect it to Relay, else `422 relay_workspace_not_connected`.
5. Confirm the permission disclosure when the agent asks.

**Agent-led (prpm's agent, guided by `arelay.to/register`):**
6. An answering agent live **in the PRPM relay workspace** — the delivery target. `prpm-answer` is currently in `rw_7ccfea89` ("Default"/"Agent Workforce Workspace"), i.e. ours, not PRPM's.
7. Device flow → Cloud access token in mode-0600 files.
8. `agent-relay agent register arelay-delivery --strict` → courier credential.
9. `POST https://arelay.to/api/v1/registrations` with `handle`, `displayName`, `description`, `accountCredential`, `delivery:{type:"relay",address:<answer agent>,credential:<courier>}`; **omit `domain`**.
10. `POST /api/v1/registrations/<id>/verify` → 202; challenge DM goes to the answer agent.
11. The answer agent replies **in that exact thread** with the challenge line.
12. `POST .../verify` again → 200 plus a **one-time** management token. Capture it; there is no second copy.

**The badge is a snapshot.** `account_workspace_name` is written onto the agent row at insert and the public profile reads that stored value (`registry.ts:927/946`, read at `:2164`). Renaming the workspace afterwards does not change it — only delete-and-re-register does.

`arelay-prpm2@dogpatch-mini` is holding, briefed, and will not touch dogpatch-mini's login (21 agents depend on it).

## Owed to the cloud train lead (`codex-cloud-b6eefa@finn-mac-mini-234831096068513792`)

I accepted ownership of the **#4618 reland** and then the product decision made it moot. **Tell them it is cancelled** so they stop holding scope for it. Full agreed spec, if it is ever revived: pure dependency-injected module importing nothing from `proactive-runtime`; composed by the already-baselined deploy route; capabilities re-exported through `deploy-manager` (gate-exempt, already imports `deploy-store`); explicit rejection of caller-supplied `RELAY_API_KEY`, `RELAY_AGENT_EVENTS_URL`, `NODE_ENV` at the `extraEnvVars` boundary before any side effect, rejecting rather than mutating and never echoing values; base-key-last as a second guard; mutation tests at **each** layer (bypass validation for the boundary test, unsanitized input for the ordering test) — and per their correction, do **not** weaken the structural protection just to make a mutation red; measured deploy-equivalent raw/gzip before and after.

Six guard groups that must return with any reland: org-membership check first in deploy/teardown (unknown == forbidden); `sourceKind` marker gated on data, never caller identity; one point of no return with teardown-after-takeover and errors naming what is **down**; advisory lock across the whole run; per-launch unique Daytona names (names are unique per **org**); `globalThis.fetch` inline with missing-address failing **before** launch.

## Open issues, none blocking

- **relay-agent#48** — managed address-change PATCH still demands an echo, so an existing handle cannot be repointed at a hosted answerer. Moot while BYO-only.
- **relay-agent#49** — registry trusts Cloud's `answerAgentHosting`; should verify the `cloud-arelay-answerer` marker. Unblocked: the name is a shared constant, so Cloud can pass it and the existing by-name lookup works. Moot while BYO-only.
- **relay-agent#50** — a running hosted answerer reports `answerAgentConnected: false` until first contact. Moot while BYO-only.
- **cloud#4632** — intent-first deployment records; also fix `destroySandbox` treating a transient `get()` error as "gone", since a reaper built on intent records will trust that answer.
- **`Build E2B Template` failed** on the 23:45Z main commit. Separate workflow, blocked nothing, unexamined.
- Rotate `connections-inbound`'s exposed `RELAY_AGENT_TOKEN`/`RELAY_API_KEY` (were visible in `ps` argv).

## Traps that cost real time tonight

1. **A green cloud PR can still break the trunk→main train.** The bundle-boundary gate (`scripts/check-proactive-runtime-boundary.mjs`) runs **only** in the promotion's deploy-equivalent job, never on PR checks. It bit twice: #4620, then #4618. The first stall ran 20:32→23:31 with trunk 275 commits ahead of main, blocking every unrelated deploy. Fast diagnostic: `git rev-list --count origin/main..origin/trunk`. Allowlist a thin adapter if you must; never a `deploy-manager`-class module — the worker is ~8.3MB gzip against a 10MB ceiling. Baseline exemptions are per **exact edge** (`file|module`), so a new import into an already-baselined route still fails.
2. **Bots post findings after a lane reports clean.** On #4574 that happened across six heads, including a High-severity credential-rotation race and a destructive-delete race. Always re-check unresolved threads **in the same command as the label**, and wait for Cursor Bugbot to finish on the exact head.
3. **Do not delete worktrees without characterising them.** Several under `~/Downloads` are `git worktree lock`-ed. Check locks, read what is uncommitted rather than counting lines, confirm branches are pushed.

## Relay addresses

- `fix-4574@sf-frame` — browser registration lane, work complete.
- `arelay-answerer@sf-frame` — hosted answerer lane; its work is reverted and now out of scope.
- `arelay-prpm2@dogpatch-mini` — prpm proof point, holding for Khaliq's steps 1-5.
- `codex-cloud-b6eefa@finn-mac-mini-234831096068513792` — cloud train/deploy/labels lead.
- `khaliq-gant` — Khaliq (short name only; the machine suffix changes).
