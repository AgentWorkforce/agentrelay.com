# arelay.to on Cloudflare (human runbook)

`arelay.to` stays registered at GoDaddy; Cloudflare cannot register or transfer
`.to` domains. Cloudflare serves its DNS, and the `agentrelay-router` Worker
serves the domain itself, so one address carries the page, the bridge script
and the chat endpoint:

- `https://arelay.to/agent-relay`: the page with the visitor's snippet
- `https://arelay.to/agent-relay/bridge.sh`: the retired file-bridge fallback.
  The snippet no longer points at it; it stays served for snippets pasted
  before the change.
- `https://arelay.to/agent-relay/<32 hex id>`: the conversation, forwarded to
  the dedicated `relay-agent` Worker through its service binding
- `https://arelay.to/` and `/cloud/*` redirect to agentrelay.com;
  `www.arelay.to` redirects to `arelay.to`, except chat POSTs, which it serves

A redirect rule is not enough: curl does not follow redirects without `-L`, and
a 301/302 turns the snippet's POST into a GET.

## The visitor's snippet

`web/lib/agent-chat-snippet.ts` builds the text a visitor pastes into Claude
Code, Codex or Grok. Two agent environments shape it:

- **Claude Code auto mode** blocks a command that reads a local file and uploads
  it to a domain it does not trust (the old snippet wrote each message to
  `/tmp/arelay-<id>.txt` and posted it with `curl --data-binary @file`, which was
  denied as exfiltration scouting). Auto mode does let through an action the
  user's own message names exactly. So the snippet opens by saying what is sent
  (only the inline message text) and where (the one conversation URL), and every
  send is `curl -sS --data-binary '<message>' <url>`: no temp file, nothing read
  from disk or the environment. The agent writes any `'` as `’`, so the single
  quotes keep the message plain text.
- **Codex** often runs in a `workspace-write` sandbox with no network. The
  snippet runs one `curl -sSI` against the origin, which sends nothing. If it
  fails, the agent stops with no retries or workarounds and tells the human to
  start a new session with
  `codex -c 'sandbox_workspace_write.network_access=true'` (or
  `network_access = true` under `[sandbox_workspace_write]` in
  `~/.codex/config.toml`).

None of the Agent Relay MCP server or Claude Code plugins can reach an arelay.to
conversation: each one needs a Relaycast workspace key, which a visitor does not
have. So the inline command is the main path, not a fallback.

## Setup (human only)

Agents do not run these steps.

1. Cloudflare dashboard → Add a domain → `arelay.to` → **Add site anyway** →
   Free plan. At GoDaddy, disable DNSSEC if on, then set the two Cloudflare
   nameservers. Wait until the zone is **Active** (done 2026-10-07).
   If DNSSEC was on at GoDaddy, re-enable it once the zone is Active: in
   Cloudflare, DNS → Settings → DNSSEC → Enable, then add the DS record it
   shows at GoDaddy (Domain → DNS → DNSSEC). Check with `dig +dnssec arelay.to`.
2. In the zone's DNS records, delete any `A`, `AAAA` or `CNAME` record for
   `arelay.to` and `www.arelay.to`, and delete any redirect rule for them.
   Workers custom domains create their own records and refuse to attach over
   existing ones.
3. Deploy the reviewed `relay-agent` Worker first. Its service must exist under
   the exact name `relay-agent` before the router deploy resolves the binding.
4. Merge the PR that adds `arelay.to` and `www.arelay.to` as `custom_domain`
   routes and the `RELAY_AGENT_WORKER` binding in `router/wrangler.jsonc`. The
   router deploy workflow attaches the domains and activates the binding.
5. Verify:
   ```sh
   dig +short NS arelay.to
   curl -sI https://arelay.to/ | grep -i '^location'             # https://agentrelay.com/
   curl -s -o /dev/null -w '%{http_code}\n' https://arelay.to/agent-relay   # 200
   curl -sI https://www.arelay.to/agent-relay | grep -i '^location'  # https://arelay.to/agent-relay
   # Each load mints its own conversation and is never cached:
   for i in 1 2; do curl -s https://arelay.to/agent-relay | grep -o 'arelay.to/agent-relay/[0-9a-f]\{32\}' | head -1; done  # two different ids
   curl -sI https://arelay.to/agent-relay | grep -i -e '^cache-control' -e '^cf-cache-status'  # no-store/private; not HIT
   # A fresh conversation reaches relay-agent and gets its exact Phase 0 stub:
   printf 'runbook check' | curl -sS --data-binary @- "https://arelay.to/agent-relay/$(openssl rand -hex 16)" | grep -F 'agent-relay: Hi! The Agent Relay agent is not live yet'
   # The bridge asset is still served by the router:
   curl -fsS https://arelay.to/agent-relay/bridge.sh | grep -F 'Agent Relay chat file bridge'
   ```

   The router fails closed if the configured relay-agent upstream is down: chat
   returns the same plain-text `503` retry response rather than sending private
   messages back to Cloud. The router suite pins that behavior. In a pre-production
   environment, verify it end to end by stopping its test upstream and repeating
   the conversation POST; do not stop the production Worker for this check.

Rollback: remove the two routes and redeploy the router, or detach the custom
domains under Workers → agentrelay-router → Settings → Domains.

## relay-agent routing (human only)

Production routes valid conversation POSTs to the dedicated `relay-agent`
Worker through the checked-in `RELAY_AGENT_WORKER` service binding. The Worker
must be deployed before this router configuration. No additional public custom
domain is required for the binding.

`RELAY_AGENT_ORIGIN`, when configured, remains an alternative for environments
that cannot use the binding. The service binding wins when both are present.
The origin option requires a human to add an HTTPS Worker custom domain or route
and set the variable to that origin.

To roll back chat routing, remove the `RELAY_AGENT_WORKER` binding (and
`RELAY_AGENT_ORIGIN` if set) and redeploy the router. Valid POSTs then resume
the existing Cloud path automatically. This repository's agents must not
perform the deployment, route, custom-domain, or DNS steps.
