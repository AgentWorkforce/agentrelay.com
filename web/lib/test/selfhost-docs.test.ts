import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CLOUD_SESSION_COOKIE,
  cloudApiOrigin,
  fetchSelfhostDocs,
  orderSelfhostDocs,
  parseSelfhostSlug,
  SELFHOST_DOCS_HEADERS,
  selfhostLoginHref,
} from '../selfhost-docs';

const SESSION = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1In0.c2lnbmF0dXJl';
const DOCS = [
  { name: 'upgrades', title: 'Upgrading', description: 'Use when upgrading' },
  { name: 'gke-install-runbook', title: 'Install on GKE', description: 'Use when installing' },
];
const DOC = { ...DOCS[0], markdown: '## Steps\nPRIVATE-CANARY' };

function reply(status: number, body?: unknown) {
  return vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('parseSelfhostSlug', () => {
  it('accepts the index and one doc name only', () => {
    expect(parseSelfhostSlug(undefined)).toEqual({});
    expect(parseSelfhostSlug([])).toEqual({});
    expect(parseSelfhostSlug(['upgrades'])).toEqual({ doc: 'upgrades' });
    for (const slug of [['a', 'b'], ['..'], ['Upgrades'], ['x.md'], ['-x'], ['a'.repeat(65)]]) {
      expect(parseSelfhostSlug(slug)).toBeNull();
    }
  });
});

describe('selfhostLoginHref', () => {
  it('signs in through the site login and returns to the same docs page', () => {
    expect(selfhostLoginHref()).toBe('/login?next=%2Fdocs%2Fself-hosting');
    expect(selfhostLoginHref('upgrades')).toBe('/login?next=%2Fdocs%2Fself-hosting%2Fupgrades');
  });
});

describe('cloudApiOrigin', () => {
  it('defaults to the agentrelay.com front door', () => {
    expect(cloudApiOrigin()).toBe('https://agentrelay.com');
  });

  it('allows https or a loopback test origin only', () => {
    vi.stubEnv('SELFHOST_DOCS_CLOUD_ORIGIN', 'http://127.0.0.1:4010/');
    expect(cloudApiOrigin()).toBe('http://127.0.0.1:4010');
    vi.stubEnv('SELFHOST_DOCS_CLOUD_ORIGIN', 'http://cloud.example.com');
    expect(() => cloudApiOrigin()).toThrow();
  });
});

describe('fetchSelfhostDocs', () => {
  it('is unauthenticated without a plausible session and never calls Cloud', async () => {
    const fetcher = reply(200, { entitled: true, docs: DOCS });
    for (const session of [undefined, '', 'short', `${SESSION};other=1`, `${SESSION} x`]) {
      expect(await fetchSelfhostDocs(session, undefined, fetcher)).toEqual({ kind: 'unauthenticated' });
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('forwards only the Cloud session cookie, uncached, without following redirects', async () => {
    const fetcher = reply(200, { entitled: true, docs: DOCS, doc: DOC });
    await fetchSelfhostDocs(SESSION, 'upgrades', fetcher);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://agentrelay.com/cloud/api/v1/me/selfhost-docs?doc=upgrades');
    expect(init).toMatchObject({ method: 'GET', cache: 'no-store', redirect: 'manual' });
    expect(init.headers).toEqual({ accept: 'application/json', cookie: `${CLOUD_SESSION_COOKIE}=${SESSION}` });
  });

  it('maps 401 to unauthenticated and 403 to forbidden', async () => {
    expect(await fetchSelfhostDocs(SESSION, undefined, reply(401, { error: 'unauthenticated' }))).toEqual({ kind: 'unauthenticated' });
    expect(await fetchSelfhostDocs(SESSION, 'upgrades', reply(403, { entitled: false }))).toEqual({ kind: 'forbidden' });
  });

  it('returns the index, and the runbook when one is named', async () => {
    expect(await fetchSelfhostDocs(SESSION, undefined, reply(200, { entitled: true, docs: DOCS }))).toEqual({ kind: 'ok', docs: DOCS });
    expect(await fetchSelfhostDocs(SESSION, 'upgrades', reply(200, { entitled: true, docs: DOCS, doc: DOC }))).toEqual({
      kind: 'ok',
      docs: DOCS,
      doc: DOC,
    });
  });

  it('reports an unknown runbook as not_found', async () => {
    expect(await fetchSelfhostDocs(SESSION, 'nope', reply(404, { entitled: true, docs: DOCS }))).toEqual({ kind: 'not_found', docs: DOCS });
  });

  it('treats every other answer as unavailable, never as content', async () => {
    const cases = [
      reply(500, { entitled: true, docs: DOCS, doc: DOC }),
      reply(302),
      reply(200, { entitled: false, docs: DOCS, doc: DOC }),
      reply(200, { entitled: true, docs: [{ name: '../x', title: 't', description: '' }] }),
      reply(200, { entitled: true, docs: DOCS, doc: { ...DOC, name: 'other' } }),
      reply(200, { entitled: true, docs: DOCS }),
      vi.fn(async () => new Response('not json', { status: 200 })),
      vi.fn(async () => {
        throw new Error('network');
      }),
    ];
    for (const fetcher of cases) {
      expect(await fetchSelfhostDocs(SESSION, 'upgrades', fetcher as unknown as typeof fetch)).toEqual({ kind: 'unavailable' });
    }
  });

  it('is unavailable, not an error, when the Cloud origin is misconfigured', async () => {
    vi.stubEnv('SELFHOST_DOCS_CLOUD_ORIGIN', 'http://cloud.example.com');
    const fetcher = reply(200, { entitled: true, docs: DOCS });
    expect(await fetchSelfhostDocs(SESSION, undefined, fetcher)).toEqual({ kind: 'unavailable' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('refuses an oversized reply', async () => {
    const huge = JSON.stringify({ entitled: true, docs: DOCS, doc: { ...DOC, markdown: 'x'.repeat(600_000) } });
    const fetcher = vi.fn(async () => new Response(huge, { status: 200 })) as unknown as typeof fetch;
    expect(await fetchSelfhostDocs(SESSION, 'upgrades', fetcher)).toEqual({ kind: 'unavailable' });
  });
});

describe('orderSelfhostDocs', () => {
  it('puts the install first and keeps unknown runbooks at the end in Cloud order', () => {
    const extra = { name: 'zeta', title: 'Zeta', description: '' };
    expect(orderSelfhostDocs([extra, ...DOCS]).map((doc) => doc.name)).toEqual(['gke-install-runbook', 'upgrades', 'zeta']);
  });
});

// next.config.mjs is untyped JS; load it as a plain module.
async function loadNextConfig() {
  const configPath: string = '../../next.config.mjs';
  return (await import(configPath)).default('phase-production-server');
}

describe('next.config self-hosting headers', () => {
  it('marks every gated response private, no-store and noindex', async () => {
    const rules: Array<{ source: string; headers: Array<{ key: string; value: string }> }> = await (await loadNextConfig()).headers();
    for (const source of ['/docs/self-hosting', '/docs/self-hosting/:path*']) {
      const rule = rules.find((candidate) => candidate.source === source);
      expect(rule, source).toBeDefined();
      expect(Object.fromEntries(rule!.headers.map(({ key, value }) => [key, value]))).toEqual(SELFHOST_DOCS_HEADERS);
    }
    expect(SELFHOST_DOCS_HEADERS['Cache-Control']).toBe('private, no-store');
  });
});
