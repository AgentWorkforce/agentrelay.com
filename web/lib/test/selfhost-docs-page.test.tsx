import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cookieJar = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'agent_relay_session' && cookieJar.value ? { name, value: cookieJar.value } : undefined),
  }),
}));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { url });
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('../../components/docs/TableOfContents', () => ({ TableOfContents: () => null }));

import SelfHostingPage, { dynamic, metadata } from '../../app/docs/self-hosting/[[...slug]]/page';

const SESSION = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1In0.c2lnbmF0dXJl';

// Stand-ins for runbook text: none may appear unless Cloud says the reader is entitled.
const PRIVATE_TITLE = 'Private runbook title CANARY-7f3a';
const PRIVATE_BODY = 'PRIVATE-RUNBOOK-BODY-CANARY-91c2';
const PRIVATE_DESCRIPTION = 'Use when PRIVATE-DESCRIPTION-CANARY-4d0e';
const DOCS = [
  { name: 'gke-install-runbook', title: PRIVATE_TITLE, description: PRIVATE_DESCRIPTION },
  { name: 'upgrades', title: 'Upgrading CANARY-b81e', description: PRIVATE_DESCRIPTION },
];
const MARKDOWN = [
  `${PRIVATE_BODY}, see \`selfhost:upgrades\`.`,
  '',
  '## Install the chart',
  '',
  '```bash',
  'helm install agent-relay oci://ghcr.io/agentworkforce/charts/agent-relay -f values.yaml',
  '```',
  '',
  '| Key | Value |',
  '| --- | --- |',
  '| a | b |',
  '',
  '<script>alert(1)</script>',
  '',
  '[bad](javascript:alert(1)) [good](https://github.com/AgentWorkforce/helm-charts)',
  '',
  '## Install the chart',
].join('\n');
const PRIVATE_STRINGS = [PRIVATE_TITLE, PRIVATE_BODY, PRIVATE_DESCRIPTION, 'CANARY-b81e', 'Install the chart'];

type CloudReply = { status: number; body?: unknown };

function stubCloud(replyFor: (url: URL) => CloudReply) {
  const fetcher = vi.fn(async (input: string) => {
    const { status, body } = replyFor(new URL(input));
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

const ENTITLED = (url: URL): CloudReply => {
  const doc = url.searchParams.get('doc');
  if (!doc) return { status: 200, body: { entitled: true, docs: DOCS } };
  if (doc !== 'gke-install-runbook') return { status: 404, body: { entitled: true, docs: DOCS } };
  return {
    status: 200,
    body: { entitled: true, docs: DOCS, doc: { ...DOCS[0], markdown: MARKDOWN } },
  };
};

async function render(slug?: string[]) {
  return renderToStaticMarkup(await SelfHostingPage({ params: Promise.resolve({ slug }) }));
}

async function redirectOf(slug?: string[]): Promise<string> {
  try {
    await render(slug);
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') return (error as Error & { url: string }).url;
    throw error;
  }
  throw new Error('expected a redirect');
}

beforeEach(() => {
  cookieJar.value = SESSION;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('self-hosting docs page', () => {
  it('is dynamic and never indexed, with one generic title', () => {
    expect(dynamic).toBe('force-dynamic');
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    expect(metadata.title).toBe('Self-hosting');
  });

  it('redirects a signed-out reader to sign in with a return path, without calling Cloud', async () => {
    cookieJar.value = undefined;
    const fetcher = stubCloud(ENTITLED);
    expect(await redirectOf(['gke-install-runbook'])).toBe('/login?next=%2Fdocs%2Fself-hosting%2Fgke-install-runbook');
    expect(await redirectOf()).toBe('/login?next=%2Fdocs%2Fself-hosting');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('redirects to sign in when Cloud rejects the session', async () => {
    stubCloud(() => ({ status: 401, body: { error: 'unauthenticated' } }));
    expect(await redirectOf(['upgrades'])).toBe('/login?next=%2Fdocs%2Fself-hosting%2Fupgrades');
  });

  it('shows the request-access page to a signed-in, unentitled reader with zero private strings', async () => {
    stubCloud(() => ({ status: 403, body: { entitled: false } }));
    for (const slug of [undefined, ['gke-install-runbook'], ['upgrades']]) {
      const html = await render(slug);
      expect(html).toContain('Request access');
      expect(html).toContain('mailto:founders@agentrelay.com');
      for (const text of PRIVATE_STRINGS) expect(html).not.toContain(text);
      expect(html).not.toContain('helm install');
    }
  });

  it('renders the runbook for an entitled reader', async () => {
    const fetcher = stubCloud(ENTITLED);
    const html = await render(['gke-install-runbook']);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://agentrelay.com/cloud/api/v1/me/selfhost-docs?doc=gke-install-runbook');
    expect((init.headers as Record<string, string>).cookie).toBe(`agent_relay_session=${SESSION}`);

    expect(html).toContain(`<h1>${PRIVATE_TITLE}</h1>`);
    expect(html).toContain(PRIVATE_BODY);
    // runbook cross-references become links
    expect(html).toContain('href="/docs/self-hosting/upgrades"><code>selfhost:upgrades</code></a>');
    // code blocks get the docs copy button; duplicate headings get unique ids
    expect(html).toContain('aria-label="Copy code"');
    expect(html).toContain('id="install-the-chart"');
    expect(html).toContain('id="install-the-chart-1"');
    expect(html).toContain('<table>');
    // raw HTML and unsafe links never render
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="https://github.com/AgentWorkforce/helm-charts"');
    // replays never capture runbook text
    expect(html).toContain('ph-sensitive');
    // the runbook nav lists every runbook and marks the current one
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Upgrading CANARY-b81e');
    // the description is the agent-facing "Use when" line, not shown to people
    expect(html).not.toContain(PRIVATE_DESCRIPTION);
  });

  it('renders the overview with diagrams, the chart and the setup agent for an entitled reader', async () => {
    stubCloud(ENTITLED);
    const html = await render();
    expect(html).toContain('Self-hosting Agent Relay');
    expect(html).toContain('/img/self-hosting/agent-relay-architecture.svg');
    expect(html).toContain('/img/self-hosting/agent-relay-request-flow.svg');
    expect(html).toContain('oci://ghcr.io/agentworkforce/charts/agent-relay');
    expect(html).toContain('id="setup-agent"');
    expect(html).toContain('Ask the setup agent');
    expect(html).toContain('href="/docs/self-hosting/guided-gke-install"');
    expect(html).toContain('claude mcp add --transport http agent-relay https://agentrelay.com/cloud/api/v1/mcp/shared-sessions');
    expect(html).toContain(PRIVATE_TITLE);
  });

  it('404s an unknown runbook and a nested path', async () => {
    stubCloud(ENTITLED);
    await expect(render(['no-such-runbook'])).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(render(['a', 'b'])).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('shows an unavailable notice, not content, when Cloud fails', async () => {
    stubCloud(() => ({ status: 503, body: { error: 'unavailable' } }));
    const html = await render(['gke-install-runbook']);
    expect(html).toContain('temporarily unavailable');
    for (const text of PRIVATE_STRINGS) expect(html).not.toContain(text);
  });
});
