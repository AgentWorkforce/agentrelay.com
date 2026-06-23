# agentrelay.com

The Agent Relay front door: the public marketing/docs site, and (incoming) the
Cloudflare router that fronts `agentrelay.com`. Runs entirely on Cloudflare —
no AWS.

## Layout

```
web/      Next.js marketing + docs site (OpenNext → Cloudflare Workers)
```

`router/` (the seamless front-door Cloudflare Worker) lands here in a later phase.

## Develop

```bash
npm install         # workspace root
npm run dev         # next dev
npm run build       # next build
npm test            # vitest
npm run preview     # build + run the OpenNext worker locally (wrangler dev)
```

## Deploy

`web` is a Next.js app built with [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)
and deployed as a Cloudflare Worker via Wrangler (`web/wrangler.jsonc`). Wrangler
auto-provisions the Worker, uploads static assets, and creates the
`origin-web.agentrelay.com` DNS record + TLS cert (the `agentrelay.com` zone must
live in the Cloudflare account).

GitHub Actions:

- `.github/workflows/deploy.yml` — production, on push to `main`
  (`wrangler deploy` → `origin-web.agentrelay.com`)
- `.github/workflows/preview.yml` — per-PR preview via `wrangler versions upload`
  (ephemeral `*.workers.dev` URL, no custom domain; Cloudflare expires old
  versions automatically — no stale-preview cleanup needed)

Required GitHub Actions config (repository-level — prod and previews share the
same Cloudflare account, so no per-environment scoping is needed):

- Secrets: `CLOUDFLARE_API_TOKEN` (Workers Scripts + Workers Routes + DNS edit on
  the account)
- Vars: `CLOUDFLARE_ACCOUNT_ID`, `NEXT_PUBLIC_POSTHOG_KEY`
  (optional `NEXT_PUBLIC_POSTHOG_HOST`, defaults to `https://i.agentrelay.com`)

Pushes to `main` auto-deploy to production; PRs get an ephemeral preview version.

The apex `agentrelay.com` reaches this site via the router's fallback; domain
consolidation onto `*.agentrelay.com` is a later phase.
