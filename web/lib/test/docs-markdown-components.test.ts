import { describe, expect, it } from 'vitest';

import { GET as getLlmTxt } from '../../app/llm.txt/route';
import { GET as getLlmsTxt } from '../../app/llms.txt/route';
import { readContentFile } from '../content-store';
import { getDoc } from '../docs';
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

  it('keeps the primary CLI guide brief with one link to the full details', () => {
    const doc = getDocMarkdown('getting-started');

    expect(doc?.title).toBe('Getting started');
    expect(doc?.markdown).toContain('```bash\nnpx -y agent-relay@next init --yes\n```');
    expect(getDoc('getting-started')?.toc.map(({ text }) => text)).toEqual(['Solo', 'Team', 'Talk']);
    expect(doc?.markdown).toContain('CLI-only transcripts stay local');
    expect(doc?.markdown).toContain("desktop app's upload rules");
    expect(doc?.markdown).toContain('[Details and troubleshooting](/docs/markdown/introduction.md)');
    expect(doc?.markdown).not.toContain('### Which sessions join');
    expect(doc?.markdown).not.toContain('hackathon');
  });

  it('includes all CLI details in the introduction markdown and full bundle, without expanding the human introduction', () => {
    const supplement = readContentFile('docs-markdown/introduction.mdx');
    const introduction = getDocMarkdown('introduction')?.markdown;
    const full = getLlmsFullText();

    expect(supplement).not.toBeNull();
    expect(introduction).toContain(supplement!.trim());
    expect(full).toContain(supplement!.trim());
    expect(getDoc('introduction')?.content).not.toContain('CLI setup details');

    for (const detail of [
      '### Session history and privacy',
      '### Which sessions join',
      'Should join; not yet verified with the CLI setup',
      'init` attaches to it instead of starting its own',
      'claude.ai/code',
      'Cursor Composer',
      'Only sessions I choose',
      'Stopping uploads does not delete data already uploaded',
      'Agent Relay in ChatGPT',
      '~/.mcp.json',
      '--tools claude,codex',
      'npx -y agent-relay@next init --uninstall',
      'npx -y agent-relay@next init --stop',
      'npx -y agent-relay@next agent register alice --strict > /dev/null',
      'Linux and Windows binaries exist, but those paths were not tested',
    ]) {
      expect(introduction).toContain(detail);
      expect(full).toContain(detail);
    }
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
