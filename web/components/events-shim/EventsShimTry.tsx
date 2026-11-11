'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { teamsCloudUrl } from '../../lib/teams-cloud';
import { CodeBlock, CopyButton } from './CodeBlock';
import s from './events-shim.module.css';

/** Mounted by Agent Relay Cloud; see `@agent-relay/events-shim`. */
const API = teamsCloudUrl('/api/v1/events-shim');
const STORAGE_KEY = 'agent-relay-events-shim';
const POLL_MS = 3000;

type Mode = 'open' | 'github' | 'stripe' | 'linear' | 'bearer';
type SecretMode = Exclude<Mode, 'open'>;

interface Session {
  /** Capability for the feed, rotate and secrets. Kept only in this browser and the page link. */
  manageToken: string;
  mcpUrl: string;
}

interface FeedEvent {
  id: string;
  seq: number;
  received_at: string;
  mode: Mode;
  event_type: string | null;
  content_type: string;
  body: string;
  delivery: 'sending' | 'woken' | 'pending' | 'read';
  wake_error: string | null;
}

interface Feed {
  webhook_urls: Record<Mode, string>;
  secrets_set: Record<SecretMode, boolean>;
  agent: { connected: boolean; last_seen_at: string | null; wake: 'linked' | 'broken' | 'none'; wake_error: string | null };
  expires_at: string;
  events: FeedEvent[];
}

const AGENTS = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    command: (url: string) => `claude mcp add --transport http webhooks ${shellQuote(url)}`,
    wakes: true,
  },
  {
    id: 'codex',
    label: 'Codex',
    command: (url: string) => `codex mcp add webhooks --url ${shellQuote(url)}`,
    wakes: true,
  },
  {
    id: 'cursor',
    label: 'Cursor',
    note: 'Add to ~/.cursor/mcp.json',
    command: (url: string) => JSON.stringify({ mcpServers: { webhooks: { url } } }, null, 2),
    wakes: false,
  },
  {
    id: 'opencode',
    label: 'opencode',
    note: 'Add to opencode.json',
    command: (url: string) => JSON.stringify({ mcp: { webhooks: { type: 'remote', url } } }, null, 2),
    wakes: true,
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    command: (url: string) => `gemini mcp add --transport http webhooks ${shellQuote(url)}`,
    wakes: false,
  },
  {
    id: 'other',
    label: 'Any MCP client',
    note: 'Streamable HTTP, no authentication',
    command: (url: string) => url,
    wakes: false,
  },
] as const;

const MODES: { id: Mode; label: string; help: string }[] = [
  { id: 'open', label: 'Open', help: 'Anyone with the URL can post. Limits still apply.' },
  { id: 'github', label: 'GitHub', help: 'Paste this URL as the Payload URL (content type application/json) and the same secret you set in GitHub.' },
  { id: 'stripe', label: 'Stripe', help: 'Add this URL as a Stripe endpoint, then paste its signing secret (whsec_…).' },
  { id: 'linear', label: 'Linear', help: 'Add this URL as a Linear webhook, then paste its signing secret.' },
  { id: 'bearer', label: 'Bearer token', help: 'Senders include Authorization: Bearer <token>. Generate one below; it is shown once.' },
];

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** The MCP URL this page's API issues: `<api>/t/esm_<43>/mcp` on the API's own origin. */
function isOurMcpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const api = new URL(API, window.location.origin);
    const prefix = `${api.pathname.replace(/\/$/, '')}/t/esm_`;
    if (url.origin !== api.origin || url.search || url.hash || url.username || url.password) return false;
    if (!url.pathname.startsWith(prefix) || !url.pathname.endsWith('/mcp')) return false;
    return TOKEN.test(url.pathname.slice(prefix.length, -'/mcp'.length));
  } catch {
    return false;
  }
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const { manageToken, mcpUrl } = value as Record<string, unknown>;
  return (
    typeof manageToken === 'string' &&
    manageToken.startsWith('esk_') &&
    TOKEN.test(manageToken.slice(4)) &&
    typeof mcpUrl === 'string' &&
    isOurMcpUrl(mcpUrl)
  );
}

/** One shell word, whatever it contains. */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function readSession(): Session | null {
  try {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // A page link can be crafted by anyone: accept only what this page's API issues,
    // so a link cannot make the page show someone else's command to copy and run.
    const fromHash = { manageToken: hash.get('k'), mcpUrl: hash.get('m') };
    if (isSession(fromHash)) return fromHash;
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (isSession(saved)) return saved;
  } catch {
    /* Storage can be unavailable; the page still works for this tab. */
  }
  return null;
}

function saveSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Best effort. */
  }
  const url = new URL(window.location.href);
  url.hash = session ? new URLSearchParams({ k: session.manageToken, m: session.mcpUrl }).toString() : '';
  window.history.replaceState(null, '', url.toString());
}

function relative(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return new Date(iso).toLocaleString();
}

function prettyBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

async function api(path: string, init: RequestInit & { token?: string } = {}): Promise<Response> {
  const { token, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (rest.body) headers.set('content-type', 'application/json');
  return fetch(`${API}${path}`, { ...rest, headers, cache: 'no-store' });
}

export function EventsShimTry() {
  const [session, setSession] = useState<Session | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<(typeof AGENTS)[number]['id']>('claude-code');
  const [mode, setMode] = useState<Mode>('open');
  const [secretDraft, setSecretDraft] = useState('');
  const [bearerToken, setBearerToken] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const restored = readSession();
    // Keep the page link (fragment) in step with an inbox restored from this browser,
    // so copying or bookmarking the address still opens it.
    if (restored) saveSession(restored);
    setSession(restored);
    setReady(true);
  }, []);

  const load = useCallback(
    async (current: Session, signal: AbortSignal) => {
      const response = await api('/shims/current', { token: current.manageToken, signal });
      // A late answer for an inbox this page has since left must not touch the current one.
      if (signal.aborted) return;
      if (response.status === 404) {
        saveSession(null);
        setSession(null);
        setFeed(null);
        setError('That webhook expired or the link was replaced. Create a new one.');
        return;
      }
      if (!response.ok) throw new Error(`Feed unavailable (HTTP ${response.status}).`);
      const next = (await response.json()) as Feed;
      if (signal.aborted) return;
      setFeed(next);
      setError(null);
    },
    [],
  );

  useEffect(() => {
    if (!session) return;
    let stopped = false;
    const controller = new AbortController();
    const tick = async () => {
      if (document.visibilityState === 'visible') {
        try {
          await load(session, controller.signal);
        } catch (failure) {
          if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Feed unavailable.');
        }
      }
      if (!stopped) timer.current = setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      stopped = true;
      controller.abort();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [session, load]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const response = await api('/shims', { method: 'POST' });
      if (response.status === 429) throw new Error('Too many webhooks from this network. Try again later.');
      if (!response.ok) throw new Error('Could not create a webhook. Please try again.');
      const created = (await response.json()) as { manage_token: string; mcp_url: string };
      const next = { manageToken: created.manage_token, mcpUrl: created.mcp_url };
      saveSession(next);
      setSession(next);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not create a webhook.');
    } finally {
      setBusy(false);
    }
  }

  async function rotate() {
    if (!session || !window.confirm('Replace the webhook URL? The old URL stops working immediately. Your agent keeps watching.')) return;
    setBusy(true);
    try {
      const response = await api('/shims/current/rotate', { method: 'POST', token: session.manageToken });
      if (!response.ok) throw new Error('Could not replace the URL.');
      setFeed((await response.json()) as Feed);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not replace the URL.');
    } finally {
      setBusy(false);
    }
  }

  async function saveSecret(target: SecretMode, value: string | null | undefined) {
    if (!session) return;
    setBusy(true);
    try {
      const response = await api(`/shims/current/secrets/${target}`, {
        method: 'PUT',
        token: session.manageToken,
        body: JSON.stringify(value === undefined ? {} : { secret: value }),
      });
      const body = (await response.json()) as { secret?: string; message?: string };
      if (!response.ok) throw new Error(body.message || 'Could not save the secret.');
      if (body.secret) setBearerToken(body.secret);
      setSecretDraft('');
      await load(session, new AbortController().signal);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save the secret.');
    } finally {
      setBusy(false);
    }
  }

  const agent = AGENTS.find((candidate) => candidate.id === agentId)!;
  const modeInfo = MODES.find((candidate) => candidate.id === mode)!;
  const hookUrl = feed?.webhook_urls[mode] ?? '';
  const curl = useMemo(() => {
    const lines = [`curl -X POST '${hookUrl}'`, `  -H 'Content-Type: application/json'`, `  -H 'Idempotency-Key: demo-1'`];
    // Never put the live token in a copyable command: it would land in shell history
    // and process listings. Senders read it from the environment.
    if (mode === 'bearer') lines.push(`  -H "Authorization: Bearer $WEBHOOK_TOKEN"`);
    lines.push(`  -d '{"hello":"from curl"}'`);
    return lines.join(' \\\n');
  }, [hookUrl, mode]);

  const status = !feed
    ? null
    : !feed.agent.connected
      ? { tone: 'idle', text: 'No agent connected yet' }
      : feed.agent.wake === 'linked'
        ? { tone: 'live', text: 'Agent connected · posts wake it, even when idle' }
        : feed.agent.wake === 'broken'
          ? { tone: 'warn', text: `Agent connected · wake link stopped working${feed.agent.wake_error ? ` (${feed.agent.wake_error})` : ''}` }
          : { tone: 'wait', text: 'Agent connected · it reads posts with wait_for_webhook' };

  return (
    <main className={`${s.main} ph-sensitive`}>
      <section className={s.hero}>
        <p className={s.eyebrow}>Agent Relay · MCP events shim</p>
        <h1 className={s.headline}>
          Connect your agent, then <em>post</em>.
        </h1>
        <p className={s.lead}>
          One MCP server, one webhook URL. Every post is delivered into your agent&apos;s session through Agent Relay, so an{' '}
          <strong>idle agent wakes up</strong> and acts on it. No polling loop, no restarts.
        </p>
        <p className={s.crossLink}>
          Building your own MCP? <Link href="/mcp-events-shim/api">Use our API to wake agents with your own messages →</Link>
        </p>
        {ready && !session && (
          <div className={s.start}>
            <button type="button" className={s.primary} onClick={create} disabled={busy}>
              {busy ? 'Creating…' : 'Get my webhook'}
            </button>
            <p className={s.helper}>No sign-up. The page link becomes yours: anyone holding it can connect an agent and read posts.</p>
          </div>
        )}
        {error && <p className={s.error} role="alert">{error}</p>}
      </section>

      {session && (
        <>
          <section className={s.section}>
            <h2 className={s.sectionTitle}>
              <span className={s.numeral}>i</span> Connect your agent
            </h2>
            <div className={s.tabs} role="tablist" aria-label="Agent">
              {AGENTS.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  role="tab"
                  aria-selected={candidate.id === agentId}
                  className={candidate.id === agentId ? s.tabActive : s.tab}
                  onClick={() => setAgentId(candidate.id)}
                >
                  {candidate.label}
                </button>
              ))}
            </div>
            {'note' in agent && agent.note && <p className={s.note}>{agent.note}</p>}
            <CodeBlock code={agent.command(session.mcpUrl)} />
            <p className={s.ask}>
              Then ask your agent: <q>Watch for webhooks and tell me when one arrives.</q>
            </p>
            <ul className={s.bullets}>
              {agent.wakes ? (
                <>
                  <li>
                    With <Link href="/download">Agent Relay</Link> running, the agent links its own session (one command it runs itself) and
                    each post is injected into the session, waking it within seconds, even when idle.
                  </li>
                  <li>Without Agent Relay, the agent keeps a background <code>wait_for_webhook</code> call open and wakes when it returns.</li>
                </>
              ) : (
                <>
                  <li>The agent keeps a background <code>wait_for_webhook</code> call open; it returns as soon as a post arrives.</li>
                  <li>
                    Clients that can&apos;t run tools in the background see new posts on their next <code>get_webhook_events</code> call.
                  </li>
                </>
              )}
              <li>
                Posts to the open URL reach the agent marked as untrusted data, never as instructions. A{' '}
                <code>text/plain</code> post to a verified URL (bearer, GitHub, Stripe, Linear) is delivered verbatim, so only
                senders holding that secret can choose the agent&apos;s words. A signed provider URL wraps a JSON body as
                data whatever its header says.
              </li>
            </ul>
            {status && <p className={`${s.status} ${s[`status_${status.tone}`]}`}>{status.text}</p>}
          </section>

          <section className={s.section}>
            <h2 className={s.sectionTitle}>
              <span className={s.numeral}>ii</span> Post to your webhook URL
            </h2>
            <div className={s.tabs} role="tablist" aria-label="Verification">
              {MODES.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  role="tab"
                  aria-selected={candidate.id === mode}
                  className={candidate.id === mode ? s.tabActive : s.tab}
                  onClick={() => {
                    setMode(candidate.id);
                    setSecretDraft('');
                  }}
                >
                  {candidate.label}
                </button>
              ))}
            </div>
            <p className={s.note}>{modeInfo.help}</p>
            {feed && (
              <>
                <div className={s.urlRow}>
                  <code className={s.url}>{hookUrl}</code>
                  <CopyButton text={hookUrl} />
                  <button type="button" className={s.ghost} onClick={rotate} disabled={busy}>
                    Get a new URL
                  </button>
                </div>
                {mode !== 'open' && mode !== 'bearer' && (
                  <form
                    className={s.secretRow}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveSecret(mode, secretDraft);
                    }}
                  >
                    <input
                      className={s.input}
                      type="password"
                      autoComplete="off"
                      placeholder={feed.secrets_set[mode] ? 'Secret saved · paste to replace' : `${modeInfo.label} signing secret`}
                      value={secretDraft}
                      onChange={(event) => setSecretDraft(event.target.value)}
                    />
                    <button type="submit" className={s.ghost} disabled={busy || !secretDraft.trim()}>
                      Save secret
                    </button>
                  </form>
                )}
                {mode === 'bearer' && (
                  <div className={s.secretRow}>
                    {bearerToken ? (
                      <>
                        <code className={s.url}>{bearerToken}</code>
                        <CopyButton text={bearerToken} />
                      </>
                    ) : (
                      <span className={s.note}>{feed.secrets_set.bearer ? 'A token is set. Generating a new one replaces it.' : 'No token yet.'}</span>
                    )}
                    <button type="button" className={s.ghost} onClick={() => saveSecret('bearer', undefined)} disabled={busy}>
                      Generate token
                    </button>
                  </div>
                )}
                {(mode === 'open' || mode === 'bearer') && (
                  <>
                    <p className={s.label}>Try it</p>
                    {mode === 'bearer' && (
                      <p className={s.fine}>
                        Set <code>WEBHOOK_TOKEN</code> to your token in your shell or secret store first.
                      </p>
                    )}
                    <CodeBlock code={curl} />
                  </>
                )}
                <p className={s.fine}>
                  A retry with the same <code>Idempotency-Key</code> reaches your agent once (GitHub, Stripe and Linear retries are
                  matched by their delivery id). Getting a new URL stops the old one immediately; your agent keeps watching.
                </p>
              </>
            )}
          </section>

          <section className={s.section}>
            <h2 className={s.sectionTitle}>
              <span className={s.numeral}>iii</span> Live
            </h2>
            {!feed || feed.events.length === 0 ? (
              <p className={s.empty}>Nothing yet. Posts show up here as they arrive.</p>
            ) : (
              <ol className={s.feed}>
                {feed.events.map((event) => (
                  <li key={event.id} className={s.event}>
                    <button
                      type="button"
                      className={s.eventHead}
                      onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                      aria-expanded={expanded === event.id}
                    >
                      <span className={s.seq}>#{event.seq}</span>
                      <span className={s.eventType}>{event.event_type ?? event.mode}</span>
                      <span className={`${s.badge} ${s[`badge_${event.delivery}`]}`}>
                        {event.delivery === 'woken' ? 'woke agent' : event.delivery === 'read' ? 'read by agent' : event.delivery === 'sending' ? 'waking…' : 'waiting'}
                      </span>
                      <time className={s.time} dateTime={event.received_at}>
                        {relative(event.received_at)}
                      </time>
                    </button>
                    {expanded === event.id && (
                      <>
                        {event.wake_error && <p className={s.fine}>Wake failed: {event.wake_error}</p>}
                        <pre className={s.body}>{prettyBody(event.body)}</pre>
                      </>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className={s.limits}>
            <p>
              Limits: 60 posts per hour and 500 per day per webhook, bodies up to 64 KB. A webhook expires after 7 days without use.
              The feed keeps the last 50 posts. A tool call hands the agent at most 20 posts; the rest arrive on the next one.
            </p>
            <p>
              Why it wakes: Agent Relay delivers each post into the session itself, the same way agents message each other, so the
              agent doesn&apos;t need to be mid-turn or polling. <Link href="/download">Get Agent Relay</Link> ·{' '}
              <Link href="/mcp-events-shim/api">Use the API from your own MCP</Link> ·{' '}
              <Link href="/docs">Docs</Link>
            </p>
          </section>
        </>
      )}
    </main>
  );
}
