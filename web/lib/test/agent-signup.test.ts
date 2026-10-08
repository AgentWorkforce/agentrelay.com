import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../app/signup/agent/[product]/route';
import { agentSignupPrompt } from '../agent-signup';
import { SETUP_SKILLS, SETUP_SKILLS_SOURCE } from '../generated/setup-skills';
import { getRecommendedFlow } from '../recommended-flow-catalog';
// @ts-expect-error -- plain .mjs build script without type declarations
import { renderModule, stripFrontmatter } from '../../scripts/sync-setup-skills.mjs';

const vendored = (name: string) => readFileSync(new URL(`../../content/setup-skills/${name}.md`, import.meta.url), 'utf8');
const pin = JSON.parse(readFileSync(new URL('../../content/setup-skills/SOURCE.json', import.meta.url), 'utf8'));
const guide = async (product: string, url = `https://agentrelay.com/signup/agent/${product}`) =>
  (await GET(new Request(url), { params: Promise.resolve({ product }) })).text();

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
    expect(content).toContain(`signup_source "${product}"`);
    expect(content).toContain('Cloud API base: https://agentrelay.com/cloud');
    expect(content).toContain('/api/v1/auth/device/token');
    expect(content).toContain('/api/v1/auth/whoami');
    expect(content).toContain('/api/v1/auth/token/refresh');
    expect(agentSignupPrompt(product as 'teams' | 'flows', 'https://agentrelay.com')).toContain('Do NOT use computer use, browser automation');
    if (product === 'teams') {
      expect(content).toContain('releases/latest/download');
      expect(content).toContain('AgentRelay-macOS-$relay_arch.dmg');
    } else {
      expect(content).toContain('"mode": "activate"');
      expect(content).toContain('/api/v1/flows/listeners/<agentId>');
    }
  });

  it('vendors exactly the pinned skills, with frontmatter stripped', () => {
    expect(pin.repository).toBe('AgentWorkforce/skills');
    expect(pin.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(SETUP_SKILLS_SOURCE).toEqual({ repository: pin.repository, commit: pin.commit });
    expect(Object.keys(SETUP_SKILLS)).toEqual(pin.skills);
    for (const name of pin.skills) {
      expect(SETUP_SKILLS[name]).toBe(vendored(name));
      expect(SETUP_SKILLS[name].startsWith('# ')).toBe(true);
      expect(SETUP_SKILLS[name]).not.toMatch(/^---\nname:/);
    }
    // The generated module is exactly what the sync script renders from the copies.
    const generated = readFileSync(new URL('../generated/setup-skills.ts', import.meta.url), 'utf8');
    expect(generated).toBe(renderModule(pin, Object.fromEntries(pin.skills.map((name: string) => [name, vendored(name)]))));
    expect(stripFrontmatter('---\nname: x\ndescription: y\n---\n\n# X\n')).toBe('# X\n');
    expect(() => stripFrontmatter('# X\n')).toThrow('frontmatter');
  });

  it.each([
    ['teams', ['signing-in-to-agent-relay-cloud', 'setting-up-agent-relay-desktop', 'setting-up-agent-relay-sessions'], ['Cloud account', 'Desktop', 'Sessions']],
    ['flows', ['signing-in-to-agent-relay-cloud', 'setting-up-agent-relay-flows', 'writing-relayflows'], ['Cloud account', 'Flows', 'Custom flow authoring']],
  ])('renders %s as the signup header followed by the skills verbatim, in order', async (product, skills, labels) => {
    const content = await guide(product);
    expect(content).toContain(`verbatim at commit ${pin.commit}`);
    let cursor = 0;
    skills.forEach((name, index) => {
      const part = content.indexOf(`# Part ${index + 1}: ${labels[index]}\n\n${SETUP_SKILLS[name].trim()}\n`, cursor);
      expect(part, `${name} rendered verbatim as Part ${index + 1}`).toBeGreaterThan(cursor);
      cursor = part;
    });
    expect(content).not.toContain(`# Part ${skills.length + 1}:`);
    // The header keeps only signup-specific rules; no setup step is duplicated before Part 1.
    const header = content.slice(0, content.indexOf('# Part 1:'));
    expect(header).not.toContain('/api/v1/auth/device/start');
    expect(header).not.toContain('hdiutil');
    expect(header).not.toContain('claude mcp add');
    expect(header).not.toContain('/api/v1/flows/deploy');
  });

  it('renders both Teams skills\' headings and claims completion only after the Sessions round trip', async () => {
    const content = await guide('teams');
    const desktop = content.indexOf('# Set Up Agent Relay Desktop');
    const sessions = content.indexOf('# Set Up Agent Relay Session Handoff');
    expect(desktop).toBeGreaterThan(0);
    expect(sessions).toBeGreaterThan(desktop);
    const roundTrip = content.indexOf('## 5. Prove one live round trip', sessions);
    expect(roundTrip).toBeGreaterThan(sessions);
    // Every instruction to PATCH completion is in the header and is tied to Part 3's round trip.
    const header = content.slice(0, content.indexOf('# Part 1:'));
    const completions = [...content.matchAll(/state: complete/g)].map(match => match.index!);
    expect(completions.length).toBeGreaterThan(0);
    for (const index of completions) expect(index).toBeLessThan(header.length);
    expect(header).toContain('Keep step 5 working or waiting until Part 3 proves a\n   live round trip; only then PATCH step: 5, state: complete.');
    expect(header).toContain('A self-verified\n   read path without a teammate is not completion.');
    expect(header).toContain('Setup is complete only in Part 3\'s finished state: a proven live round trip.');
    expect(content.slice(roundTrip)).toContain('Setup is not complete until the full round trip succeeds.');
  });

  it('reads the sharing mode from the desktop and asks before changing an existing one', async () => {
    const content = await guide('teams');
    expect(content).toContain("jq -r '.data.sharing_mode'");
    expect(content).toContain('Never change it silently.');
    expect(content).toContain('sharing_mode: .data.sharing_mode');
    expect(content).toContain('Report\n   waiting while the user decides about an existing sharing mode.');
  });

  it('keeps the agent-relay CLI optional and carries the latency and HTTP-client guidance', async () => {
    const content = await guide('teams');
    expect(content).toContain('do not install or\nupgrade it just for these checks');
    expect(content).not.toMatch(/npm install -g agent-relay/);
    expect(content).toContain('relay-desktop#333');
    expect(content).toContain('60-second timeout');
    expect(content).toContain('Use `curl` or `fetch`');
    expect(content).toContain('cloud#4254');
  });

  it('keeps the local hostname and port for OAuth, APIs, and the dev desktop download', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLOUD_URL', '/cloud');
    const content = await (await GET(new Request('http://127.0.0.1:3199/signup/agent/teams'), {
      params: Promise.resolve({ product: 'teams' }),
    })).text();
    expect(content).toContain('Cloud API base: http://127.0.0.1:3199/cloud');
    expect(content).toContain('http://127.0.0.1:3199/cloud/desktop-downloads/AgentRelay-Dev-macOS-<arch>.dmg');
    expect(content).toContain('relay-socket.dev');
    expect(content).toContain('http://127.0.0.1:3199/cloud/api/v1/mcp/shared-sessions');
    expect(content).not.toContain('https://agentrelay.com/cloud');
    expect(agentSignupPrompt('teams', 'http://127.0.0.1:3199')).toContain('http://127.0.0.1:3199/signup/agent/teams');
  });

  it('uses the browser local hostname when Next normalizes the request URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLOUD_URL', '/cloud');
    const content = await (await GET(new Request('http://localhost:3100/signup/agent/flows', { headers: { host: '127.0.0.1:3100' } }), {
      params: Promise.resolve({ product: 'flows' }),
    })).text();
    expect(content).toContain('Cloud API base: http://127.0.0.1:3100/cloud');
    expect(content).toContain('## Web input — ask on the signup page, never in chat');
  });

  it('ignores an invalid local Host port instead of constructing an invalid URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLOUD_URL', '/cloud');
    const content = await (await GET(new Request('http://localhost:3100/signup/agent/flows', { headers: { host: 'localhost:65536' } }), {
      params: Promise.resolve({ product: 'flows' }),
    })).text();
    expect(content).toContain('Cloud API base: http://localhost:3100/cloud');
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
    const examples = [...content.matchAll(/(?:~~~|```)json\n([\s\S]*?)\n(?:~~~|```)/g)].map(match => JSON.parse(match[1]));
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
    expect(content).toContain('only an entry with kind: flow');
    expect(content).toContain('An entry with kind: extension is discoverable metadata, not a standalone');
    expect(content).toContain('never substitute a standalone flow deployment');
    expect(content).toContain('Ask for the approver\'s');
    expect(content).toContain('GitHub username in plain language');
    expect(content).toContain('Normalize the');
    expect(content).toContain('oauth.connected is true');
    expect(content).toContain('does not require background data indexing');
    expect(content).toContain('flow_credentials_unavailable');
    expect(content).toContain('Do not ask the user to connect');
    expect(content).toContain('internal house-key proxy');
    expect(content).toContain('type: notice');
    expect(content).toContain('completed signup');
    expect(content).not.toContain('deploy Nango syncs');
    expect(content).not.toContain('until ready is true');
    expect(content).not.toContain('<approver email>');
  });
});
