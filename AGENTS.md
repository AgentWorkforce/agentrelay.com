# Agent operating rules

Read `CLAUDE.md` for the resident lead role and content-pipeline process.
These rules are repository law for every agent session in this checkout.

## Safety and authority

- Agents have no production access. Do not use Cloudflare, Wrangler,
  Vercel, DNS, or other live-infrastructure credentials, and do not run
  commands that can deploy or mutate production.
- Production is reached only by a reviewed pull request through CI or by
  a human running a prepared runbook. Deploys, previews, publishing, and
  DNS remain gated on `cmo`.
- Main requires at least two recorded reviews. The author's own pass does
  not count; at least one review must come from a different agent.
  Check/status contexts such as CodeRabbit are not submitted reviews.
- Only humans cut releases. Any earlier agent release permission is void,
  not paused.
- Never execute a command that prints or may print a credential in an
  agent transcript. In particular, do not run `gh auth status`. Use
  `env -u GITHUB_TOKEN -u GH_TOKEN /opt/homebrew/bin/gh <command>` for the
  concrete GitHub operation; escalate if credential scope itself must be
  inspected.
- Agent Relay 11.3.0 prints the active workspace key from
  `agent-relay node up` and `agent-relay node status`. Do not run either
  command in an agent or other transcribed session. A human may run them
  from a trusted, non-transcribed terminal, or use a release confirmed to
  include relay fix `3c5046a6`.

## Session lifecycle

- Sessions are disposable. Recycle at assignment boundaries and do not
  let a session run beyond roughly four hours.
- Check the Relay inbox at session start and once immediately before
  going idle after completed work. Never poll on a timer.
- Remain registered unless explicitly instructed to terminate. Do not
  self-remove.

## Working discipline

- Inspect the tree before editing and preserve work that predates the
  session.
- Use a fresh branch or worktree from current `origin/main`.
- Report `ACK`, progress, and `DONE` with evidence.
- Do not merge, deploy, preview, publish, cut a release, or change DNS
  without the applicable human and `cmo` gates.
