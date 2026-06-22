# agentrelay.com

The Agent Relay front door: the public marketing/docs site, and (incoming) the
Cloudflare router that fronts `agentrelay.com`.

## Layout

```
web/      Next.js marketing + docs site (SST → AWS, Cloudflare-proxied)
```

`router/` (the seamless front-door Cloudflare Worker) lands here in a later phase.

## Develop

```bash
npm install         # workspace root; hoists the sst CLI
npm run web         # next dev
npm run build       # next build
npm test            # vitest
npm run dev         # sst dev (web)
```

## Deploy

SST app `relay-web`, deployed by GitHub Actions:

- `.github/workflows/deploy.yml` — production, on push to `main`
- `.github/workflows/preview.yml` — per-PR `pr-<n>` previews + cleanup on close
- `.github/workflows/remove-stale-previews.yml` — daily stale-stage sweep

Required GitHub Actions config (environments `prod` + `preview`):

- Secrets: `CLOUDFLARE_API_TOKEN`
- Vars: `CLOUDFLARE_ACCOUNT_ID`, `NEXT_PUBLIC_POSTHOG_KEY`, `AWS_ACCOUNT_ID`,
  `AWS_REGION`, `AWS_ROLE_TO_ASSUME`

Production serves `origin.agentrelay.net` today; the apex `agentrelay.com` reaches
it via the router's fallback. Domain consolidation onto `*.agentrelay.com` is a
later phase.
