import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../app/signup/agent/[product]/route';
import { agentSignupPrompt } from '../agent-signup';
import { SETUP_SKILLS, SETUP_SKILLS_SOURCE } from '../generated/setup-skills';
import { getRecommendedFlow } from '../recommended-flow-catalog';
// @ts-expect-error -- plain .mjs build script without type declarations
import { readInstalledSkills, renderModule, SETUP_SKILL_NAMES, stripFrontmatter } from '../../scripts/generate-setup-skills.mjs';

const repoRoot = new URL('../../../', import.meta.url);
const lockText = readFileSync(new URL('prpm.lock', repoRoot), 'utf8');
const lock = JSON.parse(lockText);
const entry = (name: string) => lock.packages[`@agent-relay/${name}#claude`];
const installed = (name: string) => stripFrontmatter(readFileSync(new URL(entry(name).installedPath, repoRoot), 'utf8'));
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
    // cloud#4254: the edge 403s Python urllib's default User-Agent.
    expect(content).toContain('Send a User-Agent naming your tool');
    expect(content).toContain('Python-urllib');
    expect(agentSignupPrompt(product as 'teams' | 'flows', 'https://agentrelay.com')).toContain('Do NOT use computer use, browser automation');
    // The prompt must carry it too: a blocked client never reads the guide.
    expect(agentSignupPrompt(product as 'teams' | 'flows', 'https://agentrelay.com')).toContain('sending a User-Agent that names your tool');
    if (product === 'teams') {
      expect(content).toContain('releases/latest/download');
      expect(content).toContain('AgentRelay-macOS-$relay_arch.dmg');
    } else {
      expect(content).toContain('"mode": "activate"');
      expect(content).toContain('/api/v1/flows/listeners/<agentId>');
    }
  });

  it('bundles exactly the prpm-installed skills pinned in prpm.lock, with frontmatter stripped', async () => {
    const versions = Object.fromEntries(SETUP_SKILL_NAMES.map((name: string) => [name, entry(name).version]));
    expect(SETUP_SKILLS_SOURCE).toEqual({ registry: 'prpm', packages: versions });
    expect(Object.keys(SETUP_SKILLS)).toEqual(SETUP_SKILL_NAMES);
    for (const name of SETUP_SKILL_NAMES) {
      expect(entry(name).resolved).toMatch(/^https:\/\/registry\.prpm\.dev\//);
      expect(SETUP_SKILLS[name]).toBe(installed(name));
      expect(SETUP_SKILLS[name].startsWith('# ')).toBe(true);
      expect(SETUP_SKILLS[name]).not.toMatch(/^---\nname:/);
    }
    // The generated module is exactly what the generator renders from the installed files.
    const generated = readFileSync(new URL('../generated/setup-skills.ts', import.meta.url), 'utf8');
    expect(generated).toBe(renderModule(versions, Object.fromEntries(SETUP_SKILL_NAMES.map((name: string) => [name, installed(name)]))));
    await expect(readInstalledSkills('{"packages":{}}', async () => '')).rejects.toThrow('is not in prpm.lock');
    expect(stripFrontmatter('---\nname: x\ndescription: y\n---\n\n# X\n')).toBe('# X\n');
    expect(() => stripFrontmatter('# X\n')).toThrow('frontmatter');
  });

  it.each([
    ['teams', ['signing-in-to-agent-relay-cloud', 'setting-up-agent-relay-desktop', 'setting-up-agent-relay-sessions'], ['Cloud account', 'Desktop', 'Sessions']],
    ['flows', ['signing-in-to-agent-relay-cloud', 'setting-up-agent-relay-flows', 'writing-relayflows'], ['Cloud account', 'Flows', 'Custom flow authoring']],
  ])('renders %s as the signup header followed by the skills verbatim, in order', async (product, skills, labels) => {
    const content = await guide(product);
    expect(content).toContain('verbatim as published to the prpm registry');
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

  it('keeps Flows on the v2 engine: it may warn about @relayflows/core but never imports or installs it', async () => {
    const content = await guide('flows');
    expect(content).toContain('@relayflows/surface');
    expect(content).not.toMatch(/\b(?:from\s+|import\s*(?:\(\s*)?)['"]@relayflows\/core['"]/);
    expect(content).not.toMatch(/(?:npm|pnpm|yarn|bun)\s+(?:i|install|add)\b[^\n]*@relayflows\/core/);
    expect(content).not.toMatch(/require\(\s*['"]@relayflows\/core['"]\s*\)/);
    // The only mentions are writing-relayflows' warning against the older engine.
    const header = content.slice(0, content.indexOf('# Part 1:'));
    expect(header).not.toContain('@relayflows/core');
    expect(content.slice(0, content.indexOf('# Part 3:'))).not.toContain('@relayflows/core');
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
    expect(content).toContain("jq -r '.data.sharing_mode // empty'");
    // The defaults keep the reported mode unless the human chose another; nothing forces new.
    expect(content).not.toContain('relay_sharing_mode=new');
    expect(content).toContain('"${relay_sharing_mode:?set relay_sharing_mode to the mode chosen in section 4}"');
    expect(content).toContain('Never change it silently.');
    expect(content).toContain('sharing_mode: .data.sharing_mode');
    expect(content).toContain('Report\n   waiting while the user decides about an existing sharing mode.');
  });

  it('keeps the agent-relay CLI optional and carries the latency and HTTP-client guidance', async () => {
    const content = await guide('teams');
    expect(content).toContain('do not install or upgrade it just for these checks');
    expect(content).toContain("case \"$relay_cli\" in ''|/usr/bin/agent-relay) relay_cli= ;; esac");
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
    // Part 2's executable desktop commands target the Dev app, not production.
    expect(content).not.toContain('relay-desktop-releases');
    expect(content).not.toMatch(/com\.agentrelay\.desktop(?!\.dev)/);
    expect(content).not.toMatch(/relay-socket(?!\.dev)"/);
    expect(content).not.toContain('Agent Relay.app');
    expect(content).toContain('"$release/AgentRelay-Dev-macOS-$relay_arch.dmg"');
    expect(content).toContain('http://127.0.0.1:3199/cloud/api/v1/mcp/shared-sessions');
    expect(content).not.toContain('https://agentrelay.com/cloud');
    expect(agentSignupPrompt('teams', 'http://127.0.0.1:3199')).toContain('http://127.0.0.1:3199/signup/agent/teams');
  });

  it.each(['https://preview.example.com', 'http://staging.example.com'])('keeps the release desktop app for %s, which is not the local stack', async (origin) => {
    const content = await guide('teams', `${origin}/signup/agent/teams`);
    expect(content).toContain('relay-desktop-releases/releases/latest/download');
    expect(content).toContain('"$release/AgentRelay-macOS-$relay_arch.dmg"');
    expect(content).not.toContain('Agent Relay Dev.app');
    expect(content).not.toContain('com.agentrelay.desktop.dev');
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
