'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  adoptStored,
  fragmentFor,
  LEGACY_STORAGE_KEY,
  restore,
  serializeStore,
  STORAGE_KEY,
  withInbox,
  withoutInbox,
  type AgentId,
  type Session,
  type Store,
} from '../../lib/events-shim-inboxes';
import { teamsCloudUrl } from '../../lib/teams-cloud';
import { CodeBlock, CopyButton } from './CodeBlock';
import { KeepInbox } from './KeepInbox';
import s from './events-shim.module.css';

/** Mounted by Agent Relay Cloud; see `@agent-relay/events-shim`. */
const API = teamsCloudUrl('/api/v1/events-shim');
const POLL_MS = 3000;

type Mode = 'open' | 'github' | 'stripe' | 'linear' | 'bearer';
type SecretMode = Exclude<Mode, 'open'>;

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
  agent: {
    connected: boolean;
    last_seen_at: string | null;
    wake: 'linked' | 'broken' | 'none';
    wake_error: string | null;
    /** The Agent Relay agent the wake link targets. Newer hosts only; absent or null otherwise. */
    wake_agent?: string | null;
  };
  expires_at: string;
  events: FeedEvent[];
}

const RELAYFILE_SETUP = 'npx relayfile@latest setup --provider github --local-dir ./relayfile-mount';
/** relayfile hands each event to `forward` as JSON on stdin; no event field is put into the shell command. */
const relayfileListen = (webhookUrl: string) =>
  [
    "npx relayfile@latest listen --path '/github/**' --background \\",
    `  --run ${shellQuote(`npx -y @agent-relay/events-shim@latest forward --stdin --url ${shellQuote(webhookUrl)}`)}`,
  ].join('\n');

/** One command per agent CLI: adds the MCP server its own way (and the webhooks skill where the tool reads skills). */
const setupCommand = (flag: string) => (url: string) =>
  `npx @agent-relay/events-shim@latest setup ${shellQuote(url)} --${flag}`;

const NEWEST_OPEN = (label: string) => `This inbox wakes one ${label} session: the newest open one.`;

const AGENTS = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    note: 'Adds the MCP server, installs the webhooks skill and remembers the inbox.',
    oneSession:
      'This inbox wakes one Claude Code session: the one started most recently. An older session takes the posts back when you tell it “watch for webhooks”.',
    command: setupCommand('claude'),
    wakes: true,
    listener: true,
  },
  {
    id: 'codex',
    label: 'Codex',
    note: 'Adds the MCP server and the webhooks skill.',
    oneSession: NEWEST_OPEN('Codex'),
    command: setupCommand('codex'),
    wakes: true,
    listener: false,
  },
  {
    id: 'cursor',
    label: 'Cursor',
    note: 'Adds the server to ~/.cursor/mcp.json.',
    oneSession: 'This inbox wakes one Cursor session.',
    command: setupCommand('cursor'),
    wakes: false,
  },
  {
    id: 'opencode',
    label: 'opencode',
    note: 'Adds the server to opencode.json.',
    oneSession: NEWEST_OPEN('opencode'),
    command: setupCommand('opencode'),
    wakes: true,
    listener: false,
  },
  {
    id: 'muse',
    label: 'Muse',
    note: 'Adds the MCP server. Muse sessions are not woken yet; the agent reads posts when you ask.',
    oneSession: 'This inbox is for one Muse session.',
    command: setupCommand('muse'),
    wakes: false,
  },
  { id: 'gemini', label: 'Gemini CLI', oneSession: 'This inbox wakes one Gemini CLI session.', command: setupCommand('gemini'), wakes: false },
  { id: 'grok', label: 'Grok', oneSession: NEWEST_OPEN('Grok'), command: setupCommand('grok'), wakes: true, listener: false },
  { id: 'devin', label: 'Devin', oneSession: NEWEST_OPEN('Devin'), command: setupCommand('devin'), wakes: true, listener: false },
  {
    id: 'other',
    label: 'Any MCP client',
    note: 'Streamable HTTP, no authentication',
    oneSession: 'This inbox is for one MCP client and one session. Give each other client its own inbox.',
    command: (url: string) => url,
    wakes: false,
  },
] as const satisfies readonly { id: AgentId; label: string; oneSession: string; [key: string]: unknown }[];

const MODES: { id: Mode; label: string; help: string }[] = [
  { id: 'open', label: 'Open', help: 'Anyone with the URL can post. Limits still apply.' },
  { id: 'github', label: 'GitHub', help: 'Paste this URL as the Payload URL (content type application/json) and the same secret you set in GitHub.' },
  { id: 'stripe', label: 'Stripe', help: 'Add this URL as a Stripe endpoint, then paste its signing secret (whsec_…).' },
  { id: 'linear', label: 'Linear', help: 'Add this URL as a Linear webhook, then paste its signing secret.' },
  { id: 'bearer', label: 'Bearer token', help: 'Senders include Authorization: Bearer <token>. Generate one below; it is shown once.' },
];

/** The API as an absolute URL, so issued MCP URLs can be checked against its origin and path. */
const apiBase = () => new URL(API, window.location.origin).toString();

/** One shell word, whatever it contains. */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function readStore(): Store {
  let stored: string | null = null;
  let legacy: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
    legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    /* Storage can be unavailable; the page still works for this tab. */
  }
  const { store, legacyMigrated } = restore({ hash: window.location.hash, stored, legacy, apiBase: apiBase() });
  try {
    localStorage.setItem(STORAGE_KEY, serializeStore(store));
    if (legacyMigrated) localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* Best effort. */
  }
  return store;
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStore(store: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeStore(store));
  } catch {
    /* Best effort. */
  }
  // Keep the page link (fragment) on the selected tab's inbox, so copying or bookmarking the address opens it there.
  const url = new URL(window.location.href);
  url.hash = fragmentFor(store.selected, store.inboxes[store.selected] ?? null);
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
  const [store, setStore] = useState<Store | null>(null);
  /** The feed for one inbox, tagged with its manage token so another tab's feed is never shown. */
  const [loaded, setLoaded] = useState<{ token: string; feed: Feed } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('open');
  const [secretDraft, setSecretDraft] = useState('');
  /** A generated bearer token, tagged with its inbox so it never shows under another tab's inbox. */
  const [generated, setGenerated] = useState<{ token: string; secret: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStore(readStore());
  }, []);

  // Persist and keep the page link in step after every change (not inside a state updater:
  // Next.js routes `history.replaceState`, which must not run while React renders).
  useEffect(() => {
    if (store) writeStore(store);
  }, [store]);

  // Every change starts from the latest stored inboxes, so another window's new inbox is never written over.
  const update = useCallback((change: (current: Store) => Store) => {
    setStore((current) => (current ? change(adoptStored(current, readStored(), apiBase())) : current));
  }, []);

  // Pick up inboxes another window created or cleared.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setStore((current) => (current ? adoptStored(current, event.newValue, apiBase()) : current));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const ready = store !== null;
  const agentId: AgentId = store?.selected ?? 'claude-code';
  const session: Session | null = store?.inboxes[agentId] ?? null;
  const feed = session && loaded?.token === session.manageToken ? loaded.feed : null;
  const bearerToken = session && generated?.token === session.manageToken ? generated.secret : null;
  /** The selected inbox right now, for completions that finish after a tab switch. */
  const selectedToken = useRef<string | null>(null);
  selectedToken.current = session?.manageToken ?? null;

  const load = useCallback(
    async (owner: AgentId, current: Session, signal: AbortSignal) => {
      const response = await api('/shims/current', { token: current.manageToken, signal });
      // A late answer for an inbox this page has since left must not touch the current one.
      if (signal.aborted) return;
      if (response.status === 404) {
        // Only this tab's inbox expired; the other agents keep theirs.
        update((currentStore) => withoutInbox(currentStore, owner, current.manageToken));
        setLoaded(null);
        setError('That webhook expired or the link was replaced. Create a new one.');
        return;
      }
      if (!response.ok) throw new Error(`Feed unavailable (HTTP ${response.status}).`);
      const next = (await response.json()) as Feed;
      if (signal.aborted) return;
      setLoaded({ token: current.manageToken, feed: next });
      setError(null);
    },
    [update],
  );

  // Polls only the selected tab's inbox.
  useEffect(() => {
    if (!session) return;
    let stopped = false;
    const controller = new AbortController();
    const tick = async () => {
      if (document.visibilityState === 'visible') {
        try {
          await load(agentId, session, controller.signal);
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
  }, [agentId, session, load]);

  function selectAgent(next: AgentId) {
    if (next === agentId) return;
    update((current) => ({ ...current, selected: next }));
    // Per-inbox UI state belongs to the inbox being left.
    setError(null);
    setSecretDraft('');
    setGenerated(null);
    setExpanded(null);
  }

  // Inboxes are created one tab at a time, on click, never when a tab is opened: the API allows
  // only 10 new inboxes per hour per IP, so clicking through every agent tab must not spend them.
  async function create(owner: AgentId) {
    setBusy(true);
    setError(null);
    try {
      const response = await api('/shims', { method: 'POST' });
      if (response.status === 429) throw new Error('Too many webhooks from this network. Try again later.');
      if (!response.ok) throw new Error('Could not create a webhook. Please try again.');
      const created = (await response.json()) as { manage_token: string; mcp_url: string };
      const next = { manageToken: created.manage_token, mcpUrl: created.mcp_url };
      update((current) => withInbox(current, owner, next));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not create a webhook.');
    } finally {
      setBusy(false);
    }
  }

  async function rotate() {
    if (!session || !window.confirm('Replace the webhook URL? The old URL stops working immediately. Your agent keeps watching.')) return;
    const current = session;
    setBusy(true);
    try {
      const response = await api('/shims/current/rotate', { method: 'POST', token: current.manageToken });
      if (!response.ok) throw new Error('Could not replace the URL.');
      setLoaded({ token: current.manageToken, feed: (await response.json()) as Feed });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not replace the URL.');
    } finally {
      setBusy(false);
    }
  }

  async function saveSecret(target: SecretMode, value: string | null | undefined) {
    if (!session) return;
    const owner = agentId;
    const current = session;
    setBusy(true);
    try {
      const response = await api(`/shims/current/secrets/${target}`, {
        method: 'PUT',
        token: current.manageToken,
        body: JSON.stringify(value === undefined ? {} : { secret: value }),
      });
      const body = (await response.json()) as { secret?: string; message?: string };
      if (!response.ok) throw new Error(body.message || 'Could not save the secret.');
      if (body.secret) setGenerated({ token: current.manageToken, secret: body.secret });
      // A late completion must not wipe a draft typed for another tab's inbox.
      if (selectedToken.current === current.manageToken) setSecretDraft('');
      await load(owner, current, new AbortController().signal);
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
        ? {
            tone: 'live',
            // Name the session only when the host says which one; otherwise don't claim a specific one.
            text: feed.agent.wake_agent
              ? `Agent connected · posts wake ${feed.agent.wake_agent}, even when idle`
              : 'Agent connected · posts wake its linked session, even when idle',
          }
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
          Pick your agent, add its MCP server and post to its webhook URL. Every post is delivered into that agent&apos;s
          session through Agent Relay, so an <strong>idle agent wakes up</strong> and acts on it. No polling loop, no restarts.
        </p>
        <p className={s.crossLink}>
          Building your own MCP? <Link href="/mcp-events-shim/api">Use our API to wake agents with your own messages →</Link>
        </p>
      </section>

      {ready && (
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
                onClick={() => selectAgent(candidate.id)}
              >
                {candidate.label}
              </button>
            ))}
          </div>
          <p className={s.oneInbox}>
            <strong>{agent.oneSession}</strong> Each agent here has its own inbox and webhook URL. To wake two agents, set each
            one up from its own tab.
          </p>
          {!session ? (
            <div className={s.startTab}>
              <button type="button" className={s.primary} onClick={() => void create(agentId)} disabled={busy}>
                {busy ? 'Creating…' : `Get a webhook for ${agent.label}`}
              </button>
              <p className={s.helper}>
                No sign-up. The page link becomes yours: anyone holding it can connect an agent and read posts.
              </p>
              {error && (
                <p className={s.error} role="alert">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <>
              {'note' in agent && agent.note && <p className={s.note}>{agent.note}</p>}
              <CodeBlock code={agent.command(session.mcpUrl)} />
              <p className={s.ask}>
                Then ask your agent: <q>Watch for webhooks and tell me when one arrives.</q>
              </p>
              {agent.id === 'codex' && (
                <p className={s.note}>
                  Codex: the session has to be started. Open Codex and send it that message first. A Codex session can be
                  woken only once it has started; a new window with no message yet cannot be reached.
                </p>
              )}
              <ul className={s.bullets}>
                {agent.wakes ? (
                  <>
                    <li>
                      With <Link href="/download">Agent Relay</Link> running, the agent links its own session (one command it runs
                      itself) and each post is injected into that session, waking it within seconds, even when idle.
                    </li>
                    {'listener' in agent && agent.listener ? (
                      <li>
                        Without Agent Relay, the agent runs <code>npx @agent-relay/events-shim listen</code> in the background. It
                        exits with the next post, which wakes the idle agent, and the agent starts it again. Nothing else to install.
                      </li>
                    ) : (
                      <li>
                        Without the Agent Relay app, setup runs Agent Relay&apos;s core for this client itself, so its newest open
                        session is still woken by each post.
                      </li>
                    )}
                  </>
                ) : (
                  <>
                    <li>The agent keeps a background <code>wait_for_webhook</code> call open; it returns as soon as a post arrives.</li>
                    <li>
                      Clients that can&apos;t run tools in the background see new posts on their next <code>get_webhook_events</code>{' '}
                      call.
                    </li>
                  </>
                )}
                <li>
                  Posts to the open URL reach the agent marked as untrusted data, never as instructions. A{' '}
                  <code>text/plain</code> post to a verified URL (bearer, GitHub, Stripe, Linear) is delivered verbatim, so only
                  senders holding that secret can choose the agent&apos;s words. A signed provider URL wraps a JSON body as data
                  whatever its header says.
                </li>
              </ul>
              {status && <p className={`${s.status} ${s[`status_${status.tone}`]}`}>{status.text}</p>}
              {error && (
                <p className={s.error} role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </section>
      )}

      {session && <KeepInbox key={session.manageToken} manageToken={session.manageToken} />}
      {session && (
        <>
          <section className={s.section}>
            <h2 className={s.sectionTitle}>
              <span className={s.numeral}>ii</span> Post to {agent.label}&apos;s webhook URL
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

          <section className={s.section}>
            <h2 className={s.sectionTitle}>GitHub, Slack, Linear and more, through relayfile</h2>
            <p className={s.note}>
              Wake {agent.label} on provider events without setting up each provider&apos;s webhook or secret. Connect the
              provider once (a browser opens to sign in), then forward its events into this agent&apos;s inbox:
            </p>
            <CodeBlock code={RELAYFILE_SETUP} />
            <CodeBlock code={relayfileListen(feed?.webhook_urls.open ?? '<your webhook URL>')} />
            <ul className={s.bullets}>
              <li>
                Each event (a PR opened, a Slack message, a Linear issue moved) arrives as a post naming the file that
                changed, and wakes the agent like any other post. The agent reads the file under{' '}
                <code>./relayfile-mount</code>.
              </li>
              <li>
                Swap <code>github</code> for <code>slack</code>, <code>linear</code>, <code>notion</code> or any provider
                relayfile supports. Repeated deliveries of the same change arrive once.
              </li>
            </ul>
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
