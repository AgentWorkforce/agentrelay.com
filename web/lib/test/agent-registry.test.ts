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

  it('accepts account-only and dual-verification profiles without exposing account ids', async () => {
    const accountProfile = {
      ...PROFILE,
      verifiedDomain: null,
      verifiedWorkspace: {
        displayName: 'Acme Workspace',
        accountId: 'private-account-id-sentinel',
      },
      verificationMethod: 'account',
      accountId: 'private-account-id-sentinel',
    };
    const accountFetcher = vi.fn(async () => Response.json(accountProfile));
    const { accountId: _accountId, ...accountProfileWithoutTopLevelId } = accountProfile;
    const expectedAccountProfile = {
      ...accountProfileWithoutTopLevelId,
      verifiedWorkspace: { displayName: 'Acme Workspace' },
    };
    await expect(fetchAgentProfile('acme-support', accountFetcher as typeof fetch))
      .resolves.toEqual(expectedAccountProfile);

    const bothProfile = {
      ...PROFILE,
      verifiedWorkspace: { displayName: 'Acme Workspace' },
      verificationMethod: 'both',
    };
    const bothFetcher = vi.fn(async () => Response.json(bothProfile));
    await expect(fetchAgentProfile('acme-support', bothFetcher as typeof fetch))
      .resolves.toEqual(bothProfile);
  });

  it('rejects inconsistent verification claims', async () => {
    const fetcher = vi.fn(async () => Response.json({
      ...PROFILE,
      verifiedDomain: null,
      verifiedWorkspace: null,
      verificationMethod: 'account',
    }));
    await expect(fetchAgentProfile('acme-support', fetcher as typeof fetch))
      .rejects.toThrow('invalid profile');

    for (const verificationMethod of [undefined, 'domain']) {
      const domainWithWorkspace = vi.fn(async () => Response.json({
        ...PROFILE,
        verifiedWorkspace: { displayName: 'Impersonated Workspace' },
        ...(verificationMethod ? { verificationMethod } : {}),
      }));
      await expect(fetchAgentProfile('acme-support', domainWithWorkspace as typeof fetch))
        .rejects.toThrow('invalid profile');
    }
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
    let pulls = 0;
    let canceled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new TextEncoder().encode('x'.repeat(8_001)));
        if (pulls === 3) controller.close();
      },
      cancel() {
        canceled = true;
      },
    });
    const fetcher = vi.fn(async () => new Response(body));
    await expect(fetchAgentProfile('acme-support', fetcher as typeof fetch))
      .rejects.toThrow('size limit');
    expect(canceled).toBe(true);
  });
});
