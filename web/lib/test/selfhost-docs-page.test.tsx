import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/docs/self-hosting',
}));
vi.mock('../../components/docs/TableOfContents', () => ({ TableOfContents: () => null }));
vi.mock('../../components/docs/DocsPageActions', () => ({ DocsPageActions: () => null }));

import SelfHostingPage, { dynamicParams, generateMetadata, generateStaticParams } from '../../app/docs/self-hosting/[[...slug]]/page';
import { renderSelfhostMarkdown } from '../selfhost-markdown';

async function render(slug?: string[]) {
  return renderToStaticMarkup(await SelfHostingPage({ params: Promise.resolve({ slug }) }));
}

describe('self-hosting docs page', () => {
  it('is prerendered for every guide and 404s anything else', async () => {
    expect(dynamicParams).toBe(false);
    expect(generateStaticParams().length).toBeGreaterThan(30);
    await expect(render(['nope'])).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(render(['agents', 'nope'])).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('renders the overview publicly, with the guide list and the guided install', async () => {
    const html = await render();
    expect(html).toContain('Self-hosting Agent Relay');
    expect(html).toContain('href="/docs/self-hosting/install-eks"');
    expect(html).toContain('href="/docs/self-hosting/install-gke"');
    expect(html).toContain('href="/docs/self-hosting/agents"');
    expect(html).toContain('selfhost:guided-eks-install');
    expect(html).toContain('claude mcp add --transport http agent-relay');
    expect(html).not.toContain('ph-sensitive');
    expect(html).not.toContain('Request access');
  });

  it('renders a guide for humans without agent callouts', async () => {
    const html = await render(['install-eks']);
    expect(html).toContain('<h1>Install on EKS</h1>');
    expect(html).toContain('Done when');
    expect(html).toContain('https://agentrelay.com/self-hosting/files/eks');
    expect(html).not.toContain('ASK THE HUMAN');
    expect(html).toContain('href="/docs/self-hosting/agents/install-eks"');
  });

  it('renders the agent runbook with its checkpoints and agent links', async () => {
    const html = await render(['agents', 'install-eks']);
    expect(html).toContain('Agent runbook');
    expect(html).toContain('ASK THE HUMAN');
    expect(html).toContain('href="/docs/self-hosting/agents/existing-rds"');
    expect(html).toContain('href="/docs/self-hosting/install-eks"');
  });

  it('renders the agent rules index', async () => {
    const html = await render(['agents']);
    expect(html).toContain('Never print, log, paste or summarize a secret');
    expect(html).toContain('href="/docs/self-hosting/agents/install-gke"');
  });

  it('is indexable, with a canonical URL and a Markdown alternate', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: ['install-gke'] }) });
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe('https://agentrelay.com/docs/self-hosting/install-gke');
    expect(metadata.alternates?.types).toEqual({ 'text/markdown': 'https://agentrelay.com/docs/self-hosting/install-gke.md' });
    const agent = await generateMetadata({ params: Promise.resolve({ slug: ['agents', 'install-gke'] }) });
    expect(String(agent.title)).toContain('agent runbook');
  });
});

describe('renderSelfhostMarkdown', () => {
  it('renders GFM safely: no raw HTML, scripts or unsafe links, unique heading ids', () => {
    const { content, toc } = renderSelfhostMarkdown(
      [
        '## Install',
        '',
        '```sh',
        'helm upgrade --install agent-relay charts/agent-relay -f values.yaml',
        '```',
        '',
        '| Key | Value |',
        '| --- | --- |',
        '| a | b |',
        '',
        '<script>alert(1)</script>',
        '',
        '[bad](javascript:alert(1)) [good](https://github.com/AgentWorkforce/infra) [slashy](/\\evil.example)',
        '',
        '## Install',
      ].join('\n')
    );
    const html = renderToStaticMarkup(<>{content}</>);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="https://github.com/AgentWorkforce/infra"');
    // The backslash is percent-encoded into a same-site path, never a protocol-relative URL.
    expect(html).not.toMatch(/href="\/\/|href="\/\\/);
    expect(html).toContain('<table>');
    expect(html).toContain('helm upgrade --install');
    expect(toc.map((item) => item.id)).toEqual(['install', 'install-1']);
  });
});
