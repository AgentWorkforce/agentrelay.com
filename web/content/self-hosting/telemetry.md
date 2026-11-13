---
title: Telemetry
description: What a self-hosted install sends to Agent Relay (nothing, until you register it), the three levels, and how to preview, change or export it.
---

**A default install sends nothing.** Telemetry only starts once the install is
registered with Agent Relay, and you choose the level.

## Levels

One setting controls it, `relay-control.telemetry.level` in `values.yaml`:

| Level | Sent |
|---|---|
| `off` | Nothing automatic. Issue reports only when someone files one. |
| `errors` (default) | Error counts and error bursts, component health and versions, and the deployment's shape (chart version, replicas, backends). No usage counts. |
| `full` | `errors`, plus usage counts: requests per feature area, active workspaces and agents, message counts, sign-ins, flow outcomes. |

The level takes effect only once the install is **registered**: until
`telemetry.installId`, the install key (`secretKeys.telemetryInstallKey`) and,
for HTTPS, `telemetry.endpoint` are all set, the chart renders the level as
`off`. Setting only some of them fails the render. Agent Relay issues the ID,
key and endpoint when you register; [ask us](/docs/self-hosting/support) if you
want to.

## Never collected

Message, channel or DM content, attachments, transcripts, prompts, model
output, tool input or output, file contents or names, secrets, tokens, keys and
connection strings, emails, user names, IP addresses, and raw workspace,
organization, user or agent IDs. Where a count is per workspace, it uses a
salted hash, and the salt never leaves your database.

Reports are allowlisted counts, passed through the secret scrubber, signed with
your install key and sent only over HTTPS. Error reports carry the error class,
status, route template, counts, timestamps and a stack fingerprint, never the
message or the trace.

## Preview what would be sent

- **In the browser,** as an organization owner or admin:
  `https://<your domain>/cloud/api/v1/telemetry/admin` shows the level, the
  endpoint, the outbox, the next report and what each other level would send.
  It changes nothing.
- **API:** `GET /api/v1/organizations/<organization id>/telemetry/preview`,
  with `?level=errors` or `?level=full` for a what-if.

## Change the level

Set it in `values.yaml` and run your normal `helm upgrade`:

```yaml
relay-control:
  telemetry:
    level: "off"   # or errors, or full
```

With NetworkPolicy on and all egress blocked, a registered HTTPS install also
needs `telemetry.egressTo` (the ingest addresses).

<!-- agent
Changing the telemetry level is the human's decision: ASK THE HUMAN before
editing it. Never register an install or invent an endpoint.
-->

## Air-gapped installs

Set `telemetry.transport: file`. Nothing is sent over the network: reports wait
in the database outbox, and an organization admin downloads a signed export
(`GET /api/v1/organizations/<organization id>/telemetry/export?snapshot=1`),
reads it, and sends it from a connected machine if they choose.

## Delivery

Reports go to a PostgreSQL outbox first, so nothing is lost without network
access. Retries back off from 30 seconds to 6 hours; a report is dropped after
40 attempts or 14 days. A digest goes out hourly. An error burst (20 of the same
error within 5 minutes, or three failed health checks in a row) goes out at
once, at most once per error every 30 minutes.

## Issue reports

Organization owners and admins can file a scrubbed, signed diagnostic report.
Send it with `"dryRun": true` first to see the exact body. At most 20 an hour,
and only from a registered install:

```sh
curl -X POST "https://api.<your domain>/api/v1/organizations/$ORG_ID/telemetry/issues" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"...","summary":"...","severity":"high","component":"sessions","dryRun":true}'
```

Keep `$TOKEN` in your own shell. Never paste it anywhere.
