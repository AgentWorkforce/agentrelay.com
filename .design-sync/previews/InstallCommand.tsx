import { InstallCommand } from 'web';

// InstallCommand is a glass control that sits on the install band — a panel
// surface set off from the page background by hairline rules
// (`.installSection` in app/landing.module.css).
const BAND = {
  background: 'var(--surface)',
  borderTop: '1px solid var(--line)',
  borderBottom: '1px solid var(--line)',
  padding: '48px 40px',
};

export function Default() {
  return (
    <div style={BAND}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <InstallCommand />
      </div>
    </div>
  );
}

export function InstallActions() {
  return (
    <div style={BAND}>
      <div style={{ display: 'grid', gap: 14, maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <a
            href="/docs"
            className="btn btn-primary"
            style={{ minHeight: 42, padding: '10px 24px', fontSize: '0.88rem' }}
          >
            Read the docs
          </a>
          <a
            href="https://github.com/agentworkforce/relay"
            className="btn btn-secondary"
            style={{ minHeight: 42, padding: '10px 24px', fontSize: '0.88rem' }}
          >
            GitHub
          </a>
        </div>
        <InstallCommand />
      </div>
    </div>
  );
}

export function QuickStart() {
  return (
    <div style={BAND}>
      <div style={{ display: 'grid', gap: 18, maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-heading), sans-serif',
              fontSize: '2rem',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
              color: 'var(--fg)',
            }}
          >
            Make it yours with the SDK
          </h2>
          <p
            style={{
              maxWidth: '54ch',
              margin: 0,
              fontSize: '0.98rem',
              lineHeight: 1.55,
              color: 'var(--fg-muted)',
            }}
          >
            Use the Agent Relay SDK for channels, DMs, threads, and realtime events inside your
            product or infrastructure.
          </p>
        </div>
        <InstallCommand />
      </div>
    </div>
  );
}
