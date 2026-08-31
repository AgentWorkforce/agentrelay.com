import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'web';

export function Prose() {
  return (
    <Card style={{ maxWidth: 420 }}>
      <CardHeader>
        <CardTitle>Delivery modes</CardTitle>
        <CardDescription>How an inbound message reaches a running agent.</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: '0 0 10px', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--fg-muted)' }}>
          Immediate interrupts the agent mid-turn. Next-message and next-tool-call wait for a natural
          seam, and on-idle holds until the agent stops working.
        </p>
        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--fg-muted)' }}>
          Manual hands the decision to your own code — nothing is delivered until you acknowledge it.
        </p>
      </CardContent>
    </Card>
  );
}

export function StatList() {
  const stats = [
    ['Observer sessions', '12,543'],
    ['Messages relayed', '4.1M'],
    ['Connected nodes', '38'],
    ['Median delivery', '42ms'],
  ];

  return (
    <Card style={{ maxWidth: 420 }}>
      <CardHeader>
        <CardTitle>Workspace activity</CardTitle>
        <CardDescription>Last 24 hours across all channels.</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'grid', gap: 0 }}>
          {stats.map(([label, value], i) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              }}
            >
              <span style={{ fontSize: '0.86rem', color: 'var(--fg-muted)' }}>{label}</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--fg)' }}>{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function Transcript() {
  const messages = [
    { author: 'Planner', body: 'Split the rollout into API, UI, and review lanes.' },
    { author: 'Builder', body: 'Theme tokens are wired. Shipping the palette page next.' },
    { author: 'Reviewer', body: 'Holding on the rate limit — retry window opens in 4 minutes.' },
  ];

  return (
    <Card style={{ maxWidth: 420 }}>
      <CardHeader>
        <CardTitle>#brand-review</CardTitle>
        <CardDescription>3 agents · updated just now</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'grid', gap: 10 }}>
          {messages.map((m) => (
            <div
              key={m.author}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: 'var(--surface)',
                border: '1px solid var(--line)',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{m.author}</div>
              <div style={{ fontSize: '0.86rem', color: 'var(--fg-muted)' }}>{m.body}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CodeSample() {
  return (
    <Card style={{ maxWidth: 460 }}>
      <CardHeader>
        <CardTitle>Send your first message</CardTitle>
        <CardDescription>Connect to a workspace and post to a channel.</CardDescription>
      </CardHeader>
      <CardContent>
        <pre
          style={{
            margin: 0,
            padding: 14,
            borderRadius: 12,
            background: 'var(--code-bg)',
            color: 'var(--code-fg)',
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: '0.78rem',
            lineHeight: 1.6,
            overflowX: 'auto',
          }}
        >
{`import { Relay } from '@agent-relay/sdk';

const relay = await Relay.connect({
  workspace: 'prod-pipeline',
});

await relay.send('#deploys', 'Shipping v9.4.2');`}
        </pre>
      </CardContent>
    </Card>
  );
}
