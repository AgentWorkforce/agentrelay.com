// Server-only helpers for the owner analytics dashboard at /u/<handle>/dashboard.
//
// The owner arrives with a short-lived, single-use grant in the query string.
// That first request never renders a page: next.config.mjs rewrites it (before
// the filesystem routes) to the exchange route handler, which trades the grant
// for a session server-to-server, stores the session in an HttpOnly cookie
// scoped to the dashboard path, and 303s to the bare URL. The page then reads
// the cookie server-side and fetches stats with it. Neither the grant nor the
// session is ever handed to a client component, logged, or echoed back.

import { readBoundedBody, REGISTRY_ORIGIN, validRegistryHandle } from './agent-registry';

export const DASHBOARD_SESSION_COOKIE = '__Secure-relay_dashboard';
export const DASHBOARD_WINDOWS = [7, 30] as const;
export type DashboardWindow = (typeof DASHBOARD_WINDOWS)[number];

const REQUEST_TIMEOUT_MS = 5_000;
const MAX_EXCHANGE_BYTES = 8_000;
const MAX_STATS_BYTES = 64_000;
const MAX_GRANT_LENGTH = 4_096;
// RFC 6265 cookie-octet, so the session can be stored without encoding.
const SESSION_PATTERN = /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]{16,2048}$/;
const GRANT_PATTERN = /^[\x21-\x7E]+$/;

/** Headers for the exchange and its redirect: nothing on them may load or be framed. */
export const DASHBOARD_EXCHANGE_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
};

/** Headers for the rendered dashboard page (applied in next.config.mjs). */
export const DASHBOARD_PAGE_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'none'",
};

export function dashboardPath(handle: string): string {
  return `/u/${handle}/dashboard`;
}

export function parseDashboardWindow(value: string | string[] | undefined): DashboardWindow {
  return value === '30' ? 30 : 7;
}

type DashboardSession = { session: string; expiresAt: Date };

/** Trade a grant for a session. Any failure (expired, used, flag off, outage) is null. */
export async function exchangeDashboardGrant(
  handle: string,
  grant: string,
  fetcher: typeof globalThis.fetch = globalThis.fetch,
  now: () => number = Date.now,
): Promise<DashboardSession | null> {
  if (!validRegistryHandle(handle)) return null;
  if (grant.length > MAX_GRANT_LENGTH || !GRANT_PATTERN.test(grant)) return null;
  try {
    const response = await fetcher(
      `${REGISTRY_ORIGIN}/api/v1/agents/${encodeURIComponent(handle)}/dashboard/exchange`,
      {
        method: 'POST',
        cache: 'no-store',
        redirect: 'manual',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ grant }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    if (response.status !== 200) {
      await response.body?.cancel();
      return null;
    }
    const value: unknown = JSON.parse(await readBoundedBody(response, MAX_EXCHANGE_BYTES));
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const { session, expiresAt } = value as Record<string, unknown>;
    if (typeof session !== 'string' || !SESSION_PATTERN.test(session)) return null;
    if (typeof expiresAt !== 'string') return null;
    const expiry = new Date(expiresAt);
    if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= now()) return null;
    return { session, expiresAt: expiry };
  } catch {
    return null;
  }
}

/** Set-Cookie value: HttpOnly, Secure, Lax, dashboard-path scoped, same absolute expiry as the session. */
export function dashboardSessionCookie(handle: string, { session, expiresAt }: DashboardSession): string {
  return [
    `${DASHBOARD_SESSION_COOKIE}=${session}`,
    `Path=${dashboardPath(handle)}`,
    `Expires=${expiresAt.toUTCString()}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

/**
 * Handle `/u/<handle>/dashboard?grant=...`: exchange, then 303 to the bare URL.
 * Success sets the session cookie; failure sets nothing, so the page shows the
 * expired-link state. The grant is never reflected in the response.
 */
export async function handleDashboardExchange(
  request: Request,
  handle: string,
  fetcher: typeof globalThis.fetch = globalThis.fetch,
): Promise<Response> {
  if (!validRegistryHandle(handle)) {
    return new Response('Not found\n', {
      status: 404,
      headers: { ...DASHBOARD_EXCHANGE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  const headers = new Headers(DASHBOARD_EXCHANGE_HEADERS);
  headers.set('Location', dashboardPath(handle));
  const grant = new URL(request.url).searchParams.get('grant');
  if (grant) {
    const session = await exchangeDashboardGrant(handle, grant, fetcher);
    if (session) headers.append('Set-Cookie', dashboardSessionCookie(handle, session));
  }
  return new Response(null, { status: 303, headers });
}

type CountRow = { name: string; count: number };

export type HandleStats = {
  handle: string;
  windowDays: DashboardWindow;
  generatedAt: string;
  estimated: boolean;
  totals: {
    guideFetches: number;
    conversations: number;
    visitorMessages: number;
    repliesDelivered: number;
    waitPolls: number;
    visitorDays: number;
  };
  latencyMs: { p50: number; p95: number } | null;
  daily: Array<{
    day: string;
    conversations: number;
    visitorMessages: number;
    repliesDelivered: number;
    dailyUniqueVisitors: number;
  }>;
  clients: CountRow[];
  countries: CountRow[];
  outcomes: CountRow[];
};

export type DashboardStatsResult =
  | { kind: 'ok'; stats: HandleStats }
  | { kind: 'unauthorized' }
  | { kind: 'unavailable' };

export async function fetchDashboardStats(
  handle: string,
  session: string,
  windowDays: DashboardWindow,
  fetcher: typeof globalThis.fetch = globalThis.fetch,
): Promise<DashboardStatsResult> {
  if (!validRegistryHandle(handle) || !SESSION_PATTERN.test(session)) return { kind: 'unauthorized' };
  try {
    const response = await fetcher(
      `${REGISTRY_ORIGIN}/api/v1/agents/${encodeURIComponent(handle)}/dashboard/stats?window=${windowDays}`,
      {
        cache: 'no-store',
        redirect: 'manual',
        headers: { accept: 'application/json', authorization: `Bearer ${session}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    if (response.status === 401 || response.status === 403) {
      await response.body?.cancel();
      return { kind: 'unauthorized' };
    }
    if (response.status !== 200) {
      await response.body?.cancel();
      return { kind: 'unavailable' };
    }
    const value: unknown = JSON.parse(await readBoundedBody(response, MAX_STATS_BYTES));
    if (!isHandleStats(value, handle, windowDays)) return { kind: 'unavailable' };
    return { kind: 'ok', stats: value };
  } catch {
    return { kind: 'unavailable' };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function hasCounts(value: unknown, keys: readonly string[]): boolean {
  return isRecord(value) && keys.every((key) => isCount(value[key]));
}

function isCountRows(value: unknown): value is CountRow[] {
  return Array.isArray(value) && value.length <= 50 && value.every((row) =>
    isRecord(row) && typeof row.name === 'string' && row.name.length >= 1 && row.name.length <= 100 && isCount(row.count));
}

export function isHandleStats(value: unknown, handle: string, windowDays: DashboardWindow): value is HandleStats {
  if (!isRecord(value)) return false;
  return value.handle === handle
    && value.windowDays === windowDays
    && typeof value.generatedAt === 'string'
    && Number.isFinite(Date.parse(value.generatedAt))
    && typeof value.estimated === 'boolean'
    && hasCounts(value.totals, ['guideFetches', 'conversations', 'visitorMessages', 'repliesDelivered', 'waitPolls', 'visitorDays'])
    && (value.latencyMs === null || hasCounts(value.latencyMs, ['p50', 'p95']))
    && Array.isArray(value.daily)
    && value.daily.length <= 31
    && value.daily.every((day) => isRecord(day)
      && typeof day.day === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(day.day)
      && hasCounts(day, ['conversations', 'visitorMessages', 'repliesDelivered', 'dailyUniqueVisitors']))
    && isCountRows(value.clients)
    && isCountRows(value.countries)
    && isCountRows(value.outcomes);
}
