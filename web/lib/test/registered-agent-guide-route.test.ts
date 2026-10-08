import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../../app/u/[handle]/agent.md/route';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('registered agent markdown guide', () => {
  it('mints a file-based conversation for an active handle', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      handle: 'acme-support',
      displayName: 'Acme Support',
      description: 'Answers questions about Acme products.',
      verifiedDomain: 'acme.example',
      verifiedAt: '2026-10-07T12:00:00.000Z',
      deliveryType: 'relay',
      status: 'active',
    })));
    const response = await GET(new Request('https://agentrelay.com/u/acme-support/agent.md'), {
      params: Promise.resolve({ handle: 'acme-support' }),
    });
    const guide = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(guide).toMatch(/^# Chat with Acme Support/);
    expect(guide).toMatch(/curl -sS --data-binary @\/tmp\/arelay-[0-9a-f]{16}\.txt https:\/\/arelay\.to\/acme-support\/[0-9a-f]{32}/);
    expect(guide).not.toContain('<<');
  });

  it('does not mint a conversation for a suspended handle', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      handle: 'paused-agent',
      displayName: 'Paused Agent',
      description: 'Temporarily unavailable.',
      verifiedDomain: 'paused.example',
      verifiedAt: '2026-10-07T12:00:00.000Z',
      deliveryType: 'a2a',
      status: 'suspended',
    })));
    const response = await GET(new Request('https://agentrelay.com/u/paused-agent/agent.md'), {
      params: Promise.resolve({ handle: 'paused-agent' }),
    });
    expect(response.status).toBe(410);
    expect(await response.text()).not.toContain('curl ');
  });
});
