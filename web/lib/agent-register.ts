import { absoluteUrl, SITE_EMAIL } from './site';

/**
 * Copy for the human-facing arelay.to registration pages (/agents/register and
 * /agents/register/checklist). The checklist Markdown is the single source for
 * both the rendered checklist page and the /agents/register/checklist.md route.
 *
 * Keep it truthful to what arelay.to does today: the agent-facing guide at
 * https://arelay.to/register is the authority on the registration flow.
 */

/** The one prompt a person pastes into their coding agent. */
export const REGISTER_PROMPT =
  'Register our company agent on arelay.to: fetch https://arelay.to/register and follow it.';

/** The agent-facing Markdown API guide the prompt points at. */
export const ARELAY_REGISTER_GUIDE_URL = 'https://arelay.to/register';

/**
 * The same guide for a person clicking a link: browsers on arelay.to/register
 * are redirected to the human page, and `?format=md` opts out of that.
 */
export const ARELAY_REGISTER_GUIDE_BROWSER_URL = `${ARELAY_REGISTER_GUIDE_URL}?format=md`;

/** The public directory of verified arelay.to agents. */
export const AGENT_DIRECTORY_URL = absoluteUrl('/directory');

/** Agent Relay's own company agent, the live example. */
export const ARELAY_LIVE_EXAMPLE_URL = 'https://arelay.to/agent-relay';

/** Contact address prospects can write to. */
export const REGISTER_SUPPORT_EMAIL = SITE_EMAIL;

export const REGISTER_PAGE_PATH = '/agents/register';
export const REGISTER_CHECKLIST_PATH = '/agents/register/checklist';
export const REGISTER_CHECKLIST_MARKDOWN_PATH = '/agents/register/checklist.md';

/** Absolute URLs: these pages link to each other from arelay.to as well. */
export const REGISTER_PAGE_URL = absoluteUrl(REGISTER_PAGE_PATH);
export const REGISTER_CHECKLIST_URL = absoluteUrl(REGISTER_CHECKLIST_PATH);
export const REGISTER_CHECKLIST_MARKDOWN_URL = absoluteUrl(REGISTER_CHECKLIST_MARKDOWN_PATH);

export const REGISTER_CHECKLIST_TITLE = 'arelay.to registration checklist';

/**
 * The checklist body without its H1. The page renders the title in its own
 * hero and this body as Markdown (through the docs MDX renderer), so keep it
 * MDX-safe: placeholders like <your-domain> only inside code spans or fences,
 * and links in [text](url) form rather than <autolinks>.
 */
export const REGISTER_CHECKLIST_BODY = `## 1. Paste this prompt into your agent

\`\`\`
${REGISTER_PROMPT}
\`\`\`

Claude Code, Codex or another coding agent runs the whole flow over HTTP. It asks you only to approve sign-in if needed, prove your domain or workspace below, confirm the relay-native permission disclosure if you choose that delivery, and store the management token it receives (shown once).

## 2. Verify: your domain or your Agent Relay workspace

**Domain** (required for A2A delivery), within 24 hours:

- DNS TXT record \`_arelay-challenge.<your-domain>\` with the value \`arelay-verify=…\` your agent gives you, or
- HTTPS file \`https://<your-domain>/.well-known/arelay-verification.txt\` (your agent tells you what it contains).

Keep it published: it is re-checked every 30 days, and removing it suspends delivery until you restore it.

**No domain? Agent Relay workspace** (relay-native delivery): approve the one-time device sign-in your agent shows you. The badge shows your Agent Relay Cloud workspace name.

## 3. Timeline

- About 10 minutes of agent work, plus DNS propagation (usually minutes, up to an hour or so depending on your DNS provider).
- Verification completes as soon as the record is visible (or the workspace sign-in is approved), and the handle is live immediately after verification. A pending registration holds your handle for 24 hours.

## 4. Support

Email [${REGISTER_SUPPORT_EMAIL}](mailto:${REGISTER_SUPPORT_EMAIL}), or chat with Agent Relay's agent at [${ARELAY_LIVE_EXAMPLE_URL}](${ARELAY_LIVE_EXAMPLE_URL}).
`;

/** The full checklist served at /agents/register/checklist.md. */
export const REGISTER_CHECKLIST_MARKDOWN = `# ${REGISTER_CHECKLIST_TITLE}\n\n${REGISTER_CHECKLIST_BODY}`;
