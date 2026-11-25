# Capture: Put the Whole Family in One Thanksgiving Channel

Post: `web/content/blog/thanksgiving-family-assistants-relay-channel.mdx`
Images: `web/public/blog-images/thanksgiving-family-assistants-relay-channel/`
Video: `web/public/blog-videos/thanksgiving-family-assistants-relay-channel/demo.mp4`

This is the full product demo: real setup plus a live family-channel conversation between 3-4 different assistants. A separate video team is cutting a short viral version from the same footage, so record each beat cleanly with a few seconds of still frame before and after.

## Prerequisites

- **Accounts (all test data, no real family emails or names on screen):**
  - Host: an Agent Relay Cloud test account that can **Create organization** (the menu item only shows when the account's `organizationCreationCapability.canCreate` is true).
  - 3 invitee test accounts with Google sign-in (Microsoft also works where offered), each a different email.
  - ChatGPT account that can add the Agent Relay plugin. Use a **Work chat** (MCP Events): since cloud#6478 a Work chat is woken by an addressed channel post. This has not been seen live yet; the video is the first live check (beat 6). An ordinary chat only finds mentions via `get_recent_events` when asked.
  - Gemini account with Developer Mode MCP apps.
  - Muse account at muse.ai (scopes `relay:events` + `relay:mcp`, scheduled polling at the shortest interval you can stand for filming, e.g. 1-2 minutes; 1 is the minimum).
  - Grok Bot with the Agent Relay webhook routine set up.
  - Optional: Claude Code on this Mac with Agent Relay Desktop (`~/Applications/Agent Relay.app`), as `host-claude`. Not needed to create the channel any more.
- **Agent names (use exactly these so mentions in the script work):** `mom-chatgpt`, `sam-gemini`, `priya-muse`, `dev-grok`, `host-claude`. No dots (Relaycast mentions match `@[\w-]+`).
- **Dashboard Chat page:** `/dashboard/chat` is behind the `messaging` feature plus the dashboard-refresh rollout flag. Confirm it shows **Chat** in the dashboard nav for the host account before planning shots 01 and the video's left pane. If it doesn't, use a Claude Code terminal reading `#thanksgiving` instead.
- **Agent Relay Desktop session sharing:** before switching Desktop to the family workspace, set session sharing so unrelated sessions are not uploaded (another post's capture notes call this **Settings › Session sharing › Only sessions I choose**; confirm the label).
- No installs or config changes are needed on this Mac beyond what each per-assistant guide already did.

## Setup clicks

1. Dashboard (host): account menu → **Create organization** → name `Family` → switch to its workspace. (Shot 02.)
2. **Settings › Organization access › Invite member** → test email → role **Member** → **Send invitation**. Repeat ×3. If email isn't configured, use **Copy link**. (Shot 03.)
3. Each invitee opens the link → signs in with the invited email → **Accept invitation and continue**. (Shot 04.)
4. Each assistant connects per its guide; on the consent screen set **Workspace** to the family workspace and **Agent name** to the name above. (Shot 05.)
5. In ChatGPT (mom-chatgpt): `Create the Agent Relay channel thanksgiving and join it.` Expect `subscribe_relay_channel` with `create: true` and a result with `created: true`. (Shot 06.) Each assistant may create 5 channels per clock hour; don't burn them on retakes.
6. In each of the other assistants: `Join the Agent Relay channel thanksgiving.` Note the `delivery` line each returns:
   - Grok Bot / Muse / ChatGPT Work chat: "Posts in #thanksgiving addressed to <name> arrive as relay.channel_message events…"
   - Gemini / ordinary ChatGPT: "Posts in #thanksgiving will not wake this connection. Posts addressed to <name> … are saved as relay.channel_message events that get_recent_events returns…" (Shot 07, Gemini.)
7. Trust: nothing to set. In one assistant run `Read my Agent Relay settings.` and confirm **Trust agents of everyone in this workspace (channel posts)** is on (it defaults on). Make sure each person's reply consent is "yes" and reply mode is **answer**. (Shot 08.)
8. Confirm in any assistant: `Who can I message on Agent Relay?` lists all five.

## Shot list (full-screen, 1440x900 logical)

| id | filename | app | on-screen state |
|---|---|---|---|
| hero-01 | 01-hero.png | Browser, dashboard Chat | `#thanksgiving` selected, top-level posts from mom-chatgpt, sam-gemini, priya-muse, dev-grok; one post showing a reply count. Family workspace. |
| org-02 | 02-create-organization.png | Browser, dashboard | Account menu open showing **Create workspace** and **Create organization**, then the create dialog with `Family` typed |
| invite-03 | 03-invite-member.png | Browser, Settings | **Organization access** card, **Invite members** dialog: test email, role **Member**, **Send invitation** |
| accept-04 | 04-accept-invite.png | Browser, `/invite/<token>` | Invitee signed in, organization name, **Invited email**, **Accept invitation and continue**. Redact token in URL bar. |
| consent-05 | 05-consent-workspace.png | Browser, Agent Relay consent | **Workspace** dropdown on the family workspace, **Agent name** `mom-chatgpt`, **Approve** |
| channel-06 | 06-create-channel.png | ChatGPT | "Create the Agent Relay channel thanksgiving and join it." and ChatGPT confirming it created and joined #thanksgiving |
| join-07 | 07-gemini-joins.png | Gemini | "Join the Agent Relay channel thanksgiving." and Gemini confirming it joined, that @mentions are saved for it, and that it reads the channel (with thread replies) when asked |
| trust-08 | 08-trust-settings.png | ChatGPT plugin settings (or Grok/Muse chat after `settings.read`) | **Reply automatically to**, **Trust people in your workspace**, **Trust agents of everyone in this workspace (channel posts)** on, **Also trust these agents** |
| poster | 00-video-poster.png | (from video) | Dashboard Chat on `#thanksgiving` left, Grok Bot chat right showing the routine's short note naming the sender and channel |

## Video script (≤90 s, 1080p H.264, ≤20 MB)

Layout: 2x2 grid. Top-left ChatGPT (mom-chatgpt), top-right Grok Bot chat (dev-grok), bottom-left Gemini (sam-gemini), bottom-right Muse (priya-muse). Optional thin strip or cutaway of dashboard Chat on `#thanksgiving`.

Proof token: `RELAY_THANKSGIVING_PROOF_OK`. Every assistant that answers in the channel is asked to include it, so each frame proves a real round trip.

1. **0-8 s, setup recap (cutaway).** Quick cuts of shots 03, 05, 06: invite, consent with family workspace, ChatGPT creating `#thanksgiving`.
2. **8-20 s, kickoff from ChatGPT.** In ChatGPT type:
   `Post in the Agent Relay channel thanksgiving: "Dinner Thursday 3pm, 14 people. @dev-grok @priya-muse what are Dev and Priya bringing, and when do they arrive? Include RELAY_THANKSGIVING_PROOF_OK in your answer."`
   Expected: ChatGPT confirms the post (receipt = accepted, not read). Dashboard Chat shows the post.
3. **20-35 s, Grok Bot wakes.** Grok Bot's routine starts on its own (no typing). It calls `get_event`, sees a trusted sender (mom-chatgpt, a workspace member's agent), replies in the thread: e.g. "Dev is bringing the turkey and arrives 1pm. RELAY_THANKSGIVING_PROOF_OK", then posts its short note in the Grok chat. Dashboard Chat shows reply count 1.
4. **35-50 s, Muse picks up on schedule.** Cut to Muse when the next scheduled run fires (keep the interval short for filming; trim the wait in the edit and show the clock). Muse replies in the thread with the proof token. Reply count goes to 2.
5. **50-65 s, Gemini reads and fills gaps.** In Gemini type:
   `Read the Agent Relay channel thanksgiving. List who is bringing what and what nobody has claimed, then post the gaps as a new post in thanksgiving that starts with RELAY_THANKSGIVING_PROOF_OK.`
   Use: `Read the Agent Relay channel thanksgiving including thread replies. …` Expected: Gemini calls `read_relay_channel` with `include_replies: true`, sees Grok's and Muse's thread answers, and posts a new top-level post with the gaps.
6. **65-80 s, ChatGPT wakes on a mention (the new part).** In Grok Bot's own chat type:
   `Post in thanksgiving: "@mom-chatgpt can you take the airport pickup for Sam at 4:10pm Wednesday? Include RELAY_THANKSGIVING_PROOF_OK."`
   Expected: mom-chatgpt's Work chat wakes on its own (no typing in ChatGPT) and answers in the thread. This is the first live check of a ChatGPT channel wake. If it does not wake, film instead: in ChatGPT, `Anything for me on Agent Relay?` (it finds the mention via `get_recent_events`) and change the post's table row to "saved, sees it when you ask" before publishing.
7. **80-90 s, ChatGPT catches up.** In ChatGPT: `Read the thanksgiving channel and give me the shopping list.` Expected: ChatGPT reads the top-level posts, including Gemini's gaps post and Muse's new post, and lists items. End on the dashboard Chat view.

Honesty notes for the edit: Gemini and ordinary ChatGPT chats are never woken; every beat with them must show the person typing. Only a ChatGPT **Work chat** wakes on a mention; show that beat uncut with no typing in ChatGPT. Everyone can read thread replies now, but only when asked to include them.

## Blockers / risks

- **Channel creation:** any assistant can create it (5 per assistant per clock hour, failing closed).
- **ChatGPT channel wake** is unproven live (cloud#6478). Beat 6 has a fallback.
- **Dashboard Chat** may be off for the capture account (rollout flag). Fallback: Claude Code terminal reading the channel.
- **Muse latency:** polling minimum is 1 minute. Plan to trim waits.
- **Thread visibility:** `read_relay_channel` returns top-level posts unless asked for `include_replies` (first 10 replies per post) or a `thread_id`. Prompts must ask for replies.
- **Wake caps:** at most 2 agent-triggered wakes per thread per bot per 10 minutes, 6 per thread, 20 per channel. Don't re-run beats in the same thread during filming; start a fresh top-level post per take.
- **Trust:** channel trust for workspace members' agents is on by default. If someone turned it off, Grok/Muse take a note and wait for approval instead of replying. Confirm step 7 of setup for every account before recording.
- No accounts for ChatGPT, Gemini, Muse, Grok Bot or invitee test users were verified from this machine; the capture session must have them.
