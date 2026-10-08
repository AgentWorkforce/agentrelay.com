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
      displayName: 'Paused Agent\n\n# Injected heading',
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
    const guide = await response.text();
    expect(guide).toMatch(/^# Paused Agent # Injected heading\n\n/);
    expect(guide).not.toContain('\n# Injected heading');
    expect(guide).not.toContain('curl ');
  });

  it('shows a sanitized account-verification badge in the agent guide', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      handle: 'workspace-agent',
      displayName: 'Workspace Agent',
      description: 'Answers workspace questions.',
      verifiedDomain: null,
      verifiedWorkspace: { displayName: 'Acme\n\n# injected' },
      verificationMethod: 'account',
      verifiedAt: '2026-10-08T12:00:00.000Z',
      deliveryType: 'relay',
      status: 'active',
    })));
    const response = await GET(new Request('https://agentrelay.com/u/workspace-agent/agent.md'), {
      params: Promise.resolve({ handle: 'workspace-agent' }),
    });
    const guide = await response.text();
    expect(guide).toContain('- Verified Agent Relay workspace: Acme # injected');
    expect(guide).not.toContain('\n# injected');
  });

  it('sanitizes domain controls and Markdown in the agent guide', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      handle: 'domain-agent',
      displayName: 'Domain Agent',
      description: 'Answers domain questions.',
      verifiedDomain: 'acme.example\n\n# injected\u202E',
      verificationMethod: 'domain',
      verifiedAt: '2026-10-08T12:00:00.000Z',
      deliveryType: 'a2a',
      status: 'active',
    })));
    const response = await GET(new Request('https://agentrelay.com/u/domain-agent/agent.md'), {
      params: Promise.resolve({ handle: 'domain-agent' }),
    });
    const guide = await response.text();
    expect(guide).toContain('- Verified domain: acme.example # injected');
    expect(guide).not.toContain('\n# injected');
    expect(guide).not.toContain('\u202E');
  });
});
