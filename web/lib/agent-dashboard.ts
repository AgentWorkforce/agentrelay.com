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

/**
 * Headers for the confirmation interstitial: inline styles only, no scripts,
 * and its one form may post only to this origin.
 */
export const DASHBOARD_CONFIRM_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
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

/** Clears the handle-scoped session so a failed link never shows an older session's data. */
export function clearDashboardSessionCookie(handle: string): string {
  return [
    `${DASHBOARD_SESSION_COOKIE}=`,
    `Path=${dashboardPath(handle)}`,
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

function notFound(): Response {
  return new Response('Not found\n', {
    status: 404,
    headers: { ...DASHBOARD_EXCHANGE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * GET (and HEAD) `/u/<handle>/dashboard?grant=...` never redeems the grant: link
 * scanners, unfurlers and prefetchers would otherwise burn the single-use link.
 * It returns a static, script-free page whose button POSTs the grant to the
 * exchange. No React page, layout, or analytics code runs for it.
 */
export function dashboardConfirmPage(request: Request, handle: string): Response {
  if (!validRegistryHandle(handle)) return notFound();
  const grant = new URL(request.url).searchParams.get('grant');
  if (!grant || grant.length > MAX_GRANT_LENGTH || !GRANT_PATTERN.test(grant)) {
    const headers = new Headers(DASHBOARD_EXCHANGE_HEADERS);
    headers.set('Location', dashboardPath(handle));
    return new Response(null, { status: 303, headers });
  }
  const body = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><meta name="referrer" content="no-referrer"><title>Open agent dashboard</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#0b0d10;color:#e8eaed}main{max-width:28rem;padding:2rem;text-align:center}button{font:inherit;padding:.75rem 1.5rem;border-radius:.5rem;border:0;background:#4f8cff;color:#fff;cursor:pointer}p{color:#aab1bb}</style>
</head><body><main><h1>Agent dashboard</h1><p>Open the analytics dashboard for <strong>${escapeHtml(handle)}</strong>. This link works once and expires 15 minutes after it was created.</p>
<form method="post" action="${escapeHtml(dashboardPath(handle))}/exchange"><input type="hidden" name="grant" value="${escapeHtml(grant)}"><button type="submit">Open dashboard</button></form></main></body></html>
`;
  return new Response(request.method === 'HEAD' ? null : body, {
    status: 200,
    headers: { ...DASHBOARD_CONFIRM_HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    const parsed = new URL(origin);
    return parsed.host === requestUrl.host || (!!forwardedHost && parsed.host === forwardedHost);
  } catch {
    return false;
  }
}

/**
 * POST `/u/<handle>/dashboard/exchange` from the confirmation page: redeem the
 * grant server-to-server, then 303 to the bare URL. Success sets the session
 * cookie; failure clears any older session so the page shows the expired-link
 * state. The grant is never reflected in the response.
 */
export async function handleDashboardExchange(
  request: Request,
  handle: string,
  fetcher: typeof globalThis.fetch = globalThis.fetch,
): Promise<Response> {
  if (!validRegistryHandle(handle)) return notFound();
  const headers = new Headers(DASHBOARD_EXCHANGE_HEADERS);
  headers.set('Location', dashboardPath(handle));
  let grant: string | null = null;
  if (sameOrigin(request)) {
    try {
      const value = (await request.formData()).get('grant');
      grant = typeof value === 'string' ? value : null;
    } catch {
      grant = null;
    }
  }
  const session = grant ? await exchangeDashboardGrant(handle, grant, fetcher) : null;
  headers.append(
    'Set-Cookie',
    session ? dashboardSessionCookie(handle, session) : clearDashboardSessionCookie(handle),
  );
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
