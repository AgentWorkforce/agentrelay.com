import type { CSSProperties } from 'react';
import { LogoIcon, LogoWordmark } from 'web';

// The wordmark's CSS-module class pins it to 24px tall with auto width
// (viewBox 264×54 → ~117px wide) and paints it --nav-logo-wordmark, so size
// variants scale that intrinsic box.
const WORD_W = 117;
const WORD_H = 24;

function WordmarkAt({ scale, label }: { scale: number; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ width: WORD_W * scale, height: WORD_H * scale, display: 'flex' }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'left top', display: 'flex' }}>
          <LogoWordmark />
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
        flexWrap: 'wrap',
        padding: 28,
        borderRadius: 16,
        background: 'var(--section-bg)',
      }}
    >
      <WordmarkAt scale={1} label="24px · nav" />
      <WordmarkAt scale={1.75} label="42px" />
      <WordmarkAt scale={2.5} label="60px" />
    </div>
  );
}

export function NavLockup() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 20px',
        borderRadius: 14,
        background: 'var(--nav-solid-bg)',
        border: '1px solid var(--nav-border)',
      }}
    >
      <LogoIcon />
      <LogoWordmark />
    </div>
  );
}

export function InFooterLockup() {
  // The footer lockup is the wordmark's monochrome rule made concrete: mark and
  // wordmark both at 22px, both --footer-fg, over --footer-bg.
  return (
    <div style={{ background: 'var(--footer-bg)', borderRadius: 16, padding: '32px 36px' }}>
      <span className="site_footer_logo">
        <LogoIcon />
        <LogoWordmark />
      </span>
      <p style={{ margin: '14px 0 0', fontSize: '0.85rem', color: 'var(--footer-muted)' }}>
        The wordmark is always white here — never tinted, never outlined.
      </p>
    </div>
  );
}

export function OnLightSurface() {
  // The counterpart to the always-white rule: on a light ground the wordmark
  // goes to --accent-ink and the mark to --primary-500, which is exactly what
  // the light token set assigns. Never a white wordmark on light.
  const lightInk: CSSProperties = {
    ['--nav-logo-mark']: 'var(--primary-500)',
    ['--nav-logo-wordmark']: 'var(--accent-ink)',
  } as CSSProperties;

  return (
    <div
      style={{
        borderRadius: 16,
        padding: '32px 36px',
        background: 'var(--primary-50)',
        ...lightInk,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LogoIcon />
        <LogoWordmark />
      </div>
      <p style={{ margin: '14px 0 0', fontSize: '0.85rem', color: 'var(--accent-ink)' }}>
        Light ground: ink wordmark, brand-blue mark.
      </p>
    </div>
  );
}

export function OnBrandBlue() {
  return (
    <div style={{ background: 'var(--primary-500)', borderRadius: 16, padding: '32px 36px' }}>
      <span className="site_footer_logo">
        <LogoIcon />
        <LogoWordmark />
      </span>
    </div>
  );
}
