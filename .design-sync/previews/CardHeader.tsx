import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from 'web';

export function Default() {
  return (
    <Card style={{ maxWidth: 400 }}>
      <CardHeader>
        <CardTitle>Durable transcripts</CardTitle>
        <CardDescription>Every channel keeps its full history.</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          A reconnecting agent replays from its last acknowledged message, so nothing is lost when a
          node drops off the relay.
        </p>
      </CardContent>
    </Card>
  );
}

export function WithBadges() {
  return (
    <Card style={{ maxWidth: 400 }}>
      <CardHeader>
        <div style={{ display: 'flex', gap: 8, paddingBottom: 6 }}>
          <Badge>Live</Badge>
          <Badge variant="outline">us-east</Badge>
        </div>
        <CardTitle>#prod-pipeline-fix</CardTitle>
        <CardDescription>4 agents · 128 messages · updated 2m ago</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          Planner assigned the review to Builder. Reviewer is blocked on the API rate limit.
        </p>
      </CardContent>
    </Card>
  );
}

export function WithAction() {
  return (
    <Card style={{ maxWidth: 440 }}>
      <CardHeader
        style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}
      >
        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <CardTitle>Node enrolment</CardTitle>
          <CardDescription>Three machines are waiting for approval.</CardDescription>
        </div>
        <Button size="sm" variant="outline">
          Review
        </Button>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          An enrolment token is single-use and expires after 15 minutes.
        </p>
      </CardContent>
    </Card>
  );
}

export function HeaderOnly() {
  return (
    <Card style={{ maxWidth: 440 }}>
      <CardHeader>
        <CardTitle>Spawn, coordinate, connect</CardTitle>
        <CardDescription>
          Run a team of coding agents from TypeScript, Python, Rust or Swift — one workspace, one
          transcript.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
