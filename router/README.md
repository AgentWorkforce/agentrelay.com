Route precedence:

- `/meet-with-will` (alias `/will`), `/meet-with-khaliq` (alias `/khaliq`), and `/virtual-office` redirect to their external meeting destinations at the edge.
- `/cloud*` routes to the Agent Relay Cloud Next.js app.
- `GET`/`HEAD /connect/<id>` (Relay Connect invite links) is served by the Cloud app's `/cloud/connect/<id>` route.
- `/observer/file*` routes to the RelayFile observer app, expected to be built with `basePath: "/observer/file"`.
- `/observer*` routes to the Relaycast observer app.
- On `arelay.to`, `GET`/`HEAD /register` and
  `/api/v1/(registrations|agents)/**` route to the `relay-agent` Worker;
  `POST /<handle>/<32hex>` routes there on both `arelay.to` and
  `www.arelay.to`. The Worker owns registry lookup and its 404/410 decisions.
- everything else falls back to the legacy proxy target.

RelayFile observer deployment is wired from the production job in
`.github/workflows/deploy.yml`. The job runs
`scripts/deploy-file-observer-pages.sh`, which packs
`@relayfile/file-observer@latest`, builds it with
`FILE_OBSERVER_BASE_PATH=/observer/file`, and deploys the detected static output
to the Cloudflare Pages project `relayfile-file-observer`. The script creates
that Pages project with the configured production branch when it is missing, so
the first production deploy does not require manual Cloudflare setup.

```
                                     ┌────────────────────────────────────┐                                        
                                     │   @agentworkforce/agentrelay.com   │                                        
                                     │                                    │                                        
                                     │    /router (Cloudflare worker)     │                                        
                                     └────────────────────────────────────┘                                        
                                                                                                                   
                                    ┌──────────────────────────────────────┐                                       
                                    │            agentrelay.com            │                                       
                                    └──────────────────────────────────────┘                                       
                                                        │                                                          
                                                        │                                                          
                                                        │                                                          
                          All cloud routes              │          Observer Routes                                 
                   ┌───(/cloud/*, /cloud/api)───────────┼────(/observer*, /observer/file*)───────┐
                   │                                    │                                       │                  
                   │                                    │                                       │                  
                   │                                    │                                       │                  
                   ▼                                    │                                       ▼                  
┌────────────────────────────────────┐                  │                    ┌────────────────────────────────────┐
│      https://agentrelay.cloud      │                  │                    │   https://relaycast.dev/observer   │
└────────────────────────────────────┘                  │                    └────────────────────────────────────┘
                                                        │                                                          
                                                        │                                                          
┌────────────────────────────────────┐            All Other Routes           ┌────────────────────────────────────┐
│   @agentworkforce/agentrelay.com   │      (/, /docs, /blog, /openclaw)     │     @agentworkforce/relaycast      │
│                                    │                  │                    │                                    │
│         /web (NextJs App)          │                  │                    │ /packages/observer-dashboard       │
│                                    │                  │                    │ /@relayfile/file-observer          │
└────────────────────────────────────┘                  │                    └────────────────────────────────────┘
                                                        │                                                          
                                                        │                                                          
                                                        │                                                          
                                                        │                                                          
                                                        │                                                          
                                                        │                                                          
                                                        │                                                          
                                                        │                                                          
                                                        ▼                                                          
                                     ┌────────────────────────────────────┐                                        
                                     │  https://origin-web.agentrelay.com │                                        
                                     └────────────────────────────────────┘                                        
                                                                                                                   
                                                                                                                   
                                     ┌────────────────────────────────────┐                                        
                                     │   @agentworkforce/agentrelay.com   │                                        
                                     │                                    │                                        
                                     │         /web (NextJs App)          │                                        
                                     └────────────────────────────────────┘                                        
```

## Cloud facade

The router keeps its existing Cloud service binding, webhook offload, marketing,
MCP and short-host routing. `ROUTER_CONFIG` can optionally carry a
`cloud-facade-routes` JSON array for a staged Cloud extraction. No table is
seeded by this change; an absent key is dormant.

Each entry has `{prefix, methods?, origin, mode}`:

- `prefix` is a canonical decoded path without a trailing slash (except `/`).
  It matches itself and descendant segments, never lookalike suffixes. Prefixes
  are literal strings; wildcard and `[param]` templates are rejected. Methods, when supplied, are a
  nonempty array of uppercase HTTP method names.
- The longest method-compatible prefix wins. Equal prefixes use array order.
  A narrower `off` rule fences a broader enabled rule for its matching methods.
- `origin` must be exactly `https://api.prod-aws.agentrelay.com` or
  `https://prod-aws.agentrelay.com`. Credentials, ports, paths, queries,
  fragments, lookalike hosts and even trailing slashes are refused.
- `mode` is `off`, `shadow` or `on`. Missing/blank/empty/invalid/unreadable
  configuration retains the existing dispatch and response. A single invalid
  entry invalidates the entire table, including an invalid `off` entry.

For example, this valid table keeps a concrete cohort disabled:

```json
[
  {
    "prefix": "/cloud/api/v1/workspaces/rw_example/sessions",
    "methods": ["GET"],
    "origin": "https://api.prod-aws.agentrelay.com",
    "mode": "off"
  }
]
```

Matching decodes the request path once and normalizes slash/dot segments;
malformed encoding or control/backslash characters retain legacy routing.
Forwarding preserves the caller's original escaped path and query, including
repeated query keys. This feature applies only to the `agentrelay.com` host,
after the router's existing special routes and Cloud aliases are resolved.
It does not change arelay.to behavior.

`shadow` returns the existing Cloud response. It schedules a second request in
`waitUntil`, with a five-second deadline and manual redirects, only for an
explicit read cohort: workspace sessions/list/activity/metadata/output/detail/
delivery evidence, session share-link/PR lists, History reflex analysis/brief/
events, and History origin reads. These are not arbitrary GETs: OAuth, login,
grant exchanges, credential queries, mutations, HEAD, Range, WebSockets and
SSE requests are excluded. Extending the cohort needs a source review. The
shadow response body is canceled without reading it; target cookies are never
returned to the client.

The `cloud_facade_shadow` log contains a coarse route class, selected ingress
label, status codes, and status/media-type match booleans. It contains no body,
header values, tokens, IDs, URLs, query strings or error text. **A match only
means equal status and media-type category, not JSON/body, identity, permission
or data parity.** A separate parity check is required before enabling traffic.

`on` forwards Cookie, Authorization, request IDs, method and streaming body to
the selected allowlisted origin. It overrides forwarded host/protocol to
`agentrelay.com`/HTTPS and uses manual redirects so credentials cannot follow
an upstream redirect automatically. Every upstream Set-Cookie is preserved
separately, with its Domain attribute removed to make it host-only. Other cookie
attributes, including Expires, are preserved. Upstream failures return a generic
502 and never replay a possibly accepted mutation into Cloud.

On responses carry `x-ar-origin`: `rc` for the control API, `rfc` for the web
gateway's explicit Flows/worker/workflow route families, or `web` for the UI.
The web gateway's other `/cloud/api` and `/login` paths are labeled `rc`.
These are selected-ingress labels, not backend provenance. Slow edge-timing
logs include the same label for on requests and `cloud` for shadowed responses.
Off/unmatched/invalid configurations preserve existing response headers and
logging. The facade on branch does not add traffic to the existing replay
recorder.

No deployment, KV value, service binding or live routing is changed by adding
this code. Deploys, prefix changes, drains, DNS and database changes need the
human release gates. Rolling a prefix back to `off` restores existing dispatch
for that prefix on subsequent reads (subject to KV propagation). Do not enable
authenticated cohorts until cookie/token acceptance, identity/workspace scope,
persisted state, aliases and active-run ownership are independently verified.

Offline router validation:

```sh
~/.local/bin/aw-heavy -- npm --workspace router run test -- --maxWorkers=1 --no-file-parallelism
~/.local/bin/aw-heavy -- npm --workspace router run typecheck
npm run lint
```
