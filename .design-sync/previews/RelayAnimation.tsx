import { RelayAnimation } from 'web';

// A canvas ambient field: drifting nodes on a warm oatmeal ground, with pulses
// travelling the links between them. It fills its parent, so every cell gives
// it an explicitly sized box.
export function SectionBackdrop() {
  return (
    <div style={{ width: '100%', height: 340, borderRadius: 16, overflow: 'hidden' }}>
      <RelayAnimation />
    </div>
  );
}

export function BehindContent() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 320,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--line)',
      }}
    >
      <RelayAnimation />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          textAlign: 'center',
          padding: 32,
        }}
      >
        {/* The canvas paints its own warm oatmeal ground in every theme, so
            copy over it uses --accent-ink rather than the themed --fg. */}
        <h2 style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.03em', color: 'var(--accent-ink)' }}>
          The future is multi-agent.
        </h2>
        <p
          style={{
            margin: 0,
            maxWidth: 420,
            color: 'var(--accent-ink)',
            opacity: 0.72,
            fontSize: '0.95rem',
          }}
        >
          Every agent on the relay, every message durable, every handoff observable.
        </p>
      </div>
    </div>
  );
}

export function CardBanner() {
  return (
    <div
      style={{
        maxWidth: 360,
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid var(--line)',
        background: 'var(--card-bg)',
      }}
    >
      <div style={{ height: 160 }}>
        <RelayAnimation />
      </div>
      <div style={{ padding: 20, display: 'grid', gap: 6 }}>
        <span style={{ fontWeight: 600 }}>Relay mesh</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--fg-muted)' }}>
          28 nodes, links forming and dropping as agents come and go.
        </span>
      </div>
    </div>
  );
}
