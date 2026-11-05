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

### Standalone dashboard

`/dashboard` redirects to `/dashboard/`. `/dashboard/*` uses the optional
`DASHBOARD_ASSETS` service binding, with `/dashboard` stripped from the upstream
asset path. Cookies/authorization are not forwarded to this static service.
`/login` remains the marketing login page and `/cloud/api/*` remains Cloud,
so API requests receive Cloud's existing HttpOnly session cookie on the apex.

Deployment order (human/CI only): publish the relay-dashboard static asset Worker
named `relay-dashboard`, deploy Cloud's `/dashboard/` OAuth return support, then
add `{ "binding": "DASHBOARD_ASSETS", "service": "relay-dashboard" }` to this
router's services and deploy. The binding is intentionally not enabled until the
service exists. Without it, `/dashboard/*` returns an explicit uncached 503.
Rollback removes the binding; existing `/cloud/dashboard/*` is unaffected.

Local shared-origin development: run the Cloud-owned launcher, passing
`DASHBOARD_DEV_ORIGIN=http://127.0.0.1:5173` to the marketing process. This adds
only a loopback development rewrite. Use the gateway URL (normally
`http://localhost:3100/dashboard/`), not Vite's port, for cookie/OAuth testing.
