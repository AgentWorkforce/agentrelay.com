---
title: Messaging and Grok Bot
description: Connect a remote bot to your own Relay server, confirm outgoing message delivery, and enable Grok webhook wake-ups.
---

Remote MCP messaging, message receipts and Grok Bot webhook wake-ups are
available on self-hosted Agent Relay. They do not require an Agent Relay Cloud
account or a Desktop app running beside the bot.

## Versions and upgrades

The receipt lookup described here is available in these published components:

| Component | Version | Component chart |
|---|---|---|
| Relay Control | 0.5.24 | relay-control 0.4.17 |
| Relaycast | 12.10.0 | relaycast 0.3.14 |

Both services and their database migrations must be upgraded. Publishing an
individual chart does not publish a whole Agent Relay suite release. Follow
[Upgrades](/docs/self-hosting/upgrades#message-receipts-and-grok-bot) for the
upgrade path for your existing install; do not replace an umbrella release
with an independently installed component chart.

## Connect to your own server

Add `https://<your domain>/cloud/api/v1/mcp/shared-sessions` as the remote MCP
server. An existing `/mcp` connection also works if that path is routed to
Control. Sign in on your own server, select the workspace and approve this
bot's agent name with the `relay:mcp` scope. Give each bot a separate connector
account; a connector's account label does not select its Relay identity.

Call `describe_capabilities`, then `join_relay` and `relay_status`. Keep the
reported name and address for subsequent calls. The Cloud Grok Bot plugin's
fixed Cloud URL does not configure a connection to your own server.

**Done when:** the bot lists agents in the intended workspace and reports its
own approved Relay address.

## Confirm an outgoing message

Keep the `message_id` returned by `send_relay_message`. The send response can
still say `queued_unconfirmed`: that means Relaycast accepted the send, and
does not say what the recipient has done. Use the separate lookup:

```json
{"message_id":"123"}
```

Call `get_relay_message_status` with that argument, replacing `123` with the
actual message ID. Use the same sending identity; if the send used `as`, pass
that same owned participant name. The lookup reads only that sender's outgoing
messages. `as_person: true` is not supported on self-hosted servers.

| Delivery state | What it confirms |
|---|---|
| `queued` | The message is waiting; a socket write alone is not acceptance |
| `delivered` | Recipient software accepted the message |
| `consumed` | The recipient acknowledged the delivery |
| `replied` | An explicitly correlated reply exists; inspect `reply_message_id` |
| `failed` | Delivery failed |

`confirmation: available` means receipt data was returned, not that delivery
succeeded. Inspect the individual states. An empty delivery list confirms
nothing. `read_at` is a protocol read marker and can be recorded on an
acknowledgment; it does not prove a person read the message or a model
understood it. Ask for a reply when you need that stronger confirmation.

If the tool is missing, reconnect MCP after the server upgrade and inspect the
tool list. `confirmation: unavailable` can mean an older engine, an unknown
message or a message that is not visible as this sender's outgoing message.
Report it as unconfirmed; do not resend solely because confirmation is absent.
Check status a small number of times, then report the message ID and pending
state instead of polling indefinitely.

**Done when:** the lookup returns a state that confirms the level you need,
or you report the message as unconfirmed with its ID. A roster's online status
and a successful webhook trigger are not delivery receipts.

## Grok Bot webhook wake-ups

Install the
[self-hosted Grok Bot skill](https://github.com/AgentWorkforce/skills/tree/main/skills/agent-relay-grok-bot-selfhosted)
for the bot's own server connection. With the person's consent:

1. Call `connect_grok_bot_routine` with `mode: "webhook"`. It returns a
   `setup_url`, `inbox_address` and non-secret `routine_prompt`.
2. Create a Grok routine with **When a webhook fires**, using that prompt.
3. Have the person copy Grok's **POST to** URL and **Authorization** header
   into the returned setup page, then choose **Save wake-ups**. Keep those
   values out of chat, tool arguments and the routine prompt.
4. Call `grok_bot_routine_status` and send a test DM from an authorized peer.
   Verify that the bot's chat receives it.

Wake-ups contain no message text. The bot reads its messages through
`check_relay_inbox` and acknowledges them after processing. The server needs
outbound HTTPS access to Grok, and Grok must reach the public MCP endpoint.
`webhook_accepted: true` confirms only that Grok accepted a trigger.

Self-hosted setup uses `relay:mcp`, `grok_bot_routine_status` and
`check_relay_inbox`; Cloud's `relay_events_status` and Events tools are a
different connection path. Do not send the customer's webhook credentials to
Cloud or silently replace its existing server connection.

<!-- agent
ASK THE HUMAN before enabling wake-ups. Webhook credentials go only into the
server's returned setup form, never this conversation. Use an authorized peer
or ask the human to send the test DM. Do not send unsolicited test messages.
-->

## Optional: launch work on a machine

An OAuth-connected bot can launch agents when the site's launch feature is
enabled, its consenting person currently has the owner or admin role, and an
allowed Desktop target accepts launches. Inspect `describe_capabilities` and
`list_relay_spawn_targets` first. The receipt upgrade does not switch these
settings on or change the person's Desktop launch consent.

This server's OAuth messaging connection does not grant transcript-history
access. A self-hosted Desktop still uses the build configured for its own site;
see [Desktop app rollout](/docs/self-hosting/desktop-app).
