import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { prerender } from 'react-dom/static';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../components/SiteNav', () => ({ SiteNav: () => null }));
vi.mock('../../components/SiteFooter', () => ({ SiteFooter: () => null }));

import RegisterAgentPage, {
  dynamic as registerDynamic,
  metadata as registerMetadata,
} from '../../app/agents/register/page';
import RegisterChecklistPage, { metadata as checklistMetadata } from '../../app/agents/register/checklist/page';
import { GET as getChecklistMarkdown } from '../../app/agents/register/checklist.md/route';
import { generateStaticParams as agentSlugParams } from '../../app/agents/[slug]/page';
import sitemap from '../../app/sitemap';
import {
  REGISTER_CHECKLIST_BODY,
  REGISTER_CHECKLIST_MARKDOWN,
  REGISTER_CHECKLIST_TITLE,
  REGISTER_PROMPT,
} from '../agent-register';
import { allAgentSlugs, getAgent } from '../agents';

const TITLE = 'Put your company agent on arelay.to';
const PROMPT = 'Register our company agent on arelay.to: fetch https://arelay.to/register and follow it.';
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function decode(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');
}

async function renderAsync(element: React.ReactElement): Promise<string> {
  const { prelude } = await prerender(element);
  return new Response(prelude).text();
}

describe('/agents/register', () => {
  const html = renderToStaticMarkup(<RegisterAgentPage />);
  const text = decode(html);

  it('uses the exact title for the h1 and metadata, with a canonical and OG card', () => {
    expect(text).toMatch(new RegExp(`<h1[^>]*>${TITLE}</h1>`));
    expect(registerMetadata.title).toBe(TITLE);
    expect(registerMetadata.alternates?.canonical).toBe('https://agentrelay.com/agents/register');
    expect(registerMetadata.openGraph?.title).toBe(TITLE);
    expect(JSON.stringify(registerMetadata.openGraph?.images)).toContain('/og/agent-relay-default-');
    expect(String(registerMetadata.description).length).toBeGreaterThan(80);
  });

  it('shows the exact prompt with a copy button that copies it', () => {
    expect(REGISTER_PROMPT).toBe(PROMPT);
    expect(text).toContain(`>${PROMPT}</pre>`);
    expect(html).toMatch(/<button[^>]*aria-label="Copy prompt"/);
  });

  it('offers domain or Agent Relay workspace verification, with both badges', () => {
    expect(text).not.toContain('Coming soon');
    expect(text).toContain('✓ verified domain: example.com');
    expect(text).toContain('re-checked every 30 days');
    expect(text).toContain('No domain? Verify through your Agent Relay Cloud workspace');
    expect(text).toContain('✓ verified Agent Relay workspace: Example Co');
  });

  it('has the relay-native disclosure section, linked from the relay-native option', () => {
    expect(html).toMatch(/<section id="relay-native-access"/);
    expect(text).toContain('What the relay-native token can access');
    expect(text).toContain('Agent Relay does not yet offer a narrower send-only credential.');
    expect(text).toContain('agent-relay agent remove arelay-delivery');
    expect(html).toContain('href="#relay-native-access"');
  });

  it('links the live example, the agent guide and the checklist', () => {
    expect(html).toContain('href="https://arelay.to/agent-relay"');
    // Browsers on arelay.to/register are sent to this page; ?format=md opens the raw guide.
    expect(html).toContain('href="https://arelay.to/register?format=md"');
    expect(html).toContain('href="https://agentrelay.com/directory"');
    expect(html).toContain('Browse verified agents');
    expect(html).toContain('href="https://agentrelay.com/agents/register/checklist"');
  });
});

describe('/agents/register/checklist', () => {
  it('serves the shared checklist as text/markdown', async () => {
    const response = getChecklistMarkdown();
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    const markdown = await response.text();
    expect(markdown).toBe(REGISTER_CHECKLIST_MARKDOWN);
    expect(markdown.startsWith(`# ${REGISTER_CHECKLIST_TITLE}\n\n${REGISTER_CHECKLIST_BODY}`)).toBe(true);
    expect(markdown).toContain(PROMPT);
    expect(markdown).toContain('_arelay-challenge.<your-domain>');
    expect(markdown).toContain('arelay-verify=');
    expect(markdown).toContain('/.well-known/arelay-verification.txt');
    expect(markdown).toContain('within 24 hours');
    expect(markdown).toContain('No domain? Agent Relay workspace');
    expect(markdown).toContain('workspace name');
    expect(markdown).toContain('About 10 minutes of agent work');
    expect(markdown).toContain('holds your handle for 24 hours');
    expect(markdown).toContain('hello@agentrelay.com');
    expect(markdown).toContain('https://arelay.to/agent-relay');
    expect(markdown.trimEnd().split('\n').length).toBeLessThanOrEqual(30);
  });

  it('renders the same Markdown on the page', async () => {
    const html = await renderAsync(await RegisterChecklistPage());
    const text = decode(html);
    expect(text).toMatch(new RegExp(`<h1[^>]*>${REGISTER_CHECKLIST_TITLE}</h1>`));
    expect(text).toContain(PROMPT);
    expect(html).toMatch(/<button[^>]*aria-label="Copy code"/);
    expect(text).toContain('<code>_arelay-challenge.<your-domain></code>');
    expect(text).toContain('A pending registration holds your handle for 24 hours.');
    expect(html).toContain('href="mailto:hello@agentrelay.com"');
    expect(html).toContain('href="https://agentrelay.com/agents/register/checklist.md"');
    expect(checklistMetadata.alternates?.canonical).toBe('https://agentrelay.com/agents/register/checklist');
  });
});

describe('routing and discovery', () => {
  it('is a static segment that is not shadowed by app/agents/[slug]', async () => {
    // Next.js matches a static segment before a dynamic one at the same level,
    // so app/agents/register/page.tsx wins as long as it exists...
    expect(existsSync(path.join(webRoot, 'app/agents/register/page.tsx'))).toBe(true);
    expect(registerDynamic).toBe('force-static');
    // ...and no gallery agent is named "register" (or "register/checklist").
    expect(allAgentSlugs()).not.toContain('register');
    expect(getAgent('register')).toBeUndefined();
    expect((await agentSlugParams()).map((p) => p.slug)).not.toContain('register');
  });

  it('lists both pages in the sitemap', () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain('https://agentrelay.com/agents/register');
    expect(urls).toContain('https://agentrelay.com/agents/register/checklist');
    expect(urls.filter((url) => url === 'https://agentrelay.com/agents/register')).toHaveLength(1);
  });
});
