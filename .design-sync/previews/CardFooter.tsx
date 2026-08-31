import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from 'web';

export function Actions() {
  return (
    <Card style={{ maxWidth: 400 }}>
      <CardHeader>
        <CardTitle>Deploy to Cloudflare</CardTitle>
        <CardDescription>Ship the hosted engine to the edge in one command.</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          Workers, Durable Objects and D1 are provisioned for you. No servers to keep warm.
        </p>
      </CardContent>
      <CardFooter style={{ gap: 10 }}>
        <Button size="sm">Deploy</Button>
        <Button size="sm" variant="ghost">
          Read the guide
        </Button>
      </CardFooter>
    </Card>
  );
}

export function MetaAndAction() {
  return (
    <Card style={{ maxWidth: 420 }}>
      <CardHeader>
        <CardTitle>ci-runner-3</CardTitle>
        <CardDescription>Enrolled 6 days ago · ~/relay</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          The node token was last rotated on 2 May. Rotating revokes every session on this machine.
        </p>
      </CardContent>
      <CardFooter style={{ justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--fg-faint)' }}>Last seen 4m ago</span>
        <Button size="sm" variant="outline">
          Rotate token
        </Button>
      </CardFooter>
    </Card>
  );
}

export function FullWidthAction() {
  return (
    <Card style={{ maxWidth: 360 }}>
      <CardHeader>
        <CardTitle>Team plan</CardTitle>
        <CardDescription>Unlimited channels and hosted observers.</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--fg)' }}>$40</span>
          <span style={{ fontSize: '0.86rem', color: 'var(--fg-muted)' }}>per seat / month</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Start free trial</Button>
      </CardFooter>
    </Card>
  );
}

export function WithStatus() {
  return (
    <Card style={{ maxWidth: 420 }}>
      <CardHeader>
        <CardTitle>Nightly parity audit</CardTitle>
        <CardDescription>TypeScript, Python, Rust and Swift SDKs.</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          Two surfaces drifted: thread replies are missing from the Swift SDK, and reactions are
          untyped in Python.
        </p>
      </CardContent>
      <CardFooter style={{ justifyContent: 'space-between', gap: 12 }}>
        <Badge variant="secondary">2 gaps</Badge>
        <Button size="sm" variant="ghost">
          Open report
        </Button>
      </CardFooter>
    </Card>
  );
}
