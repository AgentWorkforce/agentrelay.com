// Server-only access to the gated self-hosting docs at /docs/self-hosting.
//
// The runbook text is never part of this repository or its build output: it
// lives in relay-agent's knowledge/private/selfhost (the same files the
// support agent reads). On each request the page forwards only the reader's
// Agent Relay Cloud session cookie, server to server, to Cloud's
// GET /cloud/api/v1/me/selfhost-docs. Cloud verifies the session, reads the
// organization's staff-granted self-host entitlement fresh, and only then
// fetches the runbooks from relay-agent over its private service binding.
//
// The session value is never logged, rendered, or handed to a client component.

/** Cloud's browser session cookie. Production sets it on Domain=.agentrelay.com, Path=/. */
export const CLOUD_SESSION_COOKIE = 'agent_relay_session';

export const SELFHOST_DOCS_BASE_PATH = '/docs/self-hosting';

/** The public OCI location of the chart the runbooks install. */
export const SELFHOST_HELM_CHART = 'oci://ghcr.io/agentworkforce/charts/agent-relay';
export const SELFHOST_HELM_CHART_SOURCE = 'https://github.com/AgentWorkforce/helm-charts/tree/main/charts/agent-relay';

/** The hosted MCP that carries `ask_customer_support`, the guided-install agent. */
export const CLOUD_MCP_URL = 'https://agentrelay.com/cloud/api/v1/mcp/shared-sessions';
export const GUIDED_INSTALL_DOC = 'guided-gke-install';

export const SELFHOST_ACCESS_EMAIL = 'founders@agentrelay.com';

/**
 * Headers for every gated response, signed in or not. `private, no-store`
 * keeps the Cloudflare edge, OpenNext and the browser from storing a page that
 * belongs to one reader; the rest keeps it out of indexes and other sites.
 * Applied in next.config.mjs (asserted by lib/test/selfhost-docs.test.ts).
 */
export const SELFHOST_DOCS_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
};

const DOC_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
// RFC 6265 cookie-octet; Cloud's session is a JWT, well under this bound.
const SESSION_PATTERN = /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]{16,4096}$/;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 512_000;

export type SelfhostDocSummary = { name: string; title: string; description: string };
export type SelfhostDoc = SelfhostDocSummary & { markdown: string };

export type SelfhostDocsResult =
  | { kind: 'unauthenticated' }
  | { kind: 'forbidden' }
  | { kind: 'unavailable' }
  | { kind: 'not_found'; docs: SelfhostDocSummary[] }
  | { kind: 'ok'; docs: SelfhostDocSummary[]; doc?: SelfhostDoc };

/** `[]` or `['<doc>']` from the optional catch-all; anything else is not a docs path. */
export function parseSelfhostSlug(slug: string[] | undefined): { doc?: string } | null {
  if (!slug || slug.length === 0) return {};
  if (slug.length === 1 && DOC_PATTERN.test(slug[0])) return { doc: slug[0] };
  return null;
}

export function selfhostDocPath(doc?: string): string {
  return doc ? `${SELFHOST_DOCS_BASE_PATH}/${doc}` : SELFHOST_DOCS_BASE_PATH;
}

/**
 * Agent Relay sign-in that comes back to this page. Cloud only returns to
 * local Cloud paths, so the OAuth callback lands on /cloud/docs/self-hosting/…
 * and Cloud's return hop redirects to the same path on the docs site.
 */
export function selfhostLoginHref(doc?: string): string {
  return `/login?${new URLSearchParams({ next: selfhostDocPath(doc) }).toString()}`;
}

export function validCloudSession(value: string | undefined): value is string {
  return typeof value === 'string' && SESSION_PATTERN.test(value);
}

/**
 * Where the docs server reaches Cloud. Production goes through the
 * agentrelay.com front door (a Custom Domain, so a same-zone Worker
 * subrequest reaches the router, which forwards /cloud* to Cloud).
 */
export function cloudApiOrigin(): string {
  const configured = process.env.SELFHOST_DOCS_CLOUD_ORIGIN?.trim();
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      throw new Error('SELFHOST_DOCS_CLOUD_ORIGIN must be https (or a loopback origin for local tests)');
    }
    return url.origin;
  }
  return 'https://agentrelay.com';
}

function isSummary(value: unknown): value is SelfhostDocSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const { name, title, description } = value as Record<string, unknown>;
  return typeof name === 'string' && DOC_PATTERN.test(name) &&
    typeof title === 'string' && title.length > 0 && typeof description === 'string';
}

function parseDocs(value: unknown): SelfhostDocSummary[] | null {
  if (!Array.isArray(value) || !value.every(isSummary)) return null;
  return value.map(({ name, title, description }) => ({ name, title, description }));
}

async function readBounded(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error('selfhost docs response too large');
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

/**
 * Ask Cloud for the runbook index (and one runbook when `doc` is set) on the
 * reader's behalf. Only the session cookie is forwarded; any failure other
 * than a definite 401/403/404 is `unavailable`, never content.
 */
export async function fetchSelfhostDocs(
  session: string | undefined,
  doc: string | undefined,
  fetcher: typeof globalThis.fetch = globalThis.fetch,
): Promise<SelfhostDocsResult> {
  if (!validCloudSession(session)) return { kind: 'unauthenticated' };
  if (doc !== undefined && !DOC_PATTERN.test(doc)) return { kind: 'unavailable' };
  try {
    // Inside the try: a misconfigured origin is "unavailable", never a 500.
    const url = new URL('/cloud/api/v1/me/selfhost-docs', cloudApiOrigin());
    if (doc) url.searchParams.set('doc', doc);
    const response = await fetcher(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      redirect: 'manual',
      headers: { accept: 'application/json', cookie: `${CLOUD_SESSION_COOKIE}=${session}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.status === 401) {
      await response.body?.cancel();
      return { kind: 'unauthenticated' };
    }
    if (response.status === 403) {
      await response.body?.cancel();
      return { kind: 'forbidden' };
    }
    if (response.status !== 200 && response.status !== 404) {
      await response.body?.cancel();
      return { kind: 'unavailable' };
    }
    const value: unknown = JSON.parse(await readBounded(response));
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { kind: 'unavailable' };
    const body = value as Record<string, unknown>;
    if (body.entitled !== true) return { kind: 'unavailable' };
    const docs = parseDocs(body.docs);
    if (!docs) return { kind: 'unavailable' };
    if (response.status === 404) return { kind: 'not_found', docs };
    if (!doc) return { kind: 'ok', docs };
    const raw = body.doc;
    if (!isSummary(raw) || raw.name !== doc) return { kind: 'unavailable' };
    const { markdown } = raw as SelfhostDocSummary & { markdown?: unknown };
    if (typeof markdown !== 'string') return { kind: 'unavailable' };
    return { kind: 'ok', docs, doc: { name: raw.name, title: raw.title, description: raw.description, markdown } };
  } catch {
    return { kind: 'unavailable' };
  }
}

/** Reading order for the sidebar; runbooks this list does not know follow in Cloud's order. */
const DOC_ORDER = [
  'gke-install-runbook',
  'guided-gke-install',
  'upgrades',
  'backup-and-restore',
  'telemetry-levels',
  'durable-actors-mode',
  'troubleshooting',
  'eks-install',
  'support-and-escalation',
];

export function orderSelfhostDocs(docs: SelfhostDocSummary[]): SelfhostDocSummary[] {
  const rank = (name: string) => {
    const index = DOC_ORDER.indexOf(name);
    return index === -1 ? DOC_ORDER.length : index;
  };
  return docs
    .map((doc, index) => ({ doc, index }))
    .sort((a, b) => rank(a.doc.name) - rank(b.doc.name) || a.index - b.index)
    .map(({ doc }) => doc);
}
