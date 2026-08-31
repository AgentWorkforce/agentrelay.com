import { LogoIcon } from 'web';

// The mark is sized by its own CSS-module class (34×28 in the nav) and coloured
// by --nav-logo-mark, so size variants scale that intrinsic box rather than
// taking props.
const MARK_W = 34;
const MARK_H = 28;

function MarkAt({ scale, label }: { scale: number; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ width: MARK_W * scale, height: MARK_H * scale, display: 'flex' }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'left top', display: 'flex' }}>
          <LogoIcon />
        </div>
      </div>
      <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', letterSpacing: '0.02em' }}>{label}</span>
    </div>
  );
}

export function Sizes() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 40,
        alignItems: 'flex-end',
        padding: 28,
        borderRadius: 16,
        background: 'var(--section-bg)',
      }}
    >
      <MarkAt scale={1} label="34×28 · nav" />
      <MarkAt scale={2} label="68×56" />
      <MarkAt scale={4} label="136×112" />
    </div>
  );
}

export function InFooterLockup() {
  // The footer is where the mark goes monochrome: .logo svg pins both marks to
  // 22px and paints them --footer-fg.
  return (
    <div style={{ background: 'var(--footer-bg)', borderRadius: 16, padding: '32px 36px' }}>
      <span className="site_footer_logo">
        <LogoIcon />
      </span>
      <p style={{ margin: '14px 0 0', fontSize: '0.85rem', color: 'var(--footer-muted)' }}>
        The future is multi-agent.
      </p>
    </div>
  );
}

export function OnLightSurface() {
  // The site ships dark, but the mark still has to work on a light ground
  // (print, slide decks, a light-themed embed). Those are the light theme's own
  // values for these two custom properties, not a hand-mixed colour.
  const lightInk: CSSProperties = {
    ['--nav-logo-mark']: 'var(--primary-500)',
    ['--nav-logo-wordmark']: 'var(--accent-ink)',
  } as CSSProperties;

  return (
    <div
      style={{
        display: 'flex',
        gap: 32,
        alignItems: 'center',
        padding: 32,
        borderRadius: 16,
        background: 'var(--primary-50)',
        ...lightInk,
      }}
    >
      <div style={{ width: MARK_W * 2, height: MARK_H * 2, display: 'flex' }}>
        <div style={{ transform: 'scale(2)', transformOrigin: 'left top', display: 'flex' }}>
          <LogoIcon />
        </div>
      </div>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--accent-ink)', maxWidth: 300 }}>
        On a light ground the mark stays brand blue — the same treatment the light token set applies.
      </p>
    </div>
  );
}

export function AppTile() {
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 22,
          background: 'var(--primary-500)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="site_footer_logo" style={{ transform: 'scale(1.8)', display: 'flex' }}>
          <LogoIcon />
        </span>
      </div>
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 22,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ transform: 'scale(1.4)', display: 'flex' }}>
          <LogoIcon />
        </div>
      </div>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--fg-muted)', maxWidth: 260 }}>
        The mark alone carries the app tile and the favicon — reversed out of brand blue, or brand blue on
        an elevated surface.
      </p>
    </div>
  );
}
