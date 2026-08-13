import type { ReactNode } from 'react';
import { CodeGroup, DocsLanguageProvider, TableOfContents } from 'web';

/**
 * DocsLanguageProvider is a context provider with no markup of its own. What
 * it does is keep every language-aware consumer on a page in sync — the
 * TypeScript/Python selector in the table of contents and every CodeGroup —
 * and persist that choice to localStorage. So each cell renders the real docs
 * composition: a code group plus the rail that switches it.
 */

const STORAGE_KEY = 'agent-relay-docs-language';

/**
 * The provider hydrates from localStorage on mount. Seeding it during render
 * (before the provider's effect runs) is what makes each cell deterministic —
 * the capture reuses one browser context across cells.
 */
function seedLanguage(language: 'typescript' | 'python') {
  window.localStorage.setItem(STORAGE_KEY, language);
  (window as { __dsPathname?: string }).__dsPathname = '/docs/sending-messages';
}

const tocItems = [
  { id: 'send-a-message', text: 'Send a message', level: 2 },
  { id: 'addressing', text: 'Addressing an agent', level: 2 },
  { id: 'channels', text: 'Channels', level: 3 },
  { id: 'threads', text: 'Threads', level: 3 },
  { id: 'delivery', text: 'Delivery guarantees', level: 2 },
];

const codeStyle = {
  margin: 0,
  padding: '0.95rem 1.1rem',
  fontSize: '0.82rem',
  lineHeight: 1.65,
  color: 'var(--fg)',
  overflowX: 'auto' as const,
};

const typescriptSnippet = `import { Relaycast } from '@relaycast/sdk';

const relay = new Relaycast({ token: process.env.AGENT_TOKEN });

await relay.send({
  channel: 'general',
  text: 'Builder finished the migration — review is yours.',
});`;

const pythonSnippet = `import os
from relaycast import Relaycast

relay = Relaycast(token=os.environ["AGENT_TOKEN"])

relay.send(
    channel="general",
    text="Builder finished the migration — review is yours.",
)`;

const cliSnippet = `agent-relay send --channel general \\
  --text "Builder finished the migration — review is yours."`;

function DocsPage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 40,
        alignItems: 'flex-start',
        padding: 24,
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--font-geist-sans), sans-serif',
      }}
    >
      {children}
    </div>
  );
}

function Article({ children }: { children: ReactNode }) {
  return (
    <div style={{ flex: '1 1 380px', minWidth: 0 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 600 }}>Send a message</h2>
      <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
        Every SDK sends the same message envelope. The docs render the language you picked, and the
        choice follows you to every other page.
      </p>
      {children}
    </div>
  );
}

export function TypeScriptDocs() {
  seedLanguage('typescript');
  return (
    <DocsLanguageProvider>
      <DocsPage>
        <Article>
          <CodeGroup>
            <pre data-label="TypeScript" style={codeStyle}>
              <code>{typescriptSnippet}</code>
            </pre>
            <pre data-label="Python" style={codeStyle}>
              <code>{pythonSnippet}</code>
            </pre>
          </CodeGroup>
        </Article>
        <div style={{ width: 200, flex: '0 0 200px' }}>
          <TableOfContents items={tocItems} />
        </div>
      </DocsPage>
    </DocsLanguageProvider>
  );
}

export function PythonDocs() {
  seedLanguage('python');
  return (
    <DocsLanguageProvider>
      <DocsPage>
        <Article>
          <CodeGroup>
            <pre data-label="TypeScript" style={codeStyle}>
              <code>{typescriptSnippet}</code>
            </pre>
            <pre data-label="Python" style={codeStyle}>
              <code>{pythonSnippet}</code>
            </pre>
          </CodeGroup>
        </Article>
        <div style={{ width: 200, flex: '0 0 200px' }}>
          <TableOfContents items={tocItems} />
        </div>
      </DocsPage>
    </DocsLanguageProvider>
  );
}

/**
 * A group whose tabs are not all languages keeps its tab strip — the provider
 * only takes over selection when every tab is a language it knows.
 */
export function MixedTabsKeepTheirTabStrip() {
  seedLanguage('python');
  return (
    <DocsLanguageProvider>
      <DocsPage>
        <Article>
          <CodeGroup>
            <pre data-label="CLI" style={codeStyle}>
              <code>{cliSnippet}</code>
            </pre>
            <pre data-label="TypeScript" style={codeStyle}>
              <code>{typescriptSnippet}</code>
            </pre>
          </CodeGroup>
          <CodeGroup>
            <pre data-label="TypeScript" style={codeStyle}>
              <code>{typescriptSnippet}</code>
            </pre>
            <pre data-label="Python" style={codeStyle}>
              <code>{pythonSnippet}</code>
            </pre>
          </CodeGroup>
        </Article>
        <div style={{ width: 200, flex: '0 0 200px' }}>
          <TableOfContents items={tocItems} />
        </div>
      </DocsPage>
    </DocsLanguageProvider>
  );
}
