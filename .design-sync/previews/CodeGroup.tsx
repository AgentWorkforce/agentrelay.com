import type { ReactNode } from 'react';
import { CodeGroup, DocsLanguageProvider } from 'web';

// Tab labels come from the code fence, which `lib/docs` rewrites into an
// `ar-meta__` token on the <code> class before MDX renders it. Reproducing the
// token here is what makes the tabs read "Preset"/"Nango" instead of "Tab 1".
function fence(language: string, label?: string) {
  const params = new URLSearchParams({ lang: language });
  if (label) params.set('label', label);
  return `language-ar-meta__${params.toString()}`;
}

// `.codeGroupPanel pre` only resets the frame; the padding and code colours
// come from the docs article container the group is rendered inside.
function Article({ children }: { children: ReactNode }) {
  return (
    <div className="docs_article" style={{ maxWidth: 620 }}>
      <DocsLanguageProvider>{children}</DocsLanguageProvider>
    </div>
  );
}

export function LabeledTabs() {
  return (
    <Article>
      <CodeGroup>
        <pre>
          <code className={fence('yaml', 'Preset')}>{`agents:
  - name: reviewer
    cli: claude
    permissions: readonly`}</code>
        </pre>
        <pre>
          <code className={fence('yaml', 'Inline')}>{`agents:
  - name: writer
    cli: codex
    permissions:
      access: restricted
      files:
        read: ['src/**']
        write: ['docs/**']`}</code>
        </pre>
      </CodeGroup>
    </Article>
  );
}

export function ThreeTabs() {
  return (
    <Article>
      <CodeGroup>
        <pre>
          <code className={fence('text', 'Nango')}>{`workspace_id         relayfile workspace id
provider             e.g. notion or github
connection_id        existing Nango connection id
provider_config_key  Nango provider config key`}</code>
        </pre>
        <pre>
          <code className={fence('text', 'Composio')}>{`api_key              Composio API key
connection_id        existing connected-account id`}</code>
        </pre>
        <pre>
          <code className={fence('text', 'Pipedream')}>{`project_id           Pipedream Connect project
connection_id        existing account id`}</code>
        </pre>
      </CodeGroup>
    </Article>
  );
}

// TypeScript/Python groups are language-linked: the tab strip is hidden and the
// panel follows the reader's docs language instead.
export function LanguageLinked() {
  return (
    <Article>
      <CodeGroup>
        <pre>
          <code className={fence('typescript', 'TypeScript')}>{`const relay = new AgentRelay({ channels: ['general'] });

await relay.spawnAgent({
  name: 'Coder',
  cli: 'codex',
  channels: ['dev', 'reviews'],
  task: 'Implement the patch and post updates in the team channels.',
});`}</code>
        </pre>
        <pre>
          <code className={fence('python', 'Python')}>{`relay = AgentRelay(channels=["general"])

await relay.codex.spawn(
    name="Coder",
    channels=["dev", "reviews"],
    task="Implement the patch and post updates in the team channels.",
)`}</code>
        </pre>
      </CodeGroup>
    </Article>
  );
}

// One child is a passthrough — the group frame and tabs disappear entirely.
export function SingleBlock() {
  return (
    <Article>
      <CodeGroup>
        <pre>
          <code className={fence('bash')}>{`agent-relay node enrol --workspace rk_live_… --name macbook-pro`}</code>
        </pre>
      </CodeGroup>
    </Article>
  );
}
