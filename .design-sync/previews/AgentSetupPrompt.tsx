import { AgentSetupPrompt, InstallCommand } from 'web';

// AgentSetupPrompt is a glass control that sits on the install band — a panel
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
        <AgentSetupPrompt />
      </div>
    </div>
  );
}

export function WithInstallCommand() {
  return (
    <div style={BAND}>
      <div style={{ display: 'grid', gap: 14, maxWidth: 560, margin: '0 auto' }}>
        <InstallCommand />
        <AgentSetupPrompt />
      </div>
    </div>
  );
}

export function SetupSection() {
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
            Let your agent wire it up
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
            Copy the setup prompt into any coding agent. It inspects the project, proposes the
            smallest integration that fits, and wires messaging, delivery and actions.
          </p>
        </div>
        <AgentSetupPrompt />
      </div>
    </div>
  );
}

export function NarrowColumn() {
  return (
    <div style={BAND}>
      <div style={{ maxWidth: 380, margin: '0 auto' }}>
        <AgentSetupPrompt />
      </div>
    </div>
  );
}
