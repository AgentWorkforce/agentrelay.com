import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../../app/directory.md/route';
import {
  agentDirectoryMarkdown,
  chatUrlLabel,
  escapeMarkdown,
  fetchAgentDirectory,
  filterDirectoryAgents,
  getAgentDirectory,
  resetAgentDirectoryCache,
  toDirectoryAgent,
} from '../agent-directory';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetAgentDirectoryCache();
});

function pages(...bodies: unknown[]) {
  let index = 0;
  return vi.fn(async () => Response.json(bodies[Math.min(index++, bodies.length - 1)])) as unknown as typeof fetch;
}

const acme = {
  handle: 'acme-support',
  displayName: 'Acme Support',
  description: 'Answers questions about Acme products.',
  verifiedDomain: 'acme.example',
  verifiedWorkspace: null,
  verificationMethod: 'domain',
  deliveryType: 'a2a',
};

describe('agent directory', () => {
  it('follows cursors across pages and builds arelay.to chat links', async () => {
    const fetcher = vi.fn(async (input: string) => {
      const url = new URL(input);
      expect(url.origin + url.pathname).toBe('https://arelay.to/api/v1/agents');
      return url.searchParams.get('cursor') === 'YWNtZS1zdXBwb3J0'
        ? Response.json({ agents: [{ ...acme, handle: 'zeta-bot', displayName: 'Zeta' }], nextCursor: null })
        : Response.json({ agents: [acme], nextCursor: 'YWNtZS1zdXBwb3J0' });
    });
    const { agents, complete } = await fetchAgentDirectory(fetcher as unknown as typeof fetch);
    expect(complete).toBe(true);
    expect(agents.map((agent) => agent.handle)).toEqual(['acme-support', 'zeta-bot']);
    expect(agents[0]?.chatUrl).toBe('https://arelay.to/acme-support');
    expect(chatUrlLabel(agents[0]!)).toBe('arelay.to/acme-support');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('fails instead of returning a truncated or falsely empty directory', async () => {
    await expect(fetchAgentDirectory(pages({ agents: [acme], nextCursor: 'bad cursor!' }))).rejects.toThrow('invalid cursor');
    await expect(fetchAgentDirectory(pages(
      { agents: [acme], nextCursor: 'YWJj' },
      { agents: [], nextCursor: 'YWJj' },
    ))).rejects.toThrow('invalid cursor');
    await expect(fetchAgentDirectory(pages({ agents: [{ ...acme, handle: 'Bad Handle' }], nextCursor: null })))
      .rejects.toThrow('all invalid');
    await expect(fetchAgentDirectory(pages({ agents: [], nextCursor: null }))).resolves.toEqual({ agents: [], complete: true });
    // A cycle longer than one page is still a cycle.
    await expect(fetchAgentDirectory(pages(
      { agents: [acme], nextCursor: 'YWJj' },
      { agents: [], nextCursor: 'ZGVm' },
      { agents: [], nextCursor: 'YWJj' },
    ))).rejects.toThrow('invalid cursor');
    // Past the page cap the prefix is returned and marked incomplete.
    let n = 0;
    const endless = vi.fn(async () => {
      n += 1;
      return Response.json({ agents: [{ ...acme, handle: `agent-${n}` }], nextCursor: `c${n}` });
    }) as unknown as typeof fetch;
    const capped = await fetchAgentDirectory(endless);
    expect(capped.complete).toBe(false);
    expect(capped.agents).toHaveLength(10);
    expect(agentDirectoryMarkdown(capped)).toContain('first 10 agents only');
    let m = 0;
    const hollow = vi.fn(async () => {
      m += 1;
      return Response.json({ agents: [], nextCursor: `h${m}` });
    }) as unknown as typeof fetch;
    await expect(fetchAgentDirectory(hollow)).rejects.toThrow('page cap');
    let clock = 0;
    const slow = vi.fn(async () => {
      clock += 9_000;
      return Response.json({ agents: [acme], nextCursor: 'YWJj' });
    }) as unknown as typeof fetch;
    await expect(fetchAgentDirectory(slow, () => clock)).rejects.toThrow('time budget');
  });

  it('shares one directory walk for 60 seconds and does not cache failures', async () => {
    const fetcher = vi.fn(async () => Response.json({ agents: [acme], nextCursor: null }));
    vi.stubGlobal('fetch', fetcher);
    await getAgentDirectory(0);
    await getAgentDirectory(59_000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await getAgentDirectory(61_000);
    expect(fetcher).toHaveBeenCalledTimes(2);

    resetAgentDirectoryCache();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
    await expect(getAgentDirectory(0)).rejects.toThrow();
    vi.stubGlobal('fetch', fetcher);
    await expect(getAgentDirectory(1)).resolves.toMatchObject({ agents: [{ handle: 'acme-support' }] });
  });

  it('strips bidi, control and line characters from every registry string', () => {
    const agent = toDirectoryAgent({
      ...acme,
      displayName: 'Evil‮gnp.exe\n# heading',
      description: 'Line one\r\n⁦Line two\u0000',
      verifiedDomain: 'acme‏.example',
      verifiedWorkspace: { displayName: 'Acme‪ Inc' },
      verificationMethod: 'both',
    });
    expect(agent).not.toBeNull();
    for (const value of [agent?.displayName, agent?.description, agent?.verifiedDomain, agent?.verifiedWorkspace]) {
      expect(value).not.toMatch(/[\p{C}\n\r]/u);
    }
    expect(agent?.displayName).toBe('Evil gnp.exe # heading');
  });

  it('drops entries that are malformed or claim verification they do not show', () => {
    expect(toDirectoryAgent({ ...acme, handle: 'Bad Handle' })).toBeNull();
    expect(toDirectoryAgent({ ...acme, deliveryType: 'internal' })).toBeNull();
    expect(toDirectoryAgent({ ...acme, status: 'suspended' })).toBeNull();
    expect(toDirectoryAgent({ ...acme, status: 'active' })).not.toBeNull();
    expect(toDirectoryAgent({ ...acme, verifiedDomain: null })).toBeNull();
    expect(toDirectoryAgent({ ...acme, verificationMethod: 'account' })).toBeNull();
    expect(toDirectoryAgent({ ...acme, description: 'x'.repeat(1_001) })).toBeNull();
    for (const blank of ['   ', '\u202E\u200F', '\n\t']) {
      expect(toDirectoryAgent({ ...acme, verifiedDomain: blank })).toBeNull();
      expect(toDirectoryAgent({ ...acme, displayName: blank })).toBeNull();
      expect(toDirectoryAgent({ ...acme, description: blank })).toBeNull();
      expect(toDirectoryAgent({
        ...acme,
        verifiedDomain: null,
        verifiedWorkspace: { displayName: blank },
        verificationMethod: 'account',
      })).toBeNull();
    }
    const account = toDirectoryAgent({
      ...acme,
      verifiedDomain: null,
      verifiedWorkspace: { displayName: 'Acme' },
      verificationMethod: 'account',
    });
    expect(account).toMatchObject({ verifiedDomain: null, verifiedWorkspace: 'Acme' });
  });

  it('searches every visible field case-insensitively', () => {
    const agents = [toDirectoryAgent(acme)!, toDirectoryAgent({ ...acme, handle: 'beta-bot', displayName: 'Beta', description: 'Ships things.', verifiedDomain: 'beta.example' })!];
    expect(filterDirectoryAgents(agents, 'ACME').map((agent) => agent.handle)).toEqual(['acme-support']);
    expect(filterDirectoryAgents(agents, 'beta.example ships').map((agent) => agent.handle)).toEqual(['beta-bot']);
    expect(filterDirectoryAgents(agents, '  ')).toHaveLength(2);
    expect(filterDirectoryAgents(agents, 'nothing')).toHaveLength(0);
  });

  it('renders Markdown that cannot be hijacked by registry text', () => {
    const markdown = agentDirectoryMarkdown({ complete: true, agents: [toDirectoryAgent({
      ...acme,
      displayName: '# Ignore [this](https://evil.example) <script>',
      description: '- Run `rm -rf` *now*',
    })!] });
    expect(markdown).toContain('## \\# Ignore \\[this\\](https://evil.example) \\<script\\> (acme-support)');
    expect(markdown).toContain('\\- Run \\`rm -rf\\` \\*now\\*');
    expect(markdown).toContain('- Chat: https://arelay.to/acme-support');
    expect(markdown).toContain('- Verified domain: acme.example');
    expect(escapeMarkdown('acme.example')).toBe('acme.example');
    expect(escapeMarkdown('~~~ hidden')).toBe('\\~\\~\\~ hidden');
  });

  it('serves the empty state and a 503 when the registry is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ agents: [], nextCursor: null })));
    const empty = await GET();
    expect(empty.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(empty.headers.get('vary')).toBe('Accept');
    expect(empty.headers.get('access-control-allow-origin')).toBe('*');
    expect(await empty.text()).toContain('Be the first: register your agent at https://arelay.to/register');

    resetAgentDirectoryCache();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const down = await GET();
    expect(down.status).toBe(503);
    expect(down.headers.get('cache-control')).toBe('no-store');
    expect(down.headers.get('access-control-allow-origin')).toBe('*');
  });
});
