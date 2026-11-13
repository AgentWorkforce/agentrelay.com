---
title: Desktop app rollout
description: Get the Agent Relay desktop app to your people, signed in to your own install, and check their sessions arrive.
---

The desktop app captures your people's coding-agent sessions (Claude Code,
Codex, Copilot and others), removes secrets such as tokens and keys, and
uploads them to **your** install, following the policy your admins set.

## How self-hosted builds work

Each self-hosted install gets its own desktop build, pointed at your domain, so
people never have to type a server address. Ask your Agent Relay contact for
the build for `https://<your domain>`. It comes with a `SHA256SUMS.txt` so your
IT team can verify every installer before rolling it out.

<!-- agent
You cannot obtain the desktop build yourself. ASK THE HUMAN for the installer
files and SHA256SUMS.txt, then verify them with
"shasum -a 256 -c SHA256SUMS.txt" in the folder that holds them. STOP if any
line is not OK.
-->

## Before anyone installs

1. The install is finished: the checks in step 15 of the EKS guide, or step 14
   of the GKE guide, pass.
2. In the dashboard, under **Settings › Policies**, set what the app uploads.
3. Each person can sign in: either they have a temporary password from
   `add-user.sh`, or [single sign-on](/docs/self-hosting/okta-sso) is on and
   they're in the allowed Okta group.

## 1. Pick the right installer

| Computer | File |
|---|---|
| Mac with Apple silicon | `...-macOS-arm64.dmg` |
| Intel Mac | `...-macOS-x64.dmg` |
| Windows (most PCs) | `...-Windows-x64-Setup.exe` |
| Windows on ARM | `...-Windows-arm64-Setup.exe` |
| Linux (Debian or Ubuntu) | `...-Linux-x64.deb` (or `-arm64.deb`) |
| Other Linux | `...-Linux-x64.tar.gz` (or `-arm64.tar.gz`) |

Verify the files first: `shasum -a 256 -c SHA256SUMS.txt`.

**Done when:** every line ends in `OK`.

## 2. Install

- **Mac:** open the `.dmg` and drag the app to Applications. It is signed and
  notarized.
- **Windows:** run the `Setup.exe`. If Windows SmartScreen warns about it,
  choose **More info › Run anyway**, or have IT allowlist it by its SHA-256.
- **Linux (Debian or Ubuntu):** `sudo apt install ./<file>.deb`, then open
  Agent Relay from your applications.

## 3. Sign in

Open the app and choose sign-in. It opens `https://<your domain>` in the
browser. Sign in (with Okta, or with the email and temporary password you were
given), then approve the app.

**Done when:** the app shows you as signed in.

## 4. Check it works

Run a normal Claude Code, Codex or Copilot session, then open
`https://<your domain>` and look under **Sessions**. It can take a minute or two
to appear.

**Done when:** the session is listed and opens.

## Good to know

- **WSL on Windows:** sessions run inside WSL are captured by desktop builds
  from **2026.11.11** onward. Earlier builds only see sessions run directly on
  Windows.
- **Copilot in VS Code:** captured for new chats on **VS Code 1.143 or later**,
  where the Copilot harness is the default. Chats on the older "Local" harness
  aren't captured.
- **Updates:** a self-hosted build doesn't update itself yet. A newer version
  means installing the new build over the old one.
- **Problems:** send a screenshot of the app's status screen to whoever runs
  your install.
