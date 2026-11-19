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
  Off fences compare decoded paths case-insensitively, so case variants cannot
  escape into a broader rule. Enabled prefixes remain case-sensitive; this
  fence check does not widen traffic selection.
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

Matching decodes the request path once. Encoded separators/dots/percent signs,
duplicate slashes, dot segments, malformed encoding and control/backslash
characters retain legacy routing instead of risking a different backend parse.
Forwarding preserves the caller's original escaped path and query, including
repeated query keys. This feature applies only to the `agentrelay.com` host,
after the router's existing special routes and Cloud aliases are resolved.
It does not change arelay.to behavior.

`shadow` returns the existing response. Eligibility is the intersection of a
matching KV shadow rule and the code-level `SHADOW_READ_PATH` allowlist of
audited read routes. KV can narrow that set, never widen it. Only GET and HEAD
are eligible, and Range requests are excluded. The current read shapes under
`/cloud/api/v1/workspaces/:workspaceId` are:

- `/sessions`, `/sessions/activity`, `/sessions/agents`, `/sessions/output`.
- `/sessions/:sessionId/delivery-evidence`.
- `/reflex/sessions/:sessionId/analysis`, `/brief`, `/events`.
- `/relayhistory/origin`.

These are exact path shapes, not arbitrary descendant prefixes. Unknown GETs,
marketing pages, reset, invite acceptance, billing portal and provider-install
routes are never shadowed, even under a `/cloud` rule. Session pull-request
reads are also excluded because `refresh=1` persists provider state. Expanding
the read allowlist requires an owner-side side-effect audit and code review.

The fixed denylist below applies to both `shadow` and `on`, regardless of the
configured prefix or methods:

- Authentication, login/logout/sign-in, callbacks, OAuth, `.well-known`, device
  auth, grants, token/key/credential issuance and their known minting aliases.
- Provider webhooks and MCP.
- SSE/streaming endpoints, `text/event-stream` request headers, and upgrades.
- Credential/grant exchange parameters in the query string.

Denied requests retain legacy dispatch. The denylist is evaluated on decoded
paths; ambiguous encodings fail closed, so a broad prefix cannot bypass it.
The code includes
credential-mint aliases such as Relayfile mount sessions, archive leases,
worker enrollment, local-run tokens and share-link creation.

Copies run in `waitUntil` with five-second fetch/body-read deadlines, a 64 KiB
body limit per response and a JSON depth limit. The existing response body is read through a
bounded clone; the original remains available to the client. For JSON responses
the comparison hashes sorted key/type structure (including array element
shapes), ignoring scalar values and array ordering/counts. Other responses use
a SHA-256 body hash; HEAD compares empty-body hashes. Only status and the shape/
hash comparison verdict are logged, never either body, digest, JSON keys,
header values, tokens, IDs, URLs, query strings or error text. Target cookies
and responses are never returned to the client.

An authenticated request (Cookie or Authorization present) whose shadow answers
401 is logged as `identity_unmigrated`, not a mismatch: standalone identity has
not yet imported Cloud's cookie/token population. That classification is an
expected pre-import observation, not proof that the credential is valid.
Oversized, invalid JSON, stalled or failed comparisons log `error` without
changing the client response. Known Cloud event-stream responses are not copied;
unexpected target event streams are canceled. On mode refuses an unexpected
streaming response with a generic 502 rather than returning or replaying it.

A match only establishes status and structural/hash equivalence for the sampled
response; it does not establish identity, permission, persisted-data or complete
route parity. Separate parity evidence is required before enabling traffic.
If the Cloud binding is missing, the existing 503 is preserved and a
`cloud_binding_unavailable` skip is logged; silence is never a match count.
Before configuring a shadow, audit the target GET/HEAD handler for session
rotation, refresh, revocation and other side effects that could affect a Cloud
credential even when its copied response is discarded.

`on` forwards Cookie, Authorization, request IDs, method and streaming body to
the selected allowlisted origin. It overrides forwarded host/protocol to
`agentrelay.com`/HTTPS and uses manual redirects so credentials cannot follow
an upstream redirect automatically. Forwarded-prefix/for, Forwarded and Real-IP
values from the caller are discarded; X-Forwarded-For is derived only from
Cloudflare's `cf-connecting-ip`, or omitted. Absolute or protocol-relative
redirects to either allowlisted origin are rewritten to the apex, preserving
path/query/fragment; relative and foreign redirects remain unchanged.

Every upstream Set-Cookie other than `agent_relay_session` is preserved
separately, with its Domain attribute removed to make it host-only. Other cookie
attributes, including Expires, are preserved. The facade suppresses creation
and deletion of `agent_relay_session` until Cloud/Control's exact cookie Domain,
Path, logout and parser-order contract is explicitly migrated. This avoids
minting a second same-name host-only cookie alongside Cloud's Domain cookie.
Upstream failures return a generic
502 and never replay a possibly accepted mutation into Cloud.

On responses carry `x-ar-origin`: `rc` for the control API, `rfc` for the web
gateway's explicit Flows/worker/workflow route families, or `web` for the UI.
The web gateway's other `/cloud/api` and `/login` paths are labeled `rc`.
These are selected-ingress labels, not backend provenance. Slow edge-timing
logs include the same label for on requests and the legacy `cloud` or `web`
label for shadowed responses.
Off/unmatched/invalid configurations preserve existing response headers and
logging. The facade on branch does not add traffic to the existing replay
recorder.

No deployment, KV value, service binding or live routing is changed by adding
this code. Deploys, prefix changes, drains, DNS and database changes need the
human release gates. Rolling a prefix back to `off` restores existing dispatch
for that prefix on subsequent reads, subject to KV propagation/cache lag;
it is not an instant global rollback. The router reads KV per eligible apex
request so prefixes remain entirely data-driven; this adds read cost and cold
lookup latency even when no rule matches. No application cache is added.
[Cloudflare documents up to 60 seconds of stale reads](https://developers.cloudflare.com/kv/api/read-key-value-pairs/)
with the default cache behavior, including negative lookups. Do not enable
authenticated cohorts until cookie/token acceptance, identity/workspace scope,
persisted state, aliases and active-run ownership are independently verified.

Offline router validation:

```sh
~/.local/bin/aw-heavy -- npm --workspace router run test -- --maxWorkers=1 --no-file-parallelism
~/.local/bin/aw-heavy -- npm --workspace router run typecheck
npm run lint
```

## Hosted MCP gateway failures

On `agentrelay.com`, POST failures on the Shared Sessions (`/mcp` included), Events and Replica MCP
facades receive a safe JSON-RPC error when an upstream 5xx has no application
correlation header, including a blank response from a killed application Worker.
The gateway returns the original HTTP status, a generated `X-Correlation-Id`,
and the same ID in the error message and `error.data.correlation_id`. A thrown
dispatch failure becomes a correlated 503. Calls are forwarded once.

The `hosted_mcp_gateway_failure` log joins that ID to a validated platform
CF-Ray and a fixed failure category. Request bodies, headers, URLs, upstream
bodies and exception messages are excluded from the log. Successful streams and
already-correlated application failures pass through unread. Database cutover
and target-unavailable responses retain their status, body, retry and maintenance
headers, with an added correlation header. Dispatch configuration is unchanged.

This fallback works outside the application isolate; it diagnoses a platform
kill without claiming to fix its memory allocation. Production changes retain
the repository's reviewed CI and human release gates.
