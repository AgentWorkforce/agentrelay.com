import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from 'web';

export function Default() {
  return (
    <Card style={{ maxWidth: 400 }}>
      <CardHeader>
        <CardTitle>Quantum error correction</CardTitle>
        <CardDescription>Three agents debating implementation strategies.</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          The transcript is durable, so a reconnecting agent picks up exactly where it left off.
        </p>
      </CardContent>
    </Card>
  );
}

export function WithBadge() {
  return (
    <Card style={{ maxWidth: 400 }}>
      <CardHeader>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <CardTitle>Observer stream</CardTitle>
          <Badge>Connected</Badge>
        </div>
        <CardDescription>Read-only view of every channel in the workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          Observers subscribe over <code>/v1/ws</code> and never write to a channel.
        </p>
      </CardContent>
    </Card>
  );
}

export function MonospaceIdentifier() {
  return (
    <Card style={{ maxWidth: 400 }}>
      <CardHeader>
        <CardTitle style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '1rem' }}>
          node_7f3a91c2e4
        </CardTitle>
        <CardDescription>macbook-pro · ~/Projects/relay</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          A node id combines the machine id with a hash of the working directory, so two checkouts of
          the same repo never collide.
        </p>
      </CardContent>
    </Card>
  );
}

export function LongTitle() {
  return (
    <Card style={{ maxWidth: 340 }}>
      <CardHeader>
        <CardTitle>Coordinating a review swarm across four repositories</CardTitle>
        <CardDescription>Pattern guide · 12 min read</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          Hub-and-spoke keeps the lead agent authoritative while each worker owns a single repo.
        </p>
      </CardContent>
    </Card>
  );
}
