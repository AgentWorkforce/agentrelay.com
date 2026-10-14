import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from '../../app/u/[handle]/dashboard/exchange/route';
import {
  DASHBOARD_PAGE_HEADERS,
  DASHBOARD_SESSION_COOKIE,
  dashboardConfirmPage,
  fetchDashboardStats,
  handleDashboardExchange,
  parseDashboardWindow,
} from '../agent-dashboard';
import { dropAgentDashboardAnalytics, getWebsiteAnalyticsPage, isAgentDashboardPath } from '../site-analytics';

const GRANT = 'g1.eyJoYW5kbGUiOiJhY21lLXN1cHBvcnQifQ.c2lnbmF0dXJlLXNlY3JldA';
const SESSION = 'sess_0123456789abcdefghijklmnop';
const EXPIRES_AT = '2099-01-01T00:15:00.000Z';

const STATS = {
  handle: 'acme-support',
  windowDays: 7,
  generatedAt: '2026-10-07T12:00:00.000Z',
  estimated: false,
  totals: { guideFetches: 12, conversations: 5, visitorMessages: 9, repliesDelivered: 8, waitPolls: 30, visitorDays: 6 },
  latencyMs: { p50: 850, p95: 2400 },
  daily: [
    { day: '2026-10-06', conversations: 2, visitorMessages: 4, repliesDelivered: 3, dailyUniqueVisitors: 2 },
    { day: '2026-10-07', conversations: 3, visitorMessages: 5, repliesDelivered: 5, dailyUniqueVisitors: 4 },
  ],
  clients: [{ name: 'claude-code', count: 4 }, { name: 'codex', count: 1 }],
  countries: [{ name: 'US', count: 3 }, { name: 'Other', count: 2 }],
  outcomes: [{ name: 'ok', count: 8 }, { name: 'timeout', count: 1 }],
};

function linkRequest(handle = 'acme-support', grant = GRANT, method = 'GET') {
  return new Request(`https://agentrelay.com/u/${handle}/dashboard?grant=${encodeURIComponent(grant)}`, { method });
}

function exchangeRequest(handle = 'acme-support', grant = GRANT, origin: string | null = 'https://agentrelay.com') {
  const body = new URLSearchParams({ grant });
  return new Request(`https://agentrelay.com/u/${handle}/dashboard/exchange`, {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...(origin ? { origin } : {}),
    },
  });
}

function allHeaderText(response: Response): string {
  return [...response.headers.entries()].map(([k, v]) => `${k}: ${v}`).join('\n');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('dashboard grant exchange', () => {
  it('exchanges the grant server-to-server and sets a scoped, non-extended session cookie', async () => {
    const fetcher = vi.fn(async () => Response.json({ session: SESSION, expiresAt: EXPIRES_AT }));
    const response = await handleDashboardExchange(exchangeRequest(), 'acme-support', fetcher as typeof fetch);

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://arelay.to/api/v1/agents/acme-support/dashboard/exchange');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ grant: GRANT });

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/u/acme-support/dashboard');
    const cookie = response.headers.get('set-cookie') ?? '';
    const parts = cookie.split(/;\s*/);
    expect(parts[0]).toBe(`${DASHBOARD_SESSION_COOKIE}=${SESSION}`);
    expect(parts).toContain('HttpOnly');
    expect(parts).toContain('Secure');
    expect(parts).toContain('SameSite=Lax');
    expect(parts).toContain('Path=/u/acme-support/dashboard');
    expect(parts).toContain(`Expires=${new Date(EXPIRES_AT).toUTCString()}`);
    expect(cookie).not.toMatch(/Max-Age/i);
    expect(new Date(cookie.match(/Expires=([^;]+)/)![1]).getTime()).toBe(Date.parse(EXPIRES_AT));
  });

  it('sets private, no-referrer, and locked-down CSP headers on the redirect', async () => {
    const fetcher = vi.fn(async () => Response.json({ session: SESSION, expiresAt: EXPIRES_AT }));
    const response = await handleDashboardExchange(exchangeRequest(), 'acme-support', fetcher as typeof fetch);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    const csp = response.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('never echoes the grant in the response', async () => {
    for (const fetcher of [
      vi.fn(async () => Response.json({ session: SESSION, expiresAt: EXPIRES_AT })),
      vi.fn(async () => Response.json({ code: 'invalid_grant' }, { status: 401 })),
    ]) {
      const response = await handleDashboardExchange(exchangeRequest(), 'acme-support', fetcher as typeof fetch);
      expect(response.headers.get('location')).not.toContain('grant');
      expect(allHeaderText(response)).not.toContain(GRANT);
      expect(await response.text()).toBe('');
    }
  });

  it.each([
    ['an invalid grant', async () => Response.json({ code: 'invalid_grant' }, { status: 401 })],
    ['the feature flag being off', async () => new Response('not found', { status: 404 })],
    ['a registry outage', async () => { throw new Error('network down'); }],
    ['an already-expired session', async () => Response.json({ session: SESSION, expiresAt: '2000-01-01T00:00:00Z' })],
    ['a malformed session', async () => Response.json({ session: 'bad; Path=/', expiresAt: EXPIRES_AT })],
  ])('flags the used link and leaves any existing session alone on %s', async (_label, impl) => {
    const fetcher = vi.fn(impl);
    const response = await handleDashboardExchange(exchangeRequest(), 'acme-support', fetcher as typeof fetch);
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/u/acme-support/dashboard?link=used');
    // Back or a double submit replays a used grant; it must not log the owner out.
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('refuses cross-origin or origin-less exchanges without calling the registry', async () => {
    const fetcher = vi.fn();
    for (const origin of ['https://evil.example', 'http://agentrelay.com', 'https://agentrelay.com:8443', null, 'null']) {
      const response = await handleDashboardExchange(
        exchangeRequest('acme-support', GRANT, origin), 'acme-support', fetcher as typeof fetch,
      );
      expect(response.status).toBe(303);
      // A cross-site form can neither redeem a grant nor clear the owner's session.
      expect(response.headers.get('set-cookie')).toBeNull();
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('404s an invalid handle without calling the registry', async () => {
    const fetcher = vi.fn();
    for (const handle of ['Acme', '-acme', 'a', 'acme_support', '../x']) {
      const response = await handleDashboardExchange(exchangeRequest('x'), handle, fetcher as typeof fetch);
      expect(response.status).toBe(404);
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(await response.text()).not.toContain(GRANT);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('never redeems the grant on GET or HEAD, so scanners and prefetchers cannot burn it', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    for (const method of ['GET', 'HEAD']) {
      const response = await GET(linkRequest('acme-support', GRANT, method), {
        params: Promise.resolve({ handle: 'acme-support' }),
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('referrer-policy')).toBe('no-referrer');
      const csp = response.headers.get('content-security-policy') ?? '';
      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).not.toContain('script-src');
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('renders a script-free confirmation that posts the grant to the exchange', async () => {
    const response = dashboardConfirmPage(linkRequest(), 'acme-support');
    const html = await response.text();
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain('<form method="post" action="/u/acme-support/dashboard/exchange">');
    expect(html).toContain('name="grant"');
    const injected = dashboardConfirmPage(linkRequest('acme-support', '"><img src=x>'), 'acme-support');
    expect(injected.status).toBe(303);
    expect(dashboardConfirmPage(linkRequest(), 'NOPE').status).toBe(404);
  });

  it('is wired as a POST route handler using the global fetch', async () => {
    const fetcher = vi.fn(async () => Response.json({ session: SESSION, expiresAt: EXPIRES_AT }));
    vi.stubGlobal('fetch', fetcher);
    const response = await POST(exchangeRequest(), { params: Promise.resolve({ handle: 'acme-support' }) });
    expect(response.status).toBe(303);
    expect(response.headers.get('set-cookie')).toContain(`${DASHBOARD_SESSION_COOKIE}=${SESSION}`);
    const invalid = await POST(exchangeRequest(), { params: Promise.resolve({ handle: 'NOPE' }) });
    expect(invalid.status).toBe(404);
  });
});

// next.config.mjs is untyped JS; load it as a plain module. The server phase
// resolves the config without the build-time npm version lookup.
async function loadNextConfig() {
  const configPath: string = '../../next.config.mjs';
  return (await import(configPath)).default('phase-production-server');
}

describe('next.config dashboard routing', () => {
  it('rewrites grant-bearing dashboard requests to the exchange before filesystem routes', async () => {
    const rewrites = await (await loadNextConfig()).rewrites();
    expect(rewrites.beforeFiles).toContainEqual({
      source: '/u/:handle/dashboard',
      has: [{ type: 'query', key: 'grant', value: '.+' }],
      destination: '/u/:handle/dashboard/exchange',
    });
  });

  it('applies the page headers to the bare dashboard URL only', async () => {
    const rules = await (await loadNextConfig()).headers();
    const rule = rules.find((r: { source: string }) => r.source === '/u/:handle/dashboard');
    expect(rule.missing).toEqual([{ type: 'query', key: 'grant', value: '.+' }]);
    const headers = Object.fromEntries(rule.headers.map((h: { key: string; value: string }) => [h.key, h.value]));
    for (const [key, value] of Object.entries(DASHBOARD_PAGE_HEADERS)) expect(headers[key]).toBe(value);
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  });
});

describe('dashboard stats', () => {
  it('fetches stats with the Bearer session and validates the shape', async () => {
    const fetcher = vi.fn(async () => Response.json(STATS));
    const result = await fetchDashboardStats('acme-support', SESSION, 7, fetcher as typeof fetch);
    expect(result).toEqual({ kind: 'ok', stats: STATS });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://arelay.to/api/v1/agents/acme-support/dashboard/stats?window=7');
    expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${SESSION}`);
    expect(init.cache).toBe('no-store');
  });

  it('maps 401 to unauthorized and 503 or bad shapes to unavailable', async () => {
    const unauthorized = vi.fn(async () => new Response('{}', { status: 401 }));
    await expect(fetchDashboardStats('acme-support', SESSION, 30, unauthorized as typeof fetch))
      .resolves.toEqual({ kind: 'unauthorized' });
    const unavailable = vi.fn(async () => Response.json({ code: 'analytics_unavailable' }, { status: 503 }));
    await expect(fetchDashboardStats('acme-support', SESSION, 30, unavailable as typeof fetch))
      .resolves.toEqual({ kind: 'unavailable' });
    const wrongWindow = vi.fn(async () => Response.json(STATS));
    await expect(fetchDashboardStats('acme-support', SESSION, 30, wrongWindow as typeof fetch))
      .resolves.toEqual({ kind: 'unavailable' });
  });

  it('allowlists the window', () => {
    expect(parseDashboardWindow('30')).toBe(30);
    expect(parseDashboardWindow('7')).toBe(7);
    expect(parseDashboardWindow('90')).toBe(7);
    expect(parseDashboardWindow(['30', '7'])).toBe(7);
    expect(parseDashboardWindow(undefined)).toBe(7);
  });
});

describe('dashboard analytics exclusion', () => {
  it('matches dashboard paths and subpaths only', () => {
    expect(isAgentDashboardPath('/u/acme-support/dashboard')).toBe(true);
    expect(isAgentDashboardPath('/u/acme-support/dashboard/')).toBe(true);
    expect(isAgentDashboardPath('/u/acme-support/dashboard/exchange')).toBe(true);
    expect(isAgentDashboardPath('/u/acme-support')).toBe(false);
    expect(isAgentDashboardPath('/u/acme-support/dashboards')).toBe(false);
    expect(isAgentDashboardPath('/docs/u/x/dashboard')).toBe(false);
    expect(isAgentDashboardPath(null)).toBe(false);
  });

  it('never tracks a page view on a dashboard path', () => {
    expect(getWebsiteAnalyticsPage('/u/acme-support/dashboard')).toBeNull();
    expect(getWebsiteAnalyticsPage('/u/acme-support/dashboard/exchange')).toBeNull();
  });

  it('drops PostHog events raised on or describing a dashboard page', () => {
    const onDashboard = { event: '$autocapture', properties: { $current_url: 'https://agentrelay.com/u/acme-support/dashboard?window=30' } };
    expect(dropAgentDashboardAnalytics(onDashboard)).toBeNull();
    expect(dropAgentDashboardAnalytics({ event: '$pageleave', properties: { $pathname: '/u/a1/dashboard' } })).toBeNull();
    const elsewhere = { event: '$pageview', properties: { $current_url: 'https://agentrelay.com/docs' } };
    expect(dropAgentDashboardAnalytics(elsewhere)).toBe(elsewhere);

    vi.stubGlobal('location', { pathname: '/u/acme-support/dashboard' });
    expect(dropAgentDashboardAnalytics({ event: '$snapshot', properties: {} })).toBeNull();
  });
});
