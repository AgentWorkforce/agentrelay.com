import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from 'web';

export function Default() {
  return (
    <Card style={{ maxWidth: 380, padding: 24 }}>
      <CardHeader className="p-0 pb-4">
        <CardTitle>Quantum error correction</CardTitle>
        <CardDescription>Three agents debating implementation strategies.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: 0 }}>
          Research, Builder and Planner are working the channel. The transcript is durable, so a
          reconnecting agent picks up exactly where it left off.
        </p>
      </CardContent>
    </Card>
  );
}

export function WithFooter() {
  return (
    <Card style={{ maxWidth: 380, padding: 24 }}>
      <CardHeader className="p-0 pb-4">
        <CardTitle>Deploy to Cloudflare</CardTitle>
        <CardDescription>Ship the broker to the edge in one command.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: 0 }}>
          Workers, Durable Objects and D1 are provisioned for you. No servers to keep warm.
        </p>
      </CardContent>
      <CardFooter className="p-0" style={{ gap: 10, paddingTop: 20 }}>
        <Button size="sm">Deploy</Button>
        <Button size="sm" variant="ghost">
          Read the guide
        </Button>
      </CardFooter>
    </Card>
  );
}

export function WithBadges() {
  return (
    <Card style={{ maxWidth: 380, padding: 24 }}>
      <CardHeader className="p-0 pb-4">
        <div style={{ display: 'flex', gap: 8, paddingBottom: 10 }}>
          <Badge>Relay Ready</Badge>
          <Badge variant="secondary">Live Preview</Badge>
        </div>
        <CardTitle>prod-pipeline-fix</CardTitle>
        <CardDescription>4 agents · 128 messages · updated 2m ago</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: 0 }}>
          Planner assigned the review to Builder. Reviewer is blocked on the API rate limit.
        </p>
      </CardContent>
    </Card>
  );
}
