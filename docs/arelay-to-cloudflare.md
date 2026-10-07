# arelay.to on Cloudflare (human runbook)

`arelay.to` stays registered at GoDaddy; Cloudflare cannot register or transfer
`.to` domains. Cloudflare only serves its DNS and redirects every path to
`agentrelay.com`, so `https://arelay.to/agent-relay` opens
`https://agentrelay.com/agent-relay`. Agents do not run these steps.

Before the switch, GoDaddy served only parking `A` records
(`3.33.130.190`, `15.197.148.33`), no MX or TXT records, and no HTTPS.

1. Cloudflare dashboard → Add a domain → `arelay.to`. At ".to domains aren't
   supported yet", choose **Add site anyway**. Select the Free plan.
2. In DNS records, delete the imported GoDaddy parking `A` records and add these
   placeholders, all **Proxied**, since redirect rules only run on proxied traffic:
   - `A @ 192.0.2.1`
   - `AAAA @ 100::`
   - `CNAME www arelay.to`
3. If DNSSEC is enabled at GoDaddy, disable it first.
4. GoDaddy → arelay.to → Nameservers → "I'll use my own nameservers" → enter the
   two Cloudflare nameservers.
5. Wait until Cloudflare shows the zone as **Active**.
6. Rules → Redirect Rules → Create:
   - When: hostname equals `arelay.to` or `www.arelay.to`
   - Then: Dynamic, `concat("https://agentrelay.com", http.request.uri.path)`,
     status 302, preserve query string. Switch to 301 once settled.
7. Verify:
   ```sh
   dig +short NS arelay.to
   curl -sI https://arelay.to/agent-relay | grep -i '^location'
   ```
   Expect Cloudflare nameservers and `location: https://agentrelay.com/agent-relay`.

Rollback: restore GoDaddy's default nameservers in step 4.
