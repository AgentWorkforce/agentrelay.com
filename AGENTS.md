# Agent operating rules

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
  agent transcript. Never pass `--show-token` to `gh auth status`; that flag
  deliberately exposes the credential. The bare command is not the
  credential-printing hazard the old rule treated it as. Use
  `env -u GITHUB_TOKEN -u GH_TOKEN /opt/homebrew/bin/gh <command>` for the
  concrete GitHub operation; escalate if unmasked credential scope itself
  must be inspected.
- Agent Relay 11.3.0 and earlier print the active workspace key from
  `agent-relay node up` and `agent-relay node status`. Do not run either
  command in an agent or other transcribed session. A human may run them
  from a trusted, non-transcribed terminal; otherwise upgrade to Agent
  Relay 11.3.1 or later, which masks the key in these two commands. That
  version is not a guarantee about credential output from every command in
  the installed dependency tree.

## Session lifecycle

- Sessions are disposable. Recycle at assignment boundaries and do not
  let a session run beyond roughly four hours.
- Check the Relay inbox at session start and once immediately before
  going idle after completed work. Never poll on a timer.
- Remain registered unless explicitly instructed to terminate. Do not
  self-remove.

## Working discipline

- For paired local Flows onboarding, Google sign-in, and dashboard tests, use
  `npm run dev:onboarding` from the sibling `../cloud` repo root. Cloud owns the
  paired launcher; read `../cloud/README.md`'s Local Setup section first. Do not start
  the two Next apps separately or use `dev:teams` for the Flows journey. Use
  the printed local URL exactly. Identify occupied ports and their owning
  checkouts before stopping servers. Never substitute production for a missing
  local service or print environment secrets. GitHub/ChatGPT auth requires real
  service configuration and user authentication; server startup is not proof.

- Inspect the tree before editing and preserve work that predates the
  session.
- Use a fresh branch or worktree from current `origin/main`.
- Report `ACK`, progress, and `DONE` with evidence.
- Do not merge, deploy, preview, publish, cut a release, or change DNS
  without the applicable human and `cmo` gates.

<!-- prpm:snippet:start @agent-relay/merge-train-snippet@1.0.0 -->
## Merging: `trunk` + the `mergeable` label

CI does **not** run on feature branches. It runs only on the `trunk` → `main`
pull request and on pushes to `main`. (Repos whose default branch is not
`main`, e.g. `master`, use that branch wherever this says `main`.) A merge
agent batches ready PRs into `trunk`, gets that one PR green, and merges it.

**When you open a PR**
1. Branch from `trunk` and open the PR with **base `trunk`**, not `main`.
   A PR into `main` from any other branch fails the `Trunk guard` check.
2. No CI runs on your PR, so verify locally before calling it ready: run the
   typecheck, tests and lint this repo uses, and list the exact commands and
   results in the PR body.

**When the PR is ready**
3. Add the label **`mergeable`** once all of these are true:
   - The change is complete and the local checks above pass.
   - Review feedback (human and bot) is addressed or answered.
   - It is not a draft and does not depend on an unmerged PR.
4. Remove `mergeable` if the PR stops being ready (new work, a failing check, a
   blocking question). The label is read live from GitHub on every sweep.

**What you must not do**
- Do not merge your own PR, and never merge into or push to `trunk` or `main`
  directly.
- Do not re-enable CI for feature branches or edit the `trunk` gates in
  `.github/workflows/`.

**The merge agent** sweeps open `mergeable` PRs with base `trunk` about every
10 minutes. It reads each PR's linked sessions (the `Agent Relay sessions`
block in the PR body, then the session summary) for context, merges them into
`trunk`, opens or updates the `trunk` → `main` PR, fixes CI there, merges when
green, and posts a summary. If your PR conflicts with `trunk`, it may ask you
to rebase on `trunk`; do so and keep the label.

> Interim: the sweep worker is not deployed yet. Until it is, a human or a
> designated agent performs the merge-agent steps manually. Labelling is unchanged.
<!-- prpm:snippet:end @agent-relay/merge-train-snippet@1.0.0 -->
