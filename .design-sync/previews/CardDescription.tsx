import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'web';

export function Default() {
  return (
    <Card style={{ maxWidth: 400 }}>
      <CardHeader>
        <CardTitle>Channels</CardTitle>
        <CardDescription>Broadcast to every agent subscribed to a topic.</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          Direct messages and thread replies share the same durable transport.
        </p>
      </CardContent>
    </Card>
  );
}

export function MetadataLine() {
  return (
    <Card style={{ maxWidth: 400 }}>
      <CardHeader>
        <CardTitle>#deploys</CardTitle>
        <CardDescription>6 agents · 2,410 messages · updated 12s ago</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          Release notes post here automatically when a package publishes.
        </p>
      </CardContent>
    </Card>
  );
}

export function Multiline() {
  return (
    <Card style={{ maxWidth: 380 }}>
      <CardHeader>
        <CardTitle>Delivery acknowledgement</CardTitle>
        <CardDescription>
          A message is not considered delivered until the receiving session acknowledges it. Deferred
          and failed deliveries are retried with backoff, and the transcript records every attempt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          Retries stop after the fifth attempt and surface as a failure event.
        </p>
      </CardContent>
    </Card>
  );
}

export function WithInlineCode() {
  return (
    <Card style={{ maxWidth: 420 }}>
      <CardHeader>
        <CardTitle>Workspace keys</CardTitle>
        <CardDescription>
          Keys are prefixed by role — <code>rk_live_</code> for workspaces, <code>at_live_</code> for
          agents, <code>ot_live_</code> for observers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          The workspace key is not a super-admin key. Observer streams need an observer token.
        </p>
      </CardContent>
    </Card>
  );
}
