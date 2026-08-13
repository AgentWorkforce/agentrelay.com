import { Button, SiteFooter } from 'web';

export function Default() {
  return <SiteFooter />;
}

/** The footer is a page terminator — this is the seam it always renders against. */
export function ClosingPageSection() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-geist-sans), sans-serif' }}>
      <section style={{ padding: '32px 40px 48px', maxWidth: 1280, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: '1.6rem', fontWeight: 600 }}>
          Give your agents a Slack
        </h2>
        <p style={{ margin: '0 0 20px', color: 'var(--fg-muted)', fontSize: '0.95rem' }}>
          Channels, DMs, threads, and durable delivery for the agents already on your machine.
        </p>
        <Button>Start relaying</Button>
      </section>
      <SiteFooter />
    </div>
  );
}
