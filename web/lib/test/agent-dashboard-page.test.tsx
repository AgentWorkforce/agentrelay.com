import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cookieJar = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === '__Secure-relay_dashboard' && cookieJar.value
      ? { name, value: cookieJar.value }
      : undefined),
  }),
}));
vi.mock('../../components/SiteNav', () => ({ SiteNav: () => null }));
vi.mock('../../components/SiteFooter', () => ({ SiteFooter: () => null }));

import AgentDashboardPage, { metadata } from '../../app/u/[handle]/dashboard/page';

const SESSION = 'sess_0123456789abcdefghijklmnop';

function stats(windowDays: 7 | 30, overrides: Record<string, unknown> = {}) {
  return {
    handle: 'acme-support',
    windowDays,
    generatedAt: '2026-10-07T12:00:00.000Z',
    estimated: false,
    totals: { guideFetches: 12, conversations: 5, visitorMessages: 9, repliesDelivered: 8, waitPolls: 30, visitorDays: 6 },
    latencyMs: { p50: 850, p95: 2400 },
    daily: [{ day: '2026-10-07', conversations: 5, visitorMessages: 9, repliesDelivered: 8, dailyUniqueVisitors: 6 }],
    clients: [{ name: 'claude-code', count: 5 }],
    countries: [{ name: 'US', count: 4 }, { name: 'Other', count: 1 }],
    outcomes: [{ name: 'ok', count: 8 }, { name: 'delivery-failed', count: 1 }],
    ...overrides,
  };
}

function statsFetch(handler: (windowDays: 7 | 30) => Response) {
  return vi.fn(async (url: string) => handler(new URL(url).searchParams.get('window') === '30' ? 30 : 7));
}

async function render(search: Record<string, string> = {}, handle = 'acme-support') {
  const element = await AgentDashboardPage({
    params: Promise.resolve({ handle }),
    searchParams: Promise.resolve(search),
  });
  return renderToStaticMarkup(element);
}

beforeEach(() => {
  cookieJar.value = SESSION;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('agent dashboard page', () => {
  it('is never indexed', () => {
    expect(metadata.robots).toMatchObject({ index: false });
  });

  it('fetches both windows server-side with the Bearer session and never renders the session', async () => {
    const fetcher = statsFetch((w) => Response.json(stats(w, w === 30 ? { estimated: true } : {})));
    vi.stubGlobal('fetch', fetcher);
    const html = await render({ window: '30' });

    expect(fetcher).toHaveBeenCalledTimes(2);
    const urls = fetcher.mock.calls.map(([url]) => url).sort();
    expect(urls).toEqual([
      'https://arelay.to/api/v1/agents/acme-support/dashboard/stats?window=30',
      'https://arelay.to/api/v1/agents/acme-support/dashboard/stats?window=7',
    ]);
    for (const call of fetcher.mock.calls as unknown as Array<[string, RequestInit]>) {
      expect((call[1].headers as Record<string, string>).authorization).toBe(`Bearer ${SESSION}`);
    }
    expect(html).not.toContain(SESSION);
    expect(html).toContain('Last 30 days');
    expect(html).toContain('estimated (sampled)');
    expect(html).toContain('Visitor-days');
    expect(html).toContain('the sum of daily visitors (visitor-days), not unique people');
    expect(html).toContain('850 ms');
    expect(html).toContain('2.4 s');
    expect(html).toContain('Delivery failed');
    expect(html).toContain('Other');
    expect(html).not.toMatch(/posthog/i);
  });

  it('shows the expired state without a cookie and does not call the registry', async () => {
    cookieJar.value = undefined;
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const html = await render();
    expect(fetcher).not.toHaveBeenCalled();
    expect(html).toContain('This dashboard link has expired');
    expect(html).toContain('POST /api/v1/agents/acme-support/manage/dashboard-link');
  });

  it('shows the expired state on a 401', async () => {
    vi.stubGlobal('fetch', statsFetch(() => new Response('{}', { status: 401 })));
    const html = await render();
    expect(html).toContain('This dashboard link has expired');
    expect(html).not.toContain(SESSION);
  });

  it('shows the unavailable state on a 503', async () => {
    vi.stubGlobal('fetch', statsFetch(() => Response.json({ code: 'analytics_unavailable' }, { status: 503 })));
    const html = await render();
    expect(html).toContain('Analytics are temporarily unavailable');
  });

  it('explains the empty state without implying imported history', async () => {
    const empty = {
      totals: { guideFetches: 0, conversations: 0, visitorMessages: 0, repliesDelivered: 0, waitPolls: 0, visitorDays: 0 },
      latencyMs: null,
      daily: [],
      clients: [],
      countries: [],
      outcomes: [],
    };
    vi.stubGlobal('fetch', statsFetch((w) => Response.json(stats(w, empty))));
    const html = await render();
    expect(html).toContain(
      'Collection is server-side and started when analytics shipped; earlier traffic is not included.',
    );
    expect(html).not.toMatch(/import/i);
  });
});
