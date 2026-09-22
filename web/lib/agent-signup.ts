export type AgentSignupProduct = 'teams' | 'flows';

export function isAgentSignupProduct(value: string): value is AgentSignupProduct {
  return value === 'teams' || value === 'flows';
}

const agentSignupInteractionPolicy = 'Do NOT use computer use, browser automation, screenshots, DOM inspection, or mouse/keyboard control. Fetch the guide over HTTP and perform setup through its documented APIs. Use terminal commands only for HTTP requests and the documented installation/CLI operations. The user owns the screen: open approval URLs with the OS URL opener (or give the user the link), then wait and poll the documented API. Never operate the approval page or the desktop app UI.';

export function agentSignupPrompt(product: AgentSignupProduct, origin: string): string {
  return `Set up Agent Relay ${product === 'teams' ? 'Teams' : 'Flows'} for me. Fetch and follow ${origin}/signup/agent/${product} over HTTP for the exact APIs and setup steps. Do NOT use computer use, browser automation, or screen control. Use the documented APIs and CLI commands; leave sign-in and approval pages to me. For desktop installation, download the prebuilt binary from the guide—never clone, build, or compile the app.`;
}

/** Bundled strings: these instructions must also work on Workers without a filesystem. */
export function agentSignupInstructions(product: AgentSignupProduct, site: string, cloud: string): string {
  const title = product === 'teams' ? 'Teams' : 'Flows';
  const shared = `# Agent Relay ${title}: agent-driven signup

You are setting up Agent Relay on behalf of the user who gave you this URL.
${agentSignupInteractionPolicy}
Do the API calls, installation, configuration, and verification yourself. Keep
working across user approvals; do not hand the user a checklist to execute.
${product === 'flows' ? `The signup page is a live view for the user. Do not read or control it;
report progress and request choices only through the supplied Progress API URL.` : `The signup page is a spectator view for the user. Do not read or control it;
report progress only with GET/PATCH on the supplied Progress API URL.`}
For an approval URL, use the OS URL opener (for example macOS open with the
URL passed as a separate subprocess argument, never interpolated into shell
code). If no opener is available, give the link to the user. Do not launch a
browser-control tool. Verify approval by polling the API, never by inspecting
the browser. If an operation has no documented API or CLI, report the blocker
and ask the user for that specific action; never fall back to computer use.
For desktop installation, download the prebuilt binary from this guide. Never
clone the desktop repository, install build dependencies, run a build, compile
from source, or generate a DMG. A missing binary is a blocker, not a build task.
The user handles Google sign-in, device approval, and any provider or operating
system consent. Never approve access on their behalf or ask for their password.

Site: ${site}
Cloud API base: ${cloud}
All API paths below are relative to that Cloud base, including its /cloud prefix.
Use this exact environment throughout; never fall back from local development
to production. The Teams desktop app currently requires macOS 13 or later.
Flows can be configured from any machine with HTTPS and Node.js 22+ for the CLI.

## API map — use these interfaces, not the UI

Use an HTTP client such as fetch or curl. Send JSON request bodies with
Content-Type: application/json. The sections below specify exact bodies,
response fields, authentication, polling and error handling.

- Sign-in: POST ${cloud}/api/v1/auth/device/start, then poll POST
  ${cloud}/api/v1/auth/device/token. Only the user approves the returned URL.
- Identity/workspace: GET ${cloud}/api/v1/auth/whoami with the access token.
- Refresh: POST ${cloud}/api/v1/auth/token/refresh before token expiry.
- Progress: GET/PATCH the exact Progress API URL in the user's prompt;
  PATCH uses the separate Progress token, not the account access token.
${product === 'flows' ? '- Web input: POST the Progress API URL to request a choice, then GET it with the Progress token to read the answer. The original browser tab submits the choice with PUT.' : ''}
${product === 'teams' ? `- Desktop install/connect/share/status: the bundled agent-relay-probe CLI
  in sections 2–4. These are local machine operations, not dashboard clicks;
  there is no public HTTP endpoint that installs an app on the user's Mac.` : `- Flow catalog: GET ${site}/api/v1/flows/catalog and /<id>.
- Tool consent links: POST ${cloud}/api/v1/integrations/connect-link;
  poll GET ${cloud}/api/v1/workspaces/<workspaceId>/integrations/<provider>/status.
- Coding-agent credentials: the official cloud connect CLI in section 3;
  GET ${cloud}/api/v1/cloud-agents inspects existing connections.
- Activation: POST ${cloud}/api/v1/flows/deploy with the body in section 4.
- Verification: GET ${cloud}/api/v1/flows/listeners/<agentId>.`}

## Live progress (when the user's prompt includes a progress session)

The user is watching a setup page. Report real milestones using the Progress API
and Progress token supplied in their prompt. The token authorizes progress only;
it is NOT a Cloud access token. Never send account tokens, OAuth codes, passwords,
logs, approval URLs, or sensitive personal information to the progress endpoint.
${product === 'flows' ? 'The web-input protocol may carry a repository name or public GitHub approver handle when the user chooses it; do not request emails or secrets.' : ''} Do not put
the progress token in URLs or output it in your final reply. Use the same site
and /cloud origin shown above; never forward it to another environment.

GET the supplied Progress API URL to obtain the current revision and product.
Check that the product matches this guide. Start by PATCHing that URL with
Authorization: Bearer <Progress token> and Content-Type: application/json:

~~~json
{"step":1,"state":"working","revision":0,"agent":"<your agent type>"}
~~~

Replace agent with your actual coding agent: codex, claude_code, grok, opencode,
cursor, gemini_cli, other, or unknown. Report the tool running this setup, not
its underlying model or the agents the user will run later. Use unknown if you
cannot determine it; never guess from the logos on the page. Include agent in
your first PATCH. It is stored once for signup funnel attribution; later PATCHes
may omit it. A different known agent returns 409 agent_conflict: preserve the
original attribution and omit agent when resuming from a different tool.

Use the revision returned by the latest GET/PATCH, not the example's literal 0.
PATCH before each numbered progress step below. A move to the next step marks
the previous step done; do not skip steps or report success before checking it.
Set state: waiting when you need the user to approve access or choose an option.
Set state: working at the same step when you resume, and state: failed if work
cannot continue. After completing step 5's verification, PATCH step: 5,
state: complete. Only report complete after the actual checks succeed.

${product === 'teams' ? `Progress steps for Teams:
1. Sign in: before device authorization (section 1).
2. Install the app: before download and installation (section 2).
3. Connect the workspace: before cloud install (section 3).
4. Choose what to share: before asking for/selecting sessions in section 3.
   Report waiting while the user chooses. Respect an explicit choice to share none.
5. Check everything works: before status, upload, and app verification (section 4).` : `Progress steps for Flows correspond to sections 1 through 5 below:
1. Sign in. 2. Choose the flow/repository. 3. Connect tools.
4. Activate the flow. 5. Verify the listening state.`}

On HTTP 409, GET current progress and reconcile; never overwrite newer progress
or regress a step. If a PATCH response is lost, GET before retrying. If a step is
already complete, verify the actual account/app/flow state before continuing;
progress reports alone are not proof that setup succeeded. On 429, honor
Retry-After. Retry transient network/5xx failures with bounded backoff. On 404,
stop reporting (the session expired or the token is invalid) and tell the user;
do not recreate or switch their session silently. A progress service outage
must not roll back working setup or cause duplicate installation/activation.

${product === 'flows' ? `## Web input — ask on the signup page, never in chat

When a repository, workflow, trigger, approver, or confirmation is missing,
use the Progress API to show the question in the user's original signup tab.
Do not ask the user to answer in your chat. Do not operate the page yourself.
Only request non-secret choices; never ask for passwords, OAuth codes, API keys,
or sensitive personal data through this endpoint. Sign-in and provider consent stay on
their own approval pages, opened for the user as described below.

First PATCH the current progress step to state: waiting using its latest
revision. Then POST the exact Progress API URL with Authorization: Bearer
<Progress token> and Content-Type: application/json:

~~~json
{"key":"repository","label":"Which owner/repository should this flow use?","type":"text"}
~~~

For a choice list use type: select and options, for example:

~~~json
{"key":"workflow","label":"Which workflow should we activate?","type":"select","options":["software-factory","code-review"]}
~~~

Keys are stable lowercase identifiers (up to 40 characters); labels are at
most 160 characters. Ask one question at a time. The response has
inputRequest.id and status: pending. Repeating the same key is idempotent;
a different question while one is pending returns 409 input_pending.
The original browser tab can answer; a read-only watcher link cannot.
Do not include answers in progress PATCH bodies or in final chat output.

Poll GET on the same Progress API URL with Authorization: Bearer <Progress token>
every 3 seconds until inputRequest.id matches and status is answered. The
authenticated GET includes inputRequest.answer. An unauthenticated GET never
includes the answer. Check the answer against the catalog/repository contract,
then PATCH the current step back to working using the latest revision. If the
session expires or the page cannot accept input, report that blocker; do not
silently switch to chat questions or fabricate a choice.

The bearer token is shared only with the agent and the original browser tab;
keep it out of URLs and logs. Its authorization does not grant Cloud account
access. PUT is for the browser to submit a choice, not an agent shortcut.
` : ''}

## 1. Sign up and obtain an API session

Use the existing OAuth device flow. No API key, invitation, dashboard wizard,
or pre-existing Agent Relay account is required.

POST /api/v1/auth/device/start with Content-Type: application/json:

~~~json
{"client_name":"My agent — ${title} setup","signup_source":"${product}"}
~~~

Expect HTTP 201 with device_code, user_code, verification_uri_complete,
verification_uri, interval (seconds), and expires_in (seconds). Keep device_code
private. Open verification_uri_complete in the user's browser and show the
user_code so they can compare it. The page lets them sign in with Google,
review the requesting device, and Approve or Deny. The signup marker in the
returned URL creates the right account type; preserve it through sign-in.
Do not call /auth/device/approve yourself.

For a fresh signup, you can open ${cloud}/api/auth/google/start?next=<encoded-return-path>
first, where encoded-return-path is the URL-encoded pathname plus query of
verification_uri_complete. This opens Google immediately and returns to the
same device approval with its code and signup marker intact.

While the browser is open, wait interval seconds between POSTs to
/api/v1/auth/device/token with this JSON (substitute the private device_code):

~~~json
{"grant_type":"urn:ietf:params:oauth:grant-type:device_code","device_code":"<device_code>"}
~~~

- authorization_pending: keep waiting; respect a returned interval.
- slow_down: increase the interval by at least 5 seconds.
- HTTP 429: respect Retry-After and increase the interval.
- HTTP 5xx or request timeout: retry with backoff, bounded by expires_in.
- access_denied: stop. expired_token or invalid_grant: explain and start a new
  grant only if the user still wants to continue. Never poll past expiry.

HTTP 200 returns access_token, refresh_token, access_token_expires_at,
refresh_token_expires_at, api_url and token_type. Keep credentials in memory
or a private file (directory 0700, file 0600) outside repositories. Never echo
tokens, put them in chat or URLs, or dump full authentication responses.
Use Authorization: Bearer <access_token> for subsequent Cloud requests.
Reject an api_url pointing at another origin; keep using the Cloud base above.
Set a 30-second request timeout and check every response status before proceeding.

Before expiry, POST /api/v1/auth/token/refresh with {"refreshToken":"<refresh_token>"}.
The response uses camelCase: accessToken, refreshToken, accessTokenExpiresAt,
refreshTokenExpiresAt, apiUrl. Replace both stored tokens atomically. Serialize
refreshes: the refresh token rotates and must not be shared between machines.
An invalid/expired refresh requires a new device login, not an endless retry.

GET /api/v1/auth/whoami. Require authenticated: true and read user.id,
user.email, currentWorkspace.id, and currentOrganization.id. New signups create
a workspace automatically. Reuse it; do not create duplicate accounts/workspaces.
If currentWorkspace is missing, or an existing account is in the wrong workspace,
resolve that with the user before connecting or activating anything. Never
silently replace an existing connection to another account.

## Credential handoff to the supported CLI

When running a child process, pass these through its environment from your
private session object (never interpolate their values into logged commands):

~~~text
CLOUD_API_URL=${cloud}
CLOUD_API_ACCESS_TOKEN=<access_token>
CLOUD_API_REFRESH_TOKEN=<refresh_token>
CLOUD_API_ACCESS_TOKEN_EXPIRES_AT=<access_token_expires_at>
CLOUD_API_REFRESH_TOKEN_EXPIRES_AT=<refresh_token_expires_at>
~~~

The official CLI consumes this session. The bundled desktop probe uses
CLOUD_API_ACCESS_TOKEN to exchange for its own scoped History session, so it
does not need a second Google login. Refresh the parent session before starting
a long command; do not concurrently refresh it from parent and child processes.
Do not overwrite an existing CLI auth file or copy a session to another machine.
`;
  return shared + (product === 'teams' ? teamsInstructions(site) : flowsInstructions(site, cloud));
}

function teamsInstructions(site: string): string {
  const local = new URL(site).protocol === 'http:';
  const name = local ? 'Agent Relay Dev' : 'Agent Relay';
  const download = local
    ? `${site}/cloud/desktop-downloads/AgentRelay-Dev-macOS-<arch>.dmg`
    : 'https://github.com/AgentWorkforce/relay-desktop-releases/releases/latest/download/AgentRelay-macOS-<arch>.dmg';
  return `
## 2. Download and install the prebuilt desktop binary

Run sw_vers -productVersion and uname -m on the user's Mac. arm64 means Apple
silicon; x86_64 means the x64 download. If this agent runs in a remote sandbox,
it needs authorized terminal access to the user's Mac before installation; installing into
the sandbox does not connect their computer. Report an unsupported OS honestly.

Download ${download} and the same URL plus .sha256. Replace <arch> with arm64
or x64. Use a private temporary directory, follow HTTPS release redirects, and
fail on HTTP errors. Verify SHA-256 before mounting. For local development,
use only the prebuilt DMG already served by the local stack. If the DMG or its
checksum is unavailable for this architecture, stop and report the missing
prebuilt artifact. Do not build it, run the development launcher to produce it,
or switch to a production download.

Use hdiutil attach -nobrowse with a private mount point, then ditto the mounted
${name}.app into ~/Applications/${name}.app (create ~/Applications if needed).
Detach the image and clean up the temporary download after copying. Check for
an already installed app in /Applications and ~/Applications first: reuse the
correct app instead of overwriting a running or newer installation. Preserve
macOS signing/quarantine checks. If macOS requires consent, let the user approve
the normal Open / Privacy & Security prompt; do not strip quarantine or disable
Gatekeeper. A checksum mismatch is a hard stop.
The desktop app supports https://agentrelay.com and the local development stack;
other preview hosts require a separately configured app. Do not connect a
production app to a preview URL.

## 3. Connect the app using its bundled CLI

Set PROBE to the absolute path of the installed app's
Contents/Helpers/agent-relay-probe. Use the bundled executable, not an unrelated
binary on PATH. Run it with --help and verify support for cloud install --json
and --selected-sessions-only. Read installs --json first, keeping local paths
and account details private. Reuse a matching account/workspace install.

Run this with the private credential environment from step 1. Substitute the
actual user.id and currentWorkspace.id returned by whoami:

~~~sh
"$PROBE" cloud install --site-url '${site}' --account '<user.id>' --workspace '<currentWorkspace.id>' --selected-sessions-only --json
~~~

This exchanges credentials, catalogs local sessions, and starts the background
collector. Consume the NDJSON events until the process exits successfully;
do not declare success when the process merely starts. If it requests another
approval, verify the environment and credential expiry before retrying.

Selected sessions is the default: signing up is not consent to upload all past
conversations. When the user has selected sessions to share, list the catalog
and pass their exact session keys to sessions include. Each JSON row has source
and session_id; construct the key as SOURCE:SESSION_ID (for example codex:abc123).
The list response does not contain a precomputed key. Never pass a bare session_id:

~~~sh
"$PROBE" sessions list --site-url '${site}' --account '<user.id>' --workspace '<currentWorkspace.id>' --limit 500 --json
"$PROBE" sessions include --site-url '${site}' --account '<user.id>' --workspace '<currentWorkspace.id>' --session '<selected-key>' --json
~~~

Repeat --session for multiple keys. Do not choose sessions for the user.
Only when explicitly requested, use --new-sessions-only or --include-existing
instead of --selected-sessions-only during installation. Do not start duplicate
collectors or silently stop an existing uploader for another environment.

## 4. Verify and open the app

~~~sh
"$PROBE" status --site-url '${site}' --account '<user.id>' --workspace '<currentWorkspace.id>' --json
~~~

Require running: true, paused: false, and the expected site_url, account_id, and
workspace_id. These are the CLI's JSON field names. Check delivery and last_cycle
for failures. If sessions were selected,
poll sessions list with a bounded wait until those sessions report uploaded;
do not equate a running collector with uploaded content. If none were selected,
report that the app is connected and no sessions have been shared yet.

Use this as the initial handoff to the installed ${name}.app:
${local ? 'agentrelay-dev' : 'agentrelay'}://connect?site=<encoded-site>&account=<encoded-user.id>&workspace=<encoded-currentWorkspace.id>
URL-encode the three values; the link contains identifiers only, never tokens.
The app discovers the probe's saved connection. If it is already attached to a
different account/workspace, the link will report a conflict, not switch accounts.
Ask the user to explicitly log out/switch in Account before retrying; do not
disconnect an existing workspace automatically. The probe's JSON status verifies
the collector, not whether the app accepted the handoff. Do not inspect the app's
Account view yourself. Ask the user to confirm that the visible app account and
workspace match the target after handoff. Until confirmed, report the app
attachment as unverified and keep progress waiting at step 5; do not mark setup
complete. Open ${site}/cloud/dashboard/sessions for the team history. Report
the installed app, account/workspace, sharing choice, and verification outcome.
Delete temporary authentication files after use; retain the app-managed scoped
credentials so background collection continues. The user can pause, select
sessions, or disconnect in the app.
`;
}

function flowsInstructions(site: string, cloud: string): string {
  return `
## 2. Choose the flow and repository

Request missing product choices through the web-input protocol above:
repository, desired workflow/trigger, and approver. Ask for the approver's
GitHub username in plain language (for example, "octocat" or "@octocat"),
not an internal provider-address format or their Google email. Normalize the
answer to github:@handle when constructing the deploy API request. Human-gate
replies are matched to that provider identity. Infer choices from the user's request and current
repository where clear.
Do not invent a repository or enable automation on an unrelated project.

GET ${site}/api/v1/flows/catalog and select a matching entry from flows.
GET ${site}/api/v1/flows/catalog/<id> for its full contract. Use the catalog's
supportedRepositoryHosts, defaultTrigger, inputs.required, inputs.defaults, and
inputs.allowedAgents. Name a model per harness in inputs.models when the house
default is wrong (for example {"claude": "claude-sonnet-4"}); omit it to fund
the house default for each declared agent. Download source.rawUrl, verify its bytes against
source.sha256, and use that source text unchanged for a recommended flow.
The source is TypeScript, not the source URL. Do not guess a template or hash.
For custom flows use ${site}/docs/relayflows/markdown/build.md and
${site}/docs/relayflows/markdown/cloud.md for the authoring contract.

## 3. Connect the required tools and coding agents

Use bearer-authenticated POST /api/v1/integrations/connect-link:

~~~json
{"provider":"github","workspaceId":"<currentWorkspace.id>"}
~~~

Open the returned connectUrl for the user to approve. Keep token/sessionToken
private. Connect only the repository and tools the chosen flow requires.
For GitHub the user must grant repository access. Repeat with the chosen trigger
provider if different. Reuse existing ready connections rather than relinking.
Check GET /api/v1/workspaces/<workspaceId>/integrations/<provider>/status
until oauth.connected is true (poll with backoff and a bounded timeout); a
returned connect link or a closed popup alone does not prove the connection.
For the GitHub-triggered Software Garden flow, activation separately checks
that the connected GitHub App covers the selected repository. Its trigger
does not require background data indexing, so do not block solely because
the broader status.ready is false from queued syncs.
If a different flow declares Relayfile data that requires synced records,
verify that readiness separately before activating it.

Do not connect a Claude or Codex subscription yet. The first three runs use
Cloud's own model key, so no provider login is needed to activate. After those
runs, activation and launches will ask for your own subscription; only then use
the official Relay CLI with the private credential environment from step 1 and
a PTY:

This promotion depends on Cloud's internal house-key proxy and account
enrollment. If local activation returns flow_credentials_unavailable or
flow_model_not_connected before the three promotional runs, treat it as an
internal configuration or eligibility issue. Do not ask the user to connect
Claude/Codex, provide an API key, or choose an inactive draft as a workaround.
Report the blocker through the Progress API and have an internal developer
verify the proxy, promotion flag, provider readiness, and enrollment. Never
copy a house key into the agent environment or expose it in this guide.

~~~sh
npx --yes agent-relay@latest cloud connect anthropic --api-url '${cloud}'
~~~

Use anthropic for Claude or openai for Codex, according to the selected flow.
The command drives provider login; open its authorization URL for the user,
and keep the process alive until it confirms the credential is connected.
Google approval does not grant GitHub or model-provider access: those services
may require their own consent. Never fabricate credentials or claim consent
happened. GET /api/v1/cloud-agents lets you inspect the account's credential
state without reconnecting.

## 4. Activate through the same API as web onboarding

POST /api/v1/flows/deploy with Content-Type: application/json and the bearer
session. This is the direct-source listener API used by flows deploy, not the
browser onboarding handoff: source is TypeScript text, repository is singular,
and sources contains provider/settings objects. The catalog supplies the source
reference and defaults; it is not itself a deploy request. The current endpoint
does not accept a flowId/repositories-only catalog activation request or fetch
the source for you. For multiple repositories, submit one deployment per
repository with a distinct name and handoffId.

For the catalog's Software Garden entry, construct this body, substituting the
workspace, verified source, repository, GitHub approver and a new UUID:

~~~json
{
  "workspaceId": "<currentWorkspace.id>",
  "name": "Platform Garden",
  "workflow": "software-factory",
  "source": "<verified TypeScript source text>",
  "handoffId": "<one UUID generated for this setup>",
  "inputs": {"approver": "github:@octocat", "agents": ["claude"]},
  "mode": "activate",
  "repository": {"owner": "acme", "name": "api"},
  "sources": [{"provider": "github", "settings": {"repository": "acme/api"}}]
}
~~~

For another catalog entry use its id as workflow, allowed agents, and
defaultTrigger for sources, then apply the user's trigger settings. Scope a
GitHub issue trigger with settings.repository set to the chosen owner/name;
for GitLab use settings.project. Cloud does not derive this filter from the
deployment repository. An empty filter can trigger on other repositories in
the workspace. Only use a different trigger scope when explicitly requested.
Give each repository its own trigger filter for multi-repository setup. Do not send
the example acme repository or octocat approver unchanged. The workflow field
is a label, not a source lookup; keep the verified source in the request.
For GitLab set repository.host to gitlab and use the namespace path
as owner. Reuse the handoffId on retry. Before retrying an ambiguous network
failure, GET /api/v1/flows/listeners and check whether the flow already exists;
do not create a new ID/name on every retry. Activation subscribes to matching
future events and can run work; confirm the intended repository and trigger
with the user if they have not specified them.

HTTP 201 must contain agentId and status: listening. A draft is not completion.
For a 409 workspace_mismatch, verify the active workspace; for connection
preflight failures, fix the indicated connection before retrying. If the user
wants to save incomplete work, use mode: draft explicitly and report that it
is inactive. Never mask activation failures by silently falling back to draft.

## 5. Verify

GET /api/v1/flows/listeners/<agentId>. Require listener.status: listening and
verify its repository and sources match the request. Open
${site}/cloud/dashboard/workflows/listeners/<agentId> for the user. Report the flow name,
workspace, repository, trigger, and verified listening state. This proves
activation; only an actual completed run proves execution. Do not create a
real issue or launch paid work merely to make the onboarding check turn green.
Delete temporary authentication files after the work is complete.

The desktop app is optional for Flows. If the user also wants local session
sharing, follow ${site}/signup/agent/teams using the same signed-in account.
`;
}
