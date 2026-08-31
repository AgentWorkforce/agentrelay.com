import { SdkCodeExample } from 'web';

// Self-contained: the TypeScript/Python tabs and the sample relay script are
// baked in. Framing is the only thing a caller controls.
export function Default() {
  return (
    <div style={{ maxWidth: 640 }}>
      <SdkCodeExample />
    </div>
  );
}

export function InSection() {
  return (
    <div
      style={{
        maxWidth: 640,
        display: 'grid',
        gap: 16,
        padding: 28,
        borderRadius: 16,
        background: 'var(--section-bg)',
      }}
    >
      <div style={{ display: 'grid', gap: 6 }}>
        <h3 style={{ margin: 0, fontSize: '1.35rem', letterSpacing: '-0.02em' }}>
          Spawn a team in a few lines
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          One relay, two harnesses, a shared channel — the same script in either language.
        </p>
      </div>
      <SdkCodeExample />
    </div>
  );
}

export function FullWidth() {
  // The block fills its container; the sample lines are ~78 columns, so a wide
  // container is the one width where nothing scrolls horizontally.
  return (
    <div style={{ maxWidth: 860 }}>
      <SdkCodeExample />
    </div>
  );
}
