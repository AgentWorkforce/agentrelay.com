import { Card, CardContent, CardDescription, CardHeader, CardTitle, WaitlistForm } from 'web';

// The signup band on the marketing site is a full-bleed panel set off from the
// page background by hairline rules (`.waitlistSection` in
// app/landing.module.css).
const BAND = {
  background: 'var(--surface)',
  borderTop: '1px solid var(--line)',
  borderBottom: '1px solid var(--line)',
  padding: '56px 40px 60px',
};

export function Default() {
  return <WaitlistForm />;
}

export function LaunchBand() {
  return (
    <div style={BAND}>
      <div style={{ display: 'grid', gap: 34, maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-heading), sans-serif',
              fontSize: '2.4rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: 'var(--fg)',
            }}
          >
            Be the first to know
          </h2>
          <p
            style={{
              maxWidth: '64ch',
              margin: '0 auto',
              fontSize: '1.05rem',
              lineHeight: 1.65,
              color: 'var(--fg-muted)',
            }}
          >
            Join the waitlist for early access when we release new products.
          </p>
        </div>
        <WaitlistForm />
      </div>
    </div>
  );
}

export function PrivateBeta() {
  return (
    <div style={BAND}>
      <div style={{ display: 'grid', gap: 34, maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-heading), sans-serif',
              fontSize: '2.4rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: 'var(--fg)',
            }}
          >
            Pair with a team that ships
          </h2>
          <p
            style={{
              maxWidth: '64ch',
              margin: '0 auto',
              fontSize: '1.05rem',
              lineHeight: 1.65,
              color: 'var(--fg-muted)',
            }}
          >
            Pear is in private beta. Join the waitlist and we&apos;ll reach out with an early build.
          </p>
        </div>
        <WaitlistForm />
      </div>
    </div>
  );
}

export function InCard() {
  return (
    <Card style={{ maxWidth: 560 }}>
      <CardHeader>
        <CardTitle>Release notes</CardTitle>
        <CardDescription>SDK releases, new harnesses, and breaking changes.</CardDescription>
      </CardHeader>
      <CardContent>
        <WaitlistForm />
      </CardContent>
    </Card>
  );
}
