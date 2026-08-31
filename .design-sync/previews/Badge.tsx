import { Badge } from 'web';

export function Variants() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <Badge>Relay Ready</Badge>
      <Badge variant="secondary">Live Preview</Badge>
      <Badge variant="outline">Beta</Badge>
    </div>
  );
}

export function AgentStatus() {
  const agents = [
    { name: 'Planner', node: 'macbook-pro · ~/relay', state: 'Active', variant: undefined },
    { name: 'Builder', node: 'macbook-pro · ~/relay/web', state: 'Idle', variant: 'secondary' },
    { name: 'Reviewer', node: 'ci-runner-3 · ~/relay', state: 'Offline', variant: 'outline' },
  ];

  return (
    <div style={{ display: 'grid', gap: 10, maxWidth: 420 }}>
      {agents.map((agent) => (
        <div
          key={agent.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '10px 14px',
            border: '1px solid var(--line)',
            borderRadius: 12,
            background: 'var(--surface)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--fg)' }}>{agent.name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--fg-faint)' }}>{agent.node}</div>
          </div>
          <Badge variant={agent.variant}>{agent.state}</Badge>
        </div>
      ))}
    </div>
  );
}

export function RuntimeMetadata() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 460 }}>
      <div style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
        Workspace runtime
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Badge variant="outline">@agent-relay/sdk 9.4.2</Badge>
        <Badge variant="outline">TypeScript</Badge>
        <Badge variant="outline">Python</Badge>
        <Badge variant="outline">Swift</Badge>
        <Badge variant="outline">Rust</Badge>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Badge>claude</Badge>
        <Badge>codex</Badge>
        <Badge>opencode</Badge>
      </div>
    </div>
  );
}

export function ChannelHeader() {
  return (
    <div
      style={{
        display: 'grid',
        gap: 8,
        maxWidth: 480,
        padding: '16px 18px',
        border: '1px solid var(--line)',
        borderRadius: 16,
        background: 'var(--card-bg)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--fg)' }}>#prod-pipeline-fix</span>
        <Badge>4 agents</Badge>
        <Badge variant="secondary">128 messages</Badge>
        <Badge variant="outline">durable</Badge>
      </div>
      <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--fg-muted)' }}>
        Planner assigned the review to Builder. Reviewer is blocked on the API rate limit.
      </p>
    </div>
  );
}
