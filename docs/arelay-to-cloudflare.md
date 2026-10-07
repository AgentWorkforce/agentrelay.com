# arelay.to on Cloudflare (human runbook)

`arelay.to` stays registered at GoDaddy; Cloudflare cannot register or transfer
`.to` domains. Cloudflare serves its DNS, and the `agentrelay-router` Worker
serves the domain itself, so one address carries the page, the bridge script
and the chat endpoint:

- `https://arelay.to/agent-relay`: the page with the visitor's snippet
- `https://arelay.to/agent-relay/bridge.sh`: the file-bridge fallback
- `https://arelay.to/agent-relay/<32 hex id>`: the conversation, forwarded to
  cloud's `/cloud/api/v1/agent-chat/agent-relay/<id>`
- `https://arelay.to/`, `/cloud/*` and `www.arelay.to` redirect to agentrelay.com

A redirect rule is not enough: curl does not follow redirects without `-L`, and
a 301/302 turns the snippet's POST into a GET. Agents do not run these steps.

1. Cloudflare dashboard → Add a domain → `arelay.to` → **Add site anyway** →
   Free plan. At GoDaddy, disable DNSSEC if on, then set the two Cloudflare
   nameservers. Wait until the zone is **Active** (done 2026-10-07).
2. In the zone's DNS records, delete any `A`, `AAAA` or `CNAME` record for
   `arelay.to` and `www.arelay.to`, and delete any redirect rule for them.
   Workers custom domains create their own records and refuse to attach over
   existing ones.
3. Merge the PR that adds `arelay.to` and `www.arelay.to` as `custom_domain`
   routes in `router/wrangler.jsonc`. The router deploy workflow attaches both.
4. Verify:
   ```sh
   dig +short NS arelay.to
   curl -sI https://arelay.to/ | grep -i '^location'             # https://agentrelay.com/
   curl -s -o /dev/null -w '%{http_code}\n' https://arelay.to/agent-relay   # 200
   curl -sI https://www.arelay.to/agent-relay | grep -i '^location'  # https://arelay.to/agent-relay
   ```

Rollback: remove the two routes and redeploy the router, or detach the custom
domains under Workers → agentrelay-router → Settings → Domains.
