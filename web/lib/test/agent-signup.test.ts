import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../app/signup/agent/[product]/route';
import { agentSignupPrompt } from '../agent-signup';

afterEach(() => vi.unstubAllEnvs());

describe('agent signup instructions', () => {
  it.each(['teams', 'flows'])('serves complete %s instructions without cookies or JavaScript', async (product) => {
    vi.stubEnv('NEXT_PUBLIC_CLOUD_URL', '/cloud');
    const response = await GET(new Request(`https://agentrelay.com/signup/agent/${product}`), {
      params: Promise.resolve({ product }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('cache-control')).toBe('no-store');
    const content = await response.text();
    expect(content).toContain(`"signup_source":"${product}"`);
    expect(content).toContain('Cloud API base: https://agentrelay.com/cloud');
    expect(content).toContain('/api/v1/auth/device/token');
    expect(content).toContain('/api/v1/auth/whoami');
    expect(content).toContain('/api/v1/auth/token/refresh');
    if (product === 'teams') {
      expect(content).toContain('--selected-sessions-only --json');
      expect(content).toContain('releases/latest/download/AgentRelay-macOS-<arch>.dmg');
    } else {
      expect(content).toContain('"mode": "activate"');
      expect(content).toContain('/api/v1/flows/listeners/<agentId>');
    }
  });

  it('keeps the local hostname and port for OAuth, APIs, and the dev desktop download', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLOUD_URL', '/cloud');
    const content = await (await GET(new Request('http://127.0.0.1:3199/signup/agent/teams'), {
      params: Promise.resolve({ product: 'teams' }),
    })).text();
    expect(content).toContain('Cloud API base: http://127.0.0.1:3199/cloud');
    expect(content).toContain('http://127.0.0.1:3199/cloud/desktop-downloads/AgentRelay-Dev-macOS-<arch>.dmg');
    expect(content).not.toContain('releases/latest/download');
    expect(agentSignupPrompt('teams', 'http://127.0.0.1:3199')).toContain('http://127.0.0.1:3199/signup/agent/teams');
  });

  it.each(['unknown', 'Teams', 'flows/extra'])('returns 404 for unsupported product %s', async (product) => {
    const response = await GET(new Request('https://agentrelay.com/signup/agent/unknown'), {
      params: Promise.resolve({ product }),
    });
    expect(response.status).toBe(404);
  });

  it('keeps the public apex when served through the router HTTP fallback', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLOUD_URL', '/cloud');
    const content = await (await GET(new Request('https://origin-web.agentrelay.com/signup/agent/teams'), {
      params: Promise.resolve({ product: 'teams' }),
    })).text();
    expect(content).toContain('Cloud API base: https://agentrelay.com/cloud');
    expect(content).not.toContain('origin-web.agentrelay.com');
  });
});
