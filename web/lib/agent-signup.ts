import { SETUP_SKILLS, SETUP_SKILLS_SOURCE } from './generated/setup-skills';

export type AgentSignupProduct = 'teams' | 'flows';

export function isAgentSignupProduct(value: string): value is AgentSignupProduct {
  return value === 'teams' || value === 'flows';
}

const agentSignupInteractionPolicy = 'Do NOT use computer use, browser automation, screenshots, DOM inspection, or mouse/keyboard control. Fetch the guide over HTTP and perform setup through its documented APIs. Use terminal commands only for HTTP requests and the documented installation/CLI operations. The user owns the screen: open approval URLs with the OS URL opener (or give the user the link), then wait and poll the documented API. Never operate the approval page or the desktop app UI.';

export function agentSignupPrompt(product: AgentSignupProduct, origin: string): string {
  return `Set up Agent Relay ${product === 'teams' ? 'Teams' : 'Flows'} for me. Fetch and follow ${origin}/signup/agent/${product} over HTTP for the exact APIs and setup steps, sending a User-Agent that names your tool (Python urllib's default is blocked). Do NOT use computer use, browser automation, or screen control. Use the documented APIs and CLI commands; leave sign-in and approval pages to me. For desktop installation, download the prebuilt binary from the guide—never clone, build, or compile the app.`;
}

/** Bundled strings: the skills are vendored into a generated module, so this also works on Workers without a filesystem. */
export function agentSignupInstructions(product: AgentSignupProduct, site: string, cloud: string): string {
  const title = product === 'teams' ? 'Teams' : 'Flows';
  const parts = signupParts[product];
  const header = `# Agent Relay ${title}: agent-driven signup

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
For desktop installation, download the prebuilt binary the skill names. Never
clone the desktop repository, install build dependencies, run a build, compile
from source, or generate a DMG. A missing binary is a blocker, not a build task.
The user handles Google sign-in, device approval, and any provider or operating
system consent. Never approve access on their behalf or ask for their password.

Site: ${site}
Cloud API base: ${cloud}
Use this exact environment throughout; never fall back from local development
to production.

Send a User-Agent naming your tool (for example agent-relay-setup/1.0) on every
HTTP request, including the guide and the Cloud APIs. The edge rejects Python
urllib's default (Python-urllib/x.y) with HTTP 403 and a plain-text
"error code: 1010" body before the API sees the request. API errors are JSON
objects with an error code. For any response that is not JSON, report only the
HTTP status, never the body.

## How this guide is built

This header holds only what is specific to signup. The setup steps are the
canonical Agent Relay skills from https://github.com/AgentWorkforce/skills,
included below verbatim at commit ${SETUP_SKILLS_SOURCE.commit}:

${parts.map((part, index) => `- Part ${index + 1}: ${part.label} (${part.skill})`).join('\n')}

Follow the parts in order${product === 'flows' ? ' (Part 3 is a reference, read only for a custom flow)' : ''}. Where a part says to ask the human, ask the user
${product === 'flows' ? 'through the web-input protocol below, not in chat' : 'in your conversation with them'}.
Where a part offers to install itself as a skill or to use another agent,
continue with the text here instead. A part that requires another skill finds
it as another part of this guide; do not stop to install skills.
${product === 'teams' ? `
Part 1 creates the account with signup_source "teams"; this marker admits a new
Teams signup, so do it before Part 2. Pass Part 1's currentWorkspace.id as the
workspace in Part 2's /setup/sign-in payload. The app signs in on its own, so
the user may approve one more device link there unless it reuses a login.
Before Part 2, read Part 3's "The only human steps" and ask the user for those
inputs up front, so they can mint the token while the desktop installs.
Setup is complete only in Part 3's finished state: a proven live round trip.` : `
Part 1 creates the account with signup_source "flows". Part 2 uses its access
token and its user.id and currentWorkspace.id. Part 3 is writing-relayflows,
the authoring guide Part 2's custom-flow path defers to; skip it for a
prebuilt flow.`}${site.startsWith('http:') ? localDevelopmentNote(product, site) : ''}

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
cannot continue. Only report complete after the actual checks succeed.

${product === 'teams' ? `Progress steps for Teams:
1. Sign in: before Part 1.
2. Install the app: before Part 2's install (its sections 1 and 2).
3. Connect the workspace: before Part 2's sign-in (its section 3).
4. Choose what to share: before Part 2's defaults (its section 4). Report
   waiting while the user decides about an existing sharing mode.
5. Check everything works: before Part 2's final verification, continuing
   through all of Part 3. Keep step 5 working or waiting until Part 3 proves a
   live round trip; only then PATCH step: 5, state: complete. A self-verified
   read path without a teammate is not completion.` : `Progress steps for Flows:
1. Sign in: before Part 1.
2. Choose the flow/repository: before Part 2's section 1 (through section 2,
   and Part 3 for a custom flow).
3. Connect tools: before Part 2's section 3.
4. Activate the flow: before Part 2's section 4.
5. Verify the listening state: before Part 2's section 5. After its checks
   succeed, PATCH step: 5, state: complete.`}

On HTTP 409, GET current progress and reconcile; never overwrite newer progress
or regress a step. If a PATCH response is lost, GET before retrying. If a step is
already complete, verify the actual account/app/flow state before continuing;
progress reports alone are not proof that setup succeeded. On 429, honor
Retry-After. Retry transient network/5xx failures with bounded backoff. On 404,
stop reporting (the session expired or the token is invalid) and tell the user;
do not recreate or switch their session silently. A progress service outage
must not roll back working setup or cause duplicate installation/activation.
${product === 'flows' ? flowsWebInput : ''}`;
  return header + parts
    .map((part, index) => `\n---\n\n# Part ${index + 1}: ${part.label}\n\n${forEnvironment(SETUP_SKILLS[part.skill], site, cloud).trim()}\n`)
    .join('');
}

const signupParts: Record<AgentSignupProduct, readonly { label: string; skill: string }[]> = {
  teams: [
    { label: 'Cloud account', skill: 'signing-in-to-agent-relay-cloud' },
    { label: 'Desktop', skill: 'setting-up-agent-relay-desktop' },
    { label: 'Sessions', skill: 'setting-up-agent-relay-sessions' },
  ],
  flows: [
    { label: 'Cloud account', skill: 'signing-in-to-agent-relay-cloud' },
    { label: 'Flows', skill: 'setting-up-agent-relay-flows' },
    { label: 'Custom flow authoring', skill: 'writing-relayflows' },
  ],
};

const PRODUCTION_SITE = 'https://agentrelay.com';

const DESKTOP_RELEASES = 'https://github.com/AgentWorkforce/relay-desktop-releases/releases/latest/download';

/**
 * The skills name production. A local stack substitutes its own exact origins
 * and, so the desktop commands run as written, the prebuilt Agent Relay Dev
 * app's download, app name, bundle id and socket paths.
 */
function forEnvironment(skill: string | undefined, site: string, cloud: string): string {
  if (skill === undefined) throw new Error('A signup part names a skill that is not vendored');
  if (site === PRODUCTION_SITE && cloud === `${PRODUCTION_SITE}/cloud`) return skill;
  return skill
    .replaceAll(DESKTOP_RELEASES, `${site}/cloud/desktop-downloads`)
    .replaceAll('AgentRelay-macOS-', 'AgentRelay-Dev-macOS-')
    .replaceAll('Agent Relay.app', 'Agent Relay Dev.app')
    .replace(/com\.agentrelay\.desktop(?!\.dev)/g, 'com.agentrelay.desktop.dev')
    .replace(/\.agentworkforce\/desktop\/relay-socket(?!\.dev)/g, '.agentworkforce/desktop/relay-socket.dev')
    .replaceAll(`${PRODUCTION_SITE}/cloud`, cloud)
    .replaceAll(PRODUCTION_SITE, site);
}

function localDevelopmentNote(product: AgentSignupProduct, site: string): string {
  return `

This is a local development stack. The skills' production URLs have been
replaced with the origins above.${product === 'teams' ? ` Part 2's macOS commands have also been
rewritten for the prebuilt Agent Relay Dev app served by the local stack, so run
them as written: they download
${site}/cloud/desktop-downloads/AgentRelay-Dev-macOS-<arch>.dmg and the same URL
plus .sha256 (arm64 or x64), install Agent Relay Dev.app, require bundle id
com.agentrelay.desktop.dev, and use the socket pointer
~/.agentworkforce/desktop/relay-socket.dev. Use only those Dev paths for every
socket lookup in Parts 2 and 3. The local stack serves only the macOS Dev app:
on Linux, stop and report that no local desktop artifact exists. If the DMG or
its checksum is unavailable, stop and report the missing prebuilt artifact.
Do not build it, run the development launcher to produce it, or switch to a
production download.` : ''}`;
}

const flowsWebInput = `
## Web input — ask on the signup page, never in chat

When a repository, workflow, trigger, approver, or confirmation is missing,
use the Progress API to show the question in the user's original signup tab.
Do not ask the user to answer in your chat. Do not operate the page yourself.
Only request non-secret choices; never ask for passwords, OAuth codes, API keys,
or sensitive personal data through this endpoint. Sign-in and provider consent stay on
their own approval pages, opened for the user as described above.

First PATCH the current progress step to state: waiting using its latest
revision. Then POST the exact Progress API URL with Authorization: Bearer
<Progress token> and Content-Type: application/json:

~~~json
{"key":"repository","label":"Which owner/repository should this flow use?","type":"text"}
~~~

For a choice list use type: select and options, for example:

~~~json
{"key":"flow_kind","label":"A prebuilt flow from the catalog, or a custom flow?","type":"select","options":["prebuilt","custom"]}
~~~

Keys are stable lowercase identifiers (up to 40 characters); labels are at
most 160 characters. Ask one question at a time. The response has
inputRequest.id, the current progress step, and status: pending. Repeating the same key is idempotent;
a different question while one is pending returns 409 input_pending.
The original browser tab can answer; a read-only watcher link cannot.
Do not include answers in progress PATCH bodies or in final chat output.

If the user explicitly chooses to save an inactive preview, verify the draft
through GET /api/v1/flows/listeners/<agentId>, then POST a non-interactive
notice to the same Progress API URL. Use type: notice, a concise label, and
actionHref set only to /dashboard/workflows/listeners/<agentId> (a UUID). The
page will show a preview link and say activation is still pending. Notices
cannot collect answers and must not be used to claim an inactive draft is a
completed signup:

~~~json
{"key":"draft_saved","label":"Your Flow is saved as an inactive preview. It will not run until activated.","type":"notice","actionHref":"/dashboard/workflows/listeners/537e4857-5590-42e8-8731-66441b466542"}
~~~

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
`;
