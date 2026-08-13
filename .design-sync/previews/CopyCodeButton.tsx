import { CopyCodeButton } from 'web';

const ENROL = `agent-relay node enrol \\
  --workspace rk_live_8f2c… \\
  --name macbook-pro`;

const CONFIG = `{
  "mcpServers": {
    "agent-relay": {
      "command": "agent-relay",
      "args": ["mcp"],
      "env": { "AGENT_RELAY_TOKEN": "at_live_…" }
    }
  }
}`;

// The default button is absolutely positioned against `.codeWrapper`, and the
// code frame itself is drawn by the docs article container.
export function OnCodeBlock() {
  return (
    <div className="docs_article" style={{ maxWidth: 520 }}>
      <div className="docs_codeWrapper">
        <CopyCodeButton code={ENROL} />
        <pre>
          <code>{ENROL}</code>
        </pre>
      </div>
    </div>
  );
}

// A fenced block with a filename gets a header strip instead, and the button
// switches to its borderless inline form.
export function InFilenameHeader() {
  return (
    <div className="docs_article" style={{ maxWidth: 520 }}>
      <div className="docs_codeWrapper docs_codeWrapperWithHeader">
        <div className="docs_codeBlockHeader">
          <div className="docs_codeBlockHeaderMeta">
            <span className="docs_codeBlockBadge">JSON</span>
            <span className="docs_codeBlockFilename">.mcp.json</span>
          </div>
          <CopyCodeButton code={CONFIG} inline />
        </div>
        <pre>
          <code>{CONFIG}</code>
        </pre>
      </div>
    </div>
  );
}

export function InlineNextToText() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        maxWidth: 420,
        padding: '8px 12px',
        border: '1px solid var(--line)',
        borderRadius: 8,
        background: 'var(--card-bg)',
        color: 'var(--fg-muted)',
        fontSize: '0.84rem',
        fontWeight: 600,
      }}
    >
      <span style={{ flex: 1 }}>Agent token</span>
      <code style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>at_live_…</code>
      <CopyCodeButton code="at_live_9c41d7e2b6" inline />
    </div>
  );
}
