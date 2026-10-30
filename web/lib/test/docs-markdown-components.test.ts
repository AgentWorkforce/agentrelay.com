import { describe, expect, it } from 'vitest';

import { GET as getLlmTxt } from '../../app/llm.txt/route';
import { GET as getLlmsTxt } from '../../app/llms.txt/route';
import { getDocMarkdown, getLlmsFullText, getLlmsText } from '../docs-markdown';

describe('docs markdown export for MDX components', () => {
  it('renders cards and banner links without leaking JSX', () => {
    const doc = getDocMarkdown('introduction');

    expect(doc).not.toBeNull();
    expect(doc?.markdown).not.toContain('<Card');
    expect(doc?.markdown).not.toContain('<CardGroup');
    expect(doc?.markdown).not.toContain('<BannerLink');
    expect(doc?.markdown).toContain('[Sessions](https://agentrelay.com/docs/sessions)');
    expect(doc?.markdown).toContain('[Forward deployed agents](https://agentrelay.com/docs/forward-deployed-agents)');
    expect(doc?.markdown).toContain('[Flows](https://agentrelay.com/docs/flows)');
    expect(doc?.markdown).toContain('[For agents](https://agentrelay.com/docs/agents)');
    expect(doc?.markdown).toContain(
      '[Connect your agents from the command line.](https://agentrelay.com/docs/getting-started)'
    );
  });

  it('builds a standards-style llms.txt index', () => {
    const llms = getLlmsText();

    expect(llms).toContain('# Agent Relay');
    expect(llms).toContain('https://agentrelay.com/llms-full.txt');
    expect(llms).toContain('https://agentrelay.com/docs/markdown/quickstart.md');
    expect(llms).toContain('https://agentrelay.com/docs/markdown/getting-started.md');
    expect(llms.indexOf('/markdown/getting-started.md')).toBeLessThan(llms.indexOf('/markdown/quickstart.md'));
    expect(llms).toContain('https://agentrelay.com/docs/markdown/relay-connect.md');
    expect(llms).toContain('## For agents');
    expect(llms).toContain('https://agentrelay.com/docs/markdown/agents.md');
    expect(llms).not.toContain('https://agentrelay.com/docs/7.1.1/introduction');
  });

  it('exports the primary CLI guide with its privacy caveat and optional desktop link', () => {
    const doc = getDocMarkdown('getting-started');

    expect(doc?.title).toBe('Getting started');
    expect(doc?.markdown).toContain('```bash\nnpx -y agent-relay@next init --yes\n```');
    expect(doc?.markdown).toContain('## Session history and privacy');
    expect(doc?.markdown).toContain('## Which sessions join');
    expect(doc?.markdown).toContain('Should join; not yet verified with the CLI setup');
    expect(doc?.markdown).toContain('init` attaches to it instead of starting its own');
    expect(doc?.markdown).toContain('[Desktop setup](/docs/quickstart)');
    expect(doc?.markdown).not.toContain('hackathon');
  });

  it('exports the Relay Connect public guide', () => {
    const doc = getDocMarkdown('relay-connect');

    expect(doc).not.toBeNull();
    expect(doc?.markdown).toContain('personal Agent Relay Cloud sign-in');
    expect(doc?.markdown).toContain('https://agentrelay.com/connect');
    expect(doc?.markdown).toContain('Guests do not sign in');
    expect(doc?.markdown).not.toContain('npx -y @agent-relay/connect');
    expect(doc?.markdown).toContain('## Privacy and safety');
    expect(doc?.markdown).toContain('`connect_expired`');
    expect(doc?.markdown).toContain('`connect_full`');
  });

  it('serves the singular and plural llms paths as the same content', async () => {
    await expect(getLlmTxt().text()).resolves.toBe(await getLlmsTxt().text());
  });

  it('builds a full docs bundle from current docs', () => {
    const full = getLlmsFullText();

    expect(full).toContain('# Agent Relay Full Documentation');
    expect(full).toContain('## Documentation');
    expect(full).not.toContain('## Archived Documentation: v7.1.1');
    expect(full).toContain('Markdown endpoint: https://agentrelay.com/docs/markdown/quickstart.md');
    expect(full).not.toContain('Rendered page: https://agentrelay.com/docs/7.1.1/introduction');
    expect(full).not.toContain('<Card');
    expect(full).not.toContain('<Note');
    expect(full).not.toContain('<Warning');
    expect(full).not.toContain('<SpawnOptionsTable');
  });
});
