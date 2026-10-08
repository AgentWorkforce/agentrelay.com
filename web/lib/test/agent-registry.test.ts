import { describe, expect, it, vi } from 'vitest';

import { fetchAgentProfile, validRegistryHandle } from '../agent-registry';

const PROFILE = {
  handle: 'acme-support',
  displayName: 'Acme Support',
  description: 'Answers questions about Acme products.',
  verifiedDomain: 'acme.example',
  verifiedAt: '2026-10-07T12:00:00.000Z',
  deliveryType: 'relay',
  status: 'active',
};

describe('public agent registry profiles', () => {
  it('fetches a valid profile without caching it', async () => {
    const fetcher = vi.fn(async () => Response.json(PROFILE));
    await expect(fetchAgentProfile('acme-support', fetcher as typeof fetch)).resolves.toEqual(PROFILE);
    expect(fetcher).toHaveBeenCalledWith(
      'https://arelay.to/api/v1/agents/acme-support',
      expect.objectContaining({ cache: 'no-store', headers: { accept: 'application/json' } }),
    );
  });

  it('maps only a registry 404 to an unknown handle', async () => {
    const missing = vi.fn(async () => new Response('missing', { status: 404 }));
    await expect(fetchAgentProfile('missing', missing as typeof fetch)).resolves.toBeNull();
    const unavailable = vi.fn(async () => new Response('down', { status: 503 }));
    await expect(fetchAgentProfile('missing', unavailable as typeof fetch))
      .rejects.toThrow('Agent registry returned 503');
  });

  it('rejects malformed handles and untrusted response shapes', async () => {
    const fetcher = vi.fn(async () => Response.json({ ...PROFILE, handle: 'another-agent' }));
    expect(validRegistryHandle('Acme')).toBe(false);
    expect(validRegistryHandle('-acme')).toBe(false);
    expect(validRegistryHandle('acme-support')).toBe(true);
    await expect(fetchAgentProfile('Acme', fetcher as typeof fetch)).resolves.toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    await expect(fetchAgentProfile('acme-support', fetcher as typeof fetch))
      .rejects.toThrow('invalid profile');
  });

  it('caps profile bodies', async () => {
    const fetcher = vi.fn(async () => new Response('x'.repeat(16_001)));
    await expect(fetchAgentProfile('acme-support', fetcher as typeof fetch))
      .rejects.toThrow('size limit');
  });
});
