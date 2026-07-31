# Agent Relay 11.3.0 workspace-key output exposure

Status: mitigation prepared; not published

Source snapshot: `origin/main` at `d02e9cd` on 2026-07-30. Line numbers
below are the pre-mitigation positions in that snapshot.

## Summary

Agent Relay 11.3.0 prints the active workspace key when
`agent-relay node up` or `agent-relay node status` runs. Relay commit
`3c5046a6` masks the key and removes the credential-bearing observer URL,
but that fix was not in npm `latest` when this exposure was recorded.

The documented commands are legitimate product operations. The defect is
the released CLI's output, so deleting the commands from user
documentation would conceal normal product use rather than fix the root
cause. The primary fix is a human-cut Agent Relay release containing
`3c5046a6`.

The hosted skill is sharper than the human docs: it can direct an agent to
run the affected commands inside a transcribed session, placing a live key
in context that may leave the machine. The prepared mitigation therefore:

1. adds a version-aware warning to every affected user-facing docs page;
2. gates the hosted skill so Agent Relay 11.3.0 startup/status is
   human-only from a trusted, non-transcribed terminal; and
3. retains the correct commands for a patched release.

No affected command was executed while producing this report.

## Enumeration

Total: **31 instruction lines across 8 tracked files**.

- Hosted agent-facing skill: **3**
- User-facing documentation: **28**
- Internal-only instructions: **0**

### Hosted agent-facing skill

File: `web/content/agent-relay/SKILL.md`

Classification: hosted skill consumed by agents and human drivers

Count: 3

1. Pre-mitigation line 32:

   ```text
   - start the broker with `agent-relay node up`
   ```

2. Pre-mitigation line 74:

   ```text
      agent-relay node up --background --verbose
   ```

3. Pre-mitigation line 75:

   ```text
      agent-relay node status --wait-for 10
   ```

### User-facing documentation: agent management

File: `web/content/docs/cli-agent-management.mdx`

Classification: user-facing CLI documentation

Count: 1

1. Pre-mitigation line 45:

   ```text
   agent-relay node up --background
   ```

### User-facing documentation: broker lifecycle

File: `web/content/docs/cli-broker-lifecycle.mdx`

Classification: user-facing CLI documentation

Count: 8

1. Pre-mitigation line 13:

   ```text
   agent-relay node up
   ```

2. Pre-mitigation line 16:

   ```text
   `node up` starts the broker in the foreground, serves this machine as a fleet [node](/docs/nodes), and — when a `teams.json` with `autoSpawn` exists — spawns the configured agents into `#general`.
   ```

3. Pre-mitigation line 39:

   ```text
   agent-relay node up --background --workspace-key "$RELAY_WORKSPACE_KEY"
   ```

4. Pre-mitigation line 42:

   ```text
   The broker listens on a local API port starting from `3888` (override with `AGENT_RELAY_BROKER_PORT`). If this machine was enrolled as a Cloud-managed node with `agent-relay cloud enroll`, `node up` picks up the persisted enrollment automatically and serves under the enrolled node name.
   ```

5. Pre-mitigation line 47:

   ```text
   agent-relay node status
   ```

6. Pre-mitigation line 48:

   ```text
   agent-relay node status --wait-for 10
   ```

7. Pre-mitigation line 52:

   ```text
   `node status` only checks the local broker daemon; `--wait-for <seconds>` polls until the broker is ready or the timeout expires. The top-level `status` command reports workspace, local broker state, and cloud login state.
   ```

8. Pre-mitigation line 80:

   ```text
   agent-relay node up --state-dir .agentworkforce/relay-staging
   ```

### User-facing documentation: CLI overview

File: `web/content/docs/cli-overview.mdx`

Classification: user-facing CLI documentation

Count: 4

1. Pre-mitigation line 106:

   ```text
   agent-relay node up --background
   ```

2. Pre-mitigation line 107:

   ```text
   agent-relay node status
   ```

3. Pre-mitigation line 122:

   ```text
   `node up` starts the local broker, registers this machine as a fleet [node](/docs/nodes), and can auto-spawn agents from `teams.json`. `node workflow run` executes Relayflows workflows (`.yaml`, `.yml`, `.ts`, `.tsx`, `.js`, `.py`, or `.sh`) in the current checkout and keeps metadata under `.agentworkforce/relay/local-runs`.
   ```

4. Pre-mitigation line 135:

   ```text
   `agent-relay status` reports the current workspace, local broker state, and cloud login state. `agent-relay node status` is narrower: it only checks the local broker daemon.
   ```

### User-facing documentation: Factory runtime

File: `web/content/docs/factory/where-it-runs.mdx`

Classification: user-facing Factory documentation

Count: 2

1. Pre-mitigation line 35:

   ```text
   agent-relay node up
   ```

2. Pre-mitigation line 38:

   ```text
   `agent-relay node up` auto-discovers an `agent-relay.ts` in the working directory, which just re-exports the node definition:
   ```

### User-facing documentation: nodes and providers

File: `web/content/docs/nodes-and-providers.mdx`

Classification: user-facing architecture and operator documentation

Count: 3

1. Pre-mitigation line 140:

   ```text
   agent-relay node up
   ```

2. Pre-mitigation line 143:

   ```text
   `node up` brings the current context's node online: it starts the node's agent runtime and serves
   ```

3. Pre-mitigation line 145:

   ```text
   with the enrolled node token. Long-running apps skip `node up` and serve their own node directly
   ```

### User-facing documentation: nodes

File: `web/content/docs/nodes.mdx`

Classification: user-facing node documentation

Count: 6

1. Pre-mitigation line 78:

   ```text
   agent-relay node up --config ./builder.node.ts   # serve this definition on the machine's node
   ```

2. Pre-mitigation line 83:

   ```text
   `node up` auto-discovers an `agent-relay.{ts,js,...}` definition in the project when `--config` is omitted, and serves this context's node and its providers. To run a Cloud-managed node, redeem the one-time enrollment token first with `agent-relay cloud enroll --token <token>`, then run `agent-relay node up` — it picks up the persisted enrollment and serves under the enrolled node name.
   ```

3. Pre-mitigation line 89:

   ```text
   By default a served node logs quietly — only warnings reach the console. Pass a log flag to `node up` to see its activity: every capability it registers and every action that hits it (invoked → completed or failed, with a duration).
   ```

4. Pre-mitigation line 92:

   ```text
   agent-relay node up --config ./builder.node.ts --log-file ./node.log                    # actions → a file
   ```

5. Pre-mitigation line 93:

   ```text
   agent-relay node up --config ./builder.node.ts --log-file ./node.log --log-level debug   # + capability registration
   ```

6. Pre-mitigation line 94:

   ```text
   agent-relay node up --config ./builder.node.ts --log-json                               # one JSON object per line
   ```

### User-facing documentation: CLI reference

File: `web/content/docs/reference-cli.mdx`

Classification: user-facing CLI reference

Count: 4

1. Pre-mitigation line 140:

   ```text
   | `agent-relay node up [flags]` | Start the local broker and serve this machine as a fleet node. See [Broker lifecycle](/docs/cli-broker-lifecycle) for flags. |
   ```

2. Pre-mitigation line 141:

   ```text
   | `agent-relay node status [--state-dir <path>] [--wait-for <seconds>]` | Check local broker daemon state. |
   ```

3. Pre-mitigation line 167:

   ```text
   Fleet commands inspect and configure workspace fleet nodes. To serve a node, run `agent-relay node up` (with `--config <file>` for an explicit node definition).
   ```

4. Pre-mitigation line 183:

   ```text
   | `agent-relay cloud enroll --token <token> [flags]` | Enroll this machine as a Cloud-managed fleet node, then run `node up`. |
   ```

## Release and mitigation boundary

- Root cause: released CLI output in Agent Relay 11.3.0.
- Root fix: relay commit `3c5046a6`.
- Release authority: humans only.
- Interim website mitigation: prepared warnings plus a stricter hosted-skill
  gate; do not publish without `cmo` approval.
- Verification constraint: never reproduce this defect with a live
  workspace key in an agent transcript. If runtime confirmation becomes
  necessary, escalate for synthetic credentials in an isolated,
  non-transcribed environment.

## Retirement condition

This website mitigation is temporary. Do not retire it merely because the
fix is present in relay source or on relay's default branch. Retire it only
after npm `latest` resolves to a published Agent Relay release that has
been explicitly confirmed to contain `3c5046a6`.

The person who confirms that published release owns the follow-up that
removes the interim warnings from the seven docs pages, removes the
11.3.0-specific gate from the hosted skill, and updates this report with
the confirmed release and retirement date. Preserve the enumeration above
as the historical record of the exposure; do not delete this file when
the mitigation is retired.
