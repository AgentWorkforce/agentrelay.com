import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../app/signup/agent/[product]/route';
import { agentSignupPrompt } from '../agent-signup';
import { getRecommendedFlow } from '../recommended-flow-catalog';

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
    expect(agentSignupPrompt(product as 'teams' | 'flows', 'https://agentrelay.com')).toContain('Do NOT use computer use, browser automation');
    if (product === 'teams') {
      expect(content).toContain('--selected-sessions-only --json');
      expect(content).toContain('releases/latest/download/AgentRelay-macOS-<arch>.dmg');
      expect(content).toContain('site_url, account_id, and\nworkspace_id');
      expect(content).toContain('last_cycle');
      expect(content).toContain('SOURCE:SESSION_ID');
      expect(content).toContain('will report a conflict, not switch accounts');
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

  it('uses the direct-source listener body and a provider-addressable approver', async () => {
    const content = await (await GET(new Request('https://agentrelay.com/signup/agent/flows'), {
      params: Promise.resolve({ product: 'flows' }),
    })).text();
    const examples = [...content.matchAll(/~~~json\n([\s\S]*?)\n~~~/g)].map(match => JSON.parse(match[1]));
    const deploy = examples.find(body => body.mode === 'activate');
    const flow = getRecommendedFlow('software-factory')!;
    expect(deploy).toMatchObject({
      workflow: flow.id,
      source: expect.any(String),
      handoffId: expect.any(String),
      repository: { owner: 'acme', name: 'api' },
      sources: [{ ...flow.defaultTrigger, settings: { ...flow.defaultTrigger.settings, repository: 'acme/api' } }],
      inputs: { approver: 'github:@octocat', agents: flow.inputs.defaults.agents },
    });
    expect(deploy).not.toHaveProperty('flowId');
    expect(deploy).not.toHaveProperty('repositories');
    expect(content).toContain('one deployment per');
    expect(content).not.toContain('<approver email>');
  });
});
