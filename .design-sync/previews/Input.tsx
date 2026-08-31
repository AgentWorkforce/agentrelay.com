import { Search } from 'lucide-react';
import { Input } from 'web';

export function Default() {
  return (
    <div style={{ maxWidth: 380 }}>
      <Input placeholder="Search agents, docs, or channels" />
    </div>
  );
}

export function SearchField() {
  return (
    <div style={{ position: 'relative', maxWidth: 380 }}>
      <Search
        style={{
          position: 'absolute',
          left: 14,
          top: '50%',
          width: 16,
          height: 16,
          transform: 'translateY(-50%)',
          color: 'var(--fg-faint)',
          pointerEvents: 'none',
        }}
      />
      <Input placeholder="Search agents, docs, or channels" style={{ paddingLeft: 40 }} />
    </div>
  );
}

export function FormField() {
  return (
    <div style={{ display: 'grid', gap: 6, maxWidth: 380 }}>
      <label
        htmlFor="workspace-name"
        style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--fg)' }}
      >
        Workspace name
      </label>
      <Input id="workspace-name" placeholder="prod-pipeline" />
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
        Lowercase letters, numbers and dashes. Used in the workspace URL.
      </p>
    </div>
  );
}

export function Filled() {
  return (
    <div style={{ display: 'grid', gap: 6, maxWidth: 380 }}>
      <label htmlFor="node-id" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--fg)' }}>
        Node id
      </label>
      <Input
        id="node-id"
        defaultValue="node_7f3a91c2e4"
        style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
      />
    </div>
  );
}

export function Invalid() {
  return (
    <div style={{ display: 'grid', gap: 6, maxWidth: 380 }}>
      <label htmlFor="agent-token" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--fg)' }}>
        Agent token
      </label>
      <Input
        id="agent-token"
        aria-invalid
        defaultValue="rk_live_9f3c2a7d"
        style={{ borderColor: '#c44', fontFamily: 'var(--font-geist-mono), monospace' }}
      />
      <p style={{ margin: 0, fontSize: '0.78rem', color: '#c44' }}>
        That is a workspace key. Agent tokens start with <code>at_live_</code>.
      </p>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={{ display: 'grid', gap: 6, maxWidth: 380 }}>
      <label htmlFor="broker-host" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--fg)' }}>
        Messaging host
      </label>
      <Input
        id="broker-host"
        disabled
        defaultValue="cast.agentrelay.com"
        style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
      />
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
        Managed workspaces always resolve to the hosted engine.
      </p>
    </div>
  );
}
