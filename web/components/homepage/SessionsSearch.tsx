'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { ClaudeCodeColor, Cursor, Grok, MuseColor, OpenCode } from '../brand-icons';
import { CodexColor } from '../CodexColor';
import s from './messenger-section.module.css';

const PEOPLE = {
  Will: '/authors/will-128.webp',
  Khaliq: '/authors/khaliq-128.webp',
  Mary: '/authors/mary-128.webp',
  Ingrid: '/authors/ingrid-128.webp',
} as const;

type Session = {
  id: string;
  person: keyof typeof PEOPLE;
  harness: keyof typeof HARNESSES;
  title: string;
  active: boolean;
};

const HARNESSES = {
  'Claude Code': <ClaudeCodeColor />,
  Codex: <CodexColor />,
  Cursor: <Cursor />,
  Grok: <Grok />,
  Muse: <MuseColor />,
  OpenCode: <OpenCode />,
} satisfies Record<string, ReactNode>;

/** One row: id, whose it is, which harness, its title, and whether it is live. */
function row(id: string, person: Session['person'], harness: Session['harness'], title: string, active: boolean): Session {
  return { id, person, harness, title, active };
}

/** The newest sessions across the team, before anything is searched. */
const SESSIONS: Session[] = [
  row('reconnect', 'Will', 'Claude Code', 'Fix reconnect backoff', true),
  row('billing', 'Khaliq', 'Codex', 'Migrate billing to cents', true),
  row('checkout', 'Mary', 'Cursor', 'Checkout form polish', true),
  row('index', 'Ingrid', 'Grok', 'Index the thread history', false),
  row('notes', 'Will', 'Muse', 'Draft the release notes', true),
  row('cli', 'Khaliq', 'OpenCode', 'Spike the CLI rewrite', false),
  row('flags', 'Mary', 'Claude Code', 'Clean up stale feature flags', false),
];

/** How many sessions the whole team has, for the footer. */
const TOTAL = '12,480';

/**
 * Searches the window runs through in turn: what's typed, how many sessions
 * match, the first page of them, and the line from the top match's history
 * that answers it. Words in [brackets] are the matches.
 */
const SEARCHES: { query: string; count: string; rows: Session[]; who: string; line: string }[] = [
  {
    query: 'why cents',
    count: '214',
    rows: [
      row('billing', 'Khaliq', 'Codex', 'Migrate billing to cents', true),
      row('refunds', 'Mary', 'Claude Code', 'Refunds off by a cent', false),
      row('ledger', 'Khaliq', 'OpenCode', 'Ledger rounding audit', false),
      row('stripe', 'Will', 'Codex', 'Stripe webhook amounts', false),
      row('invoice', 'Ingrid', 'Cursor', 'Invoice totals in cents', false),
      row('tax', 'Mary', 'Grok', 'Tax rounding per line item', false),
      row('pricing', 'Will', 'Claude Code', 'Pricing page amounts', false),
    ],
    who: 'Khaliq’s Codex · yesterday',
    line: 'Decided to store amounts in [cents] so the ledger and Stripe webhooks agree. Floats were rounding refunds.',
  },
  {
    query: 'reconnect retry',
    count: '389',
    rows: [
      row('reconnect', 'Will', 'Claude Code', 'Fix reconnect backoff', true),
      row('ws', 'Khaliq', 'Codex', 'WebSocket drops on sleep', false),
      row('cursor', 'Ingrid', 'Grok', 'Resume from last cursor', false),
      row('flaky', 'Mary', 'Cursor', 'Flaky retry test in CI', false),
      row('jitter', 'Will', 'OpenCode', 'Add jitter to retries', false),
      row('timeout', 'Khaliq', 'Claude Code', 'Broker timeout tuning', false),
      row('offline', 'Mary', 'Muse', 'Offline banner copy', false),
    ],
    who: 'Will’s Claude Code · 2 hours ago',
    line: '[Retry] starts at 250ms and doubles to 8s; on [reconnect] the cursor resumes where it dropped.',
  },
  {
    query: 'checkout tests',
    count: '157',
    rows: [
      row('checkout', 'Mary', 'Cursor', 'Checkout form polish', true),
      row('e2e', 'Will', 'Claude Code', 'E2E suite for checkout', false),
      row('cards', 'Khaliq', 'Codex', 'Test cards for 3DS', false),
      row('address', 'Ingrid', 'OpenCode', 'Address form validation', false),
      row('promo', 'Mary', 'Grok', 'Promo code edge cases', false),
      row('cart', 'Will', 'Codex', 'Cart totals snapshot tests', false),
      row('a11y', 'Ingrid', 'Claude Code', 'Checkout a11y pass', false),
    ],
    who: 'Mary’s Cursor · 20 min ago',
    line: 'Kept the old [checkout] form behind a flag until the e2e [tests] pass on the new one.',
  },
];

const TYPE_MS = 70;
const HOLD_MS = 4800;

/** A history line with its [bracketed] words picked out. */
function Highlighted({ line }: { line: string }) {
  return (
    <>
      {line.split(/(\[[^\]]+\])/).map((part, i) =>
        part.startsWith('[') ? <mark key={i}>{part.slice(1, -1)}</mark> : part,
      )}
    </>
  );
}

/**
 * The Agent Relay desktop app's sessions list, zoomed in. A search types into
 * the bar, the list narrows to the sessions that match, and the top match
 * opens on the line from its history that answers it; then the next search.
 */
export function SessionsSearch() {
  const [search, setSearch] = useState(0);
  const [typed, setTyped] = useState(0);
  const [found, setFound] = useState(false);

  const { query, count, who, line } = SEARCHES[search];

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(SEARCHES[0].query.length);
      setFound(true);
      return;
    }
    let timer: number;
    if (typed < query.length && !found) {
      timer = window.setTimeout(() => setTyped(typed + 1), TYPE_MS);
    } else if (!found) {
      timer = window.setTimeout(() => setFound(true), 260);
    } else {
      timer = window.setTimeout(() => {
        setFound(false);
        setTyped(0);
        setSearch((search + 1) % SEARCHES.length);
      }, HOLD_MS);
    }
    return () => window.clearTimeout(timer);
  }, [found, query.length, search, typed]);

  const rows = found ? SEARCHES[search].rows : SESSIONS;

  return (
    <div className={s.window} aria-hidden="true">
      <div className={s.titlebar}>
        <span className={s.lights}>
          <i />
          <i />
          <i />
        </span>
        <span className={s.search}>
          <svg viewBox="0 0 16 16">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {typed > 0 ? (
            <span className={s.query}>{query.slice(0, typed)}</span>
          ) : (
            <span>Search sessions</span>
          )}
          <i className={s.caret} />
        </span>
      </div>

      <div className={s.head}>
        <span>{found ? `${count} of ${TOTAL} sessions` : `Sessions · ${TOTAL}`}</span>
        <span className={s.status}>Status</span>
      </div>

      <div className={s.rows} data-found={found || undefined}>
        {rows.map((session, index) => (
          <div className={s.row} key={`${search}-${found}-${session.id}`}>
            <span className={s.session}>
              <span className={s.who}>
                <img className={s.avatar} src={PEOPLE[session.person]} alt="" />
                <span className={s.harness}>{HARNESSES[session.harness]}</span>
              </span>
              <span>
                <b>{session.title}</b>
                <small>
                  {session.person} · {session.harness}
                </small>
              </span>
            </span>
            <span className={s.status} data-active={session.active || undefined}>
              <i />
              {session.active ? 'Active' : 'Idle'}
            </span>
            {found && index === 0 ? (
              <p className={s.snippet}>
                <small>{who}</small>
                <Highlighted line={line} />
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className={s.footer}>
        <span>
          <i className={s.connected} />{' '}
          {found ? `${count} of ${TOTAL} sessions match` : `Connected · ${TOTAL} sessions across your team`}
        </span>
        <span>Live agents on Relay: 6</span>
      </div>
    </div>
  );
}
