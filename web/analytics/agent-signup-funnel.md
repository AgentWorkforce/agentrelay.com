# Agent signup funnels (Teams and Flows)

This funnel measures the agent-led journey reached through “Let your agent do it.”
It is separate from the existing manual Flows onboarding funnel (version 2).

## Common event properties

All events use `funnel=agent_signup`, `funnel_version=1`, `onboarding_method=agent`,
`product=teams|flows`, `journey_id`, `step`, and `source=browser|server`.
The journey ID is a random analytics identifier, **not** the progress session ID
(the latter grants read access). The browser's existing PostHog distinct ID is
passed to Cloud once at session creation so both sides refer to the same visitor.
Use the same PostHog project for the marketing and Cloud clients.

Server events additionally include `step_name`, `state`, `revision`, `elapsed_ms`
(since session creation), `agent_type`, and `agent_attribution`.

`agent_type` is self-reported by the agent's first progress PATCH and retained:
`codex`, `claude_code`, `grok`, `opencode`, `cursor`, `gemini_cli`, `other`, or
`unknown`. This describes the tool performing signup, not the models selected
for the eventual Flows workflow. Rotating logos are decorative and never count
as a user selection. Do not infer a known agent for visitors who never start it.

## Event catalog

| Event | Source | When |
| --- | --- | --- |
| `agent_signup_entry_clicked` | Browser | Landing-page secondary CTA |
| `agent_signup_page_viewed` | Browser | Owner opens the signup page (including direct entry) |
| `agent_signup_session_created` | Server | A new progress session is persisted |
| `agent_signup_prompt_copied` | Browser | Clipboard write succeeds |
| `agent_signup_manual_copy_shown` | Browser | Clipboard unavailable; full prompt revealed for manual copy |
| `agent_signup_step_started` | Server | Agent advances into a numbered step |
| `agent_signup_step_completed` | Server | Agent advances past a step, or completes verification |
| `agent_signup_waiting` | Server | Agent reports waiting for approval or a choice |
| `agent_signup_failed` | Server | Agent reports a blocked/failed step |
| `agent_signup_resumed` | Server | Waiting/failed step resumes working |
| `agent_signup_completed` | Server | Agent reports verified step 5 complete |
| `agent_signup_details_opened` | Browser | Owner expands setup details |
| `agent_signup_session_error` | Browser | Starting/restoring session fails (no error text sent) |
| `agent_signup_expired` | Browser | Owner's open page observes expiry |
| `agent_signup_restarted` | Browser | Owner explicitly starts a new session |
| `agent_signup_page_left` | Browser | Owner's pagehide or SPA exit, with last observed step |
| `agent_signup_dashboard_opened` | Browser | Completion CTA clicked |

| Step | Teams `step_name` | Flows `step_name` |
| --- | --- | --- |
| 1 | `sign_in` | `sign_in` |
| 2 | `install_app` | `choose_flow` |
| 3 | `connect_workspace` | `connect_tools` |
| 4 | `choose_sharing` | `activate_flow` |
| 5 | `verify` | `verify` |

## Build the two funnels

Create a sequential funnel filtered to `funnel=agent_signup`, `funnel_version=1`,
and `product=teams`; duplicate it with `product=flows`. Use a two-hour conversion
window (session TTL), holding `journey_id` constant so separate attempts do not
complete one another. The standard funnel counts people; for attempt counts,
use a SQL insight grouped by `journey_id`, since a person can make multiple attempts.

1. `agent_signup_page_viewed`
2. `agent_signup_session_created`
3. `agent_signup_step_started`, filter `step=1`
4. `agent_signup_step_completed`, filter `step=1`
5. `agent_signup_step_completed`, filter `step=2`
6. `agent_signup_step_completed`, filter `step=3`
7. `agent_signup_step_completed`, filter `step=4`
8. `agent_signup_completed`

Do not require clipboard success or the landing CTA in this main funnel: users
can copy manually or arrive directly. Make separate entry→page and
page→prompt-copied/manual-copy-shown→agent-started funnels to diagnose handoff.

For an agent comparison, start at `agent_signup_step_started` with `step=1`,
then add the completion steps. Break down by event property `agent_type`, using
first-touch attribution on this agent-started funnel. This keeps non-starters
in the overall funnel rather than silently excluding them for lacking an agent.
To split the full funnel by agent, use last-touch attribution: pre-agent dropoffs
remain `unknown`. See [PostHog funnel breakdown attribution](https://posthog.com/docs/product-analytics/funnels#attribution-types).

For friction, trend `agent_signup_waiting` and `agent_signup_failed` by `product`,
`step_name`, and `agent_type`; compare elapsed time at each completed step. Inspect
the last server milestone per `journey_id` to see how far an attempt got. A
`page_left` event is diagnostic, **not abandonment**: the agent can finish while
the page is closed. Incomplete journeys after the two-hour window are dropoffs;
there is no fabricated server "abandoned" event or fake completion.

## Reliability, privacy, and rollout checks

- Browser events and the server handoff are disabled when PostHog is absent,
  uninitialized, or opted out at session creation. Server events continue for
  that opted-in journey independently of the browser. Later browser opt-out
  stops browser events; the existing server journey retains its original
  capture context until its two-hour expiry. Do not claim per-request consent
  revocation is implemented by this flow.
- Server events follow committed writes. GET polling, watcher tabs, duplicate
  PATCHes and rejected updates never emit milestones. Stable event UUIDs prevent
  duplicate transport delivery. Tracking is best effort, bounded to 1.5 seconds
  on Node and kept alive with Worker `waitUntil`; there is no durable retry outbox.
- Events never include tokens, raw progress IDs, prompts, device codes, local
  paths, user text, or approval URLs. SDK-enriched URLs redact the session query
  and progress route IDs. Replay network capture drops the entire progress API
  request/response, including serialized bodies and headers. The signup page is blocked from replay/autocapture;
  intentional funnel events remain enabled.
- Marketing uses its existing public project key at build time; Cloud uses its
  existing shared server client and runtime ingest key. No new project or secret
  is created. Ensure keys target the same project, and Cloud's stage is allowed
  to emit analytics. The marketing GitHub build variable was compared with Cloud’s canonical production
  ingest key and matches. No live PostHog project/dashboard was modified by this PR.
- Before production signoff, perform one consented Teams signup and one Flows
  signup, then find each `journey_id` in PostHog Live Events. Verify the visitor
  joins browser and server events, the first PATCH has the actual agent type,
  all five completion steps appear once, and no capabilities appear in event
  JSON/replay. Repeat with analytics disabled: signup must still work.

Local coverage: migrated database/real-handler tests exercise both products,
concurrent retries, attribution, failures, and completion without browser polling;
browser-tracker tests cover opt-out, reload, storage failures, product separation,
restart, and sanitization. These prove instrumentation behavior, not production
PostHog ingestion or real Google/provider/desktop onboarding.
