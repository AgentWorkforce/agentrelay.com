/**
 * Per-agent webhook inboxes for the /mcp-events-shim page.
 *
 * One inbox wakes exactly one agent session, so the page keeps a separate inbox
 * for each agent tab instead of showing one inbox's command under every tab.
 * Everything here is pure (no `window`, no storage) so it can be unit-tested;
 * the component reads and writes localStorage and the page fragment around it.
 */

export const AGENT_IDS = ['claude-code', 'codex', 'cursor', 'opencode', 'muse', 'gemini', 'grok', 'devin', 'other'] as const;
export type AgentId = (typeof AGENT_IDS)[number];
export const DEFAULT_AGENT: AgentId = 'claude-code';

/** The single inbox the page kept before inboxes were per agent. Read once, then migrated. */
export const LEGACY_STORAGE_KEY = 'agent-relay-events-shim';
/** `{ version: 1, selected, inboxes: { [agentId]: Session } }`. */
export const STORAGE_KEY = 'agent-relay-events-shim-inboxes';

export interface Session {
  /** Capability for the feed, rotate and secrets. Kept only in this browser and the page link. */
  manageToken: string;
  mcpUrl: string;
}

export type Inboxes = Partial<Record<AgentId, Session>>;

export interface Store {
  selected: AgentId;
  inboxes: Inboxes;
}

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function isAgentId(value: unknown): value is AgentId {
  return typeof value === 'string' && (AGENT_IDS as readonly string[]).includes(value);
}

/**
 * The MCP URL this page's API issues: `<api>/t/esm_<43>/mcp` on the API's own origin.
 *
 * @param apiBase - The events-shim API as an absolute URL (resolved against the page origin).
 */
export function isOurMcpUrl(value: string, apiBase: string): boolean {
  try {
    const url = new URL(value);
    const api = new URL(apiBase);
    const prefix = `${api.pathname.replace(/\/$/, '')}/t/esm_`;
    if (url.origin !== api.origin || url.search || url.hash || url.username || url.password) return false;
    if (!url.pathname.startsWith(prefix) || !url.pathname.endsWith('/mcp')) return false;
    return TOKEN.test(url.pathname.slice(prefix.length, -'/mcp'.length));
  } catch {
    return false;
  }
}

export function isSession(value: unknown, apiBase: string): value is Session {
  if (!value || typeof value !== 'object') return false;
  const { manageToken, mcpUrl } = value as Record<string, unknown>;
  return (
    typeof manageToken === 'string' &&
    manageToken.startsWith('esk_') &&
    TOKEN.test(manageToken.slice(4)) &&
    typeof mcpUrl === 'string' &&
    isOurMcpUrl(mcpUrl, apiBase)
  );
}

/** Only the two fields, so nothing else from storage or a link rides along. */
const pick = (session: Session): Session => ({ manageToken: session.manageToken, mcpUrl: session.mcpUrl });

/**
 * Reads the page link fragment `#k=<manage token>&m=<mcp url>&a=<agent>`.
 *
 * A page link can be crafted by anyone: only an inbox this page's API issues is
 * accepted, so a link cannot make the page show someone else's command to copy
 * and run. An unknown or missing `a` is ignored (old links open on the default tab).
 */
export function parseFragment(hash: string, apiBase: string): { session: Session | null; agentId: AgentId | null } {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const candidate = { manageToken: params.get('k'), mcpUrl: params.get('m') };
  const agent = params.get('a');
  return {
    session: isSession(candidate, apiBase) ? pick(candidate) : null,
    agentId: isAgentId(agent) ? agent : null,
  };
}

/** The fragment for the selected tab: its inbox (if any) and the tab itself. */
export function fragmentFor(agentId: AgentId, session: Session | null): string {
  const params = new URLSearchParams();
  if (session) {
    params.set('k', session.manageToken);
    params.set('m', session.mcpUrl);
  }
  params.set('a', agentId);
  return params.toString();
}

/** Parses the stored map, dropping anything malformed instead of failing the page. */
export function parseStore(raw: string | null, apiBase: string): Store {
  const empty: Store = { selected: DEFAULT_AGENT, inboxes: {} };
  if (!raw) return empty;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (!value || typeof value !== 'object') return empty;
  const { selected, inboxes } = value as Record<string, unknown>;
  const store: Store = { selected: isAgentId(selected) ? selected : DEFAULT_AGENT, inboxes: {} };
  if (inboxes && typeof inboxes === 'object') {
    for (const [agentId, session] of Object.entries(inboxes as Record<string, unknown>)) {
      if (isAgentId(agentId) && isSession(session, apiBase)) store.inboxes[agentId] = pick(session);
    }
  }
  return store;
}

export function serializeStore(store: Store): string {
  return JSON.stringify({ version: 1, selected: store.selected, inboxes: store.inboxes });
}

/**
 * Puts `session` under `agentId` (or clears that tab with `null`). An inbox
 * belongs to one tab only: the same inbox under a second tab would read as two
 * agents sharing it, which is exactly the setup that leaves one of them unwoken.
 */
export function withInbox(store: Store, agentId: AgentId, session: Session | null): Store {
  const inboxes: Inboxes = {};
  for (const id of AGENT_IDS) {
    const current = store.inboxes[id];
    if (!current || id === agentId) continue;
    if (session && current.manageToken === session.manageToken) continue;
    inboxes[id] = current;
  }
  if (session) inboxes[agentId] = pick(session);
  return { ...store, inboxes };
}

/**
 * Clears `agentId`'s inbox only if it is still `manageToken`, so a late 404 for
 * an inbox the tab has since replaced cannot clear the new one.
 */
export function withoutInbox(store: Store, agentId: AgentId, manageToken: string): Store {
  return store.inboxes[agentId]?.manageToken === manageToken ? withInbox(store, agentId, null) : store;
}

export interface Restored {
  store: Store;
  /** True when the legacy single inbox was moved into the map and its key can be removed. */
  legacyMigrated: boolean;
}

/**
 * Works out the page's inboxes and selected tab on load.
 *
 * - The tab comes from the link's `a`, else the tab last selected in this browser, else the default.
 * - A valid inbox in the link opens on that tab (a shared or bookmarked link wins over storage).
 * - The legacy single inbox moves under the tab that is active now, so existing users keep it;
 *   if that tab already holds another inbox it goes to the default tab when that is free, else stays put.
 */
export function restore(input: { hash: string; stored: string | null; legacy: string | null; apiBase: string }): Restored {
  const { apiBase } = input;
  const fromLink = parseFragment(input.hash, apiBase);
  let store = parseStore(input.stored, apiBase);
  const selected = fromLink.agentId ?? (fromLink.session ? DEFAULT_AGENT : store.selected);
  store = { ...store, selected };

  let legacyMigrated = false;
  let legacy: unknown = null;
  try {
    legacy = JSON.parse(input.legacy || 'null');
  } catch {
    legacy = null;
  }
  if (input.legacy !== null && !isSession(legacy, apiBase)) {
    // Unreadable leftovers: nothing to keep.
    legacyMigrated = true;
  } else if (isSession(legacy, apiBase)) {
    const alreadyKept = Object.values(store.inboxes).some((session) => session?.manageToken === legacy.manageToken);
    if (alreadyKept) {
      legacyMigrated = true;
    } else {
      // The link's inbox is about to take the selected tab; don't park the legacy one there to be overwritten.
      const reserved = fromLink.session && fromLink.session.manageToken !== legacy.manageToken ? selected : null;
      const target = [selected, DEFAULT_AGENT].find((id) => id !== reserved && !store.inboxes[id]);
      if (target) {
        store = withInbox(store, target, legacy);
        legacyMigrated = true;
      }
    }
  }

  if (fromLink.session) store = withInbox(store, selected, fromLink.session);
  return { store, legacyMigrated };
}
