import { afterEach, describe, expect, it, vi } from 'vitest';
import { launchUrl, type Agent } from '../agents';

const agent = { dir: 'review' } as Agent;

describe('launchUrl', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('opens the dashboard agent deploy page with the persona preloaded', () => {
    vi.stubEnv('NEXT_PUBLIC_CLOUD_URL', '');
    const url = new URL(launchUrl(agent), 'https://agentrelay.com');
    expect(url.pathname).toBe('/cloud/dashboard/agents/deploy');
    expect(url.searchParams.get('persona')).toBe(
      'https://github.com/AgentWorkforce/agents/blob/main/review/persona.ts',
    );
  });

  it('uses the configured Cloud origin without a duplicate slash', () => {
    vi.stubEnv('NEXT_PUBLIC_CLOUD_URL', 'https://cloud.example.test/cloud/');
    const url = new URL(launchUrl(agent));
    expect(url.origin + url.pathname).toBe('https://cloud.example.test/cloud/dashboard/agents/deploy');
    expect(url.searchParams.get('persona')).toBe(
      'https://github.com/AgentWorkforce/agents/blob/main/review/persona.ts',
    );
  });
});
