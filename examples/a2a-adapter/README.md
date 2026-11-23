# A2A adapter for arelay.to

A Cloudflare Worker that puts any agent behind the [A2A](https://a2a-protocol.org)
interface arelay.to delivers to. You edit one function, deploy, and register.

arelay.to delivers visitor messages in one of two ways: to an agent on Agent
Relay, or over A2A. Use this template for anything else: an agent on a server,
an existing HTTP API, or a direct model call.

## Before you start

**A2A delivery needs a verified domain.** You prove you own it with a DNS TXT
record or an HTTPS well-known file. Account-only verification (no domain) only
works for Agent Relay delivery, not A2A.

**Both URLs must be HTTPS on that domain or a subdomain.** That means the agent
card URL and the service endpoint the card declares. For `acme.com`,
`https://agents.acme.com/.well-known/agent-card.json` declaring
`https://agents.acme.com/a2a` works. A `*.workers.dev` URL does not. This
template derives both URLs from one setting and refuses to serve a card
arelay.to would reject, with an error saying why.

## Files

| File | What it is |
| --- | --- |
| `src/config.ts` | **Edit.** Your verified domain, the origin you serve from, and the agent's name, description and skills. |
| `src/answer.ts` | **Edit.** `answer(message, context)` takes the visitor's text and returns your reply. |
| `src/adapters/forward-http.ts` | Example `answer`: forward to an agent you already run over HTTP. |
| `src/adapters/claude.ts` | Example `answer`: call Claude directly. |
| `src/index.ts`, `src/a2a.ts`, `src/card.ts`, `src/domain.ts` | The A2A plumbing. You shouldn't need to touch these. |
| `scripts/smoke.ts` | Checks a deployed Worker the way arelay.to will. |

`answer` ships as an echo, so you can deploy and test before wiring your agent in.

## Deploy

```sh
npm install
npm test                      # typecheck + unit tests
npx wrangler dev              # local: http://localhost:8787/.well-known/agent-card.json
```

1. Set `verifiedDomain` and `publicOrigin` in `src/config.ts`.
2. Uncomment `routes` in `wrangler.toml` with the same host, so the Worker is
   served on your domain.
3. Optional: require a bearer token. arelay.to sends it as
   `Authorization: Bearer <token>`.

   ```sh
   openssl rand -hex 32 | npx wrangler secret put A2A_BEARER_TOKEN
   ```

4. `npx wrangler deploy`

Then check it:

```sh
A2A_BEARER_TOKEN=<token, if you set one> \
  npm run smoke -- https://agents.acme.com/.well-known/agent-card.json acme.com
```

The smoke test checks four things:
- the card URL and the declared endpoint are HTTPS on your domain;
- the endpoint doesn't redirect;
- one message gets a text reply;
- that reply arrives in time.

The smoke script needs Node 22.6 or later.

## Register

Follow **https://arelay.to/register**. When it asks for delivery, give it your
card URL, plus the bearer token if you set one:

```json
{ "type": "a2a", "agentCardUrl": "https://agents.acme.com/.well-known/agent-card.json", "bearerToken": "<optional>" }
```

arelay.to encrypts the token and never shows it again. You can replace or
remove it later through the management API.

## Limits worth knowing

- **About 10 seconds per reply.** arelay.to gives up after that, so `answer`
  must finish in time. The example adapters set their timeouts below it.
- **No redirects on the endpoint.** Serve `/a2a` directly. The card may
  redirect up to 3 times, but only within your domain.
- **Text only.** The template speaks A2A 1.0 JSON-RPC (`SendMessage`) and
  answers each message synchronously. Card responses are capped at 64 KB and
  replies at 256 KB.
- **No secrets in the repo.** Tokens and API keys go in `wrangler secret put`,
  never in `wrangler.toml` or `src/`.
