import s from '../../app/landing.module.css';

/**
 * Decorative and brand SVGs used across the landing page.
 *
 * These stay inline (rather than living in `/public/*.svg`) on purpose:
 * the dividers and underline inherit their stroke from CSS via `currentColor`,
 * and the hero/decorative marks sit above the fold where an extra network
 * request would cause a visible flash. Componentizing them keeps the markup
 * DRY and the section components readable without an external request.
 */

export function GitHubIcon({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/** Self-host / monitor glyph for the deploy cards. */
export function MonitorIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

/** Hosted-cloud glyph for the deploy cards. */
export function CloudIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}

export function OpenClawLogo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M7.5 4.5c-1.4 3.2-1.9 6.4-1.4 9.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path d="M12 3.5c-.7 3.7-.7 7.3 0 10.8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path
        d="M16.5 4.5c1.4 3.2 1.9 6.4 1.4 9.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M5.8 16.8c3.1 2.5 9.3 2.5 12.4 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

/** Official two-tone Python mark for the custom-agent bindings card. */
export function PythonLogo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 256 255" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="howPyTop" x1="12.96%" y1="12.04%" x2="79.64%" y2="78.2%">
          <stop offset="0" stopColor="#387EB8" />
          <stop offset="1" stopColor="#366994" />
        </linearGradient>
        <linearGradient id="howPyBottom" x1="19.13%" y1="20.58%" x2="90.74%" y2="88.43%">
          <stop offset="0" stopColor="#FFE052" />
          <stop offset="1" stopColor="#FFC331" />
        </linearGradient>
      </defs>
      <path
        fill="url(#howPyTop)"
        d="M126.916.072c-64.832 0-60.784 28.115-60.784 28.115l.072 29.128h61.868v8.745H41.631S.145 61.355.145 126.77c0 65.417 36.21 63.097 36.21 63.097h21.61v-30.356s-1.165-36.21 35.632-36.21h61.362s34.475.557 34.475-33.319V33.97S234.681.072 126.916.072zM92.802 19.66a11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13 11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.13z"
      />
      <path
        fill="url(#howPyBottom)"
        d="M128.757 254.126c64.832 0 60.784-28.115 60.784-28.115l-.072-29.127H127.6v-8.745h86.441s41.486 4.705 41.486-60.711c0-65.416-36.21-63.096-36.21-63.096h-21.61v30.355s1.165 36.21-35.632 36.21h-61.362s-34.475-.557-34.475 33.32v56.013s-5.235 33.897 102.518 33.897zm34.114-19.586a11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.131 11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13z"
      />
    </svg>
  );
}

/** TypeScript mark — blue rounded tile with the canonical "TS" lockup. */
export function TypeScriptLogo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#3178C6" />
      <text
        x="12.4"
        y="17.4"
        textAnchor="middle"
        fontFamily="var(--font-geist-mono), ui-monospace, monospace"
        fontWeight="700"
        fontSize="11"
        letterSpacing="-0.5"
        fill="#fff"
      >
        TS
      </text>
    </svg>
  );
}

/** Hand-drawn underline that sits under a single highlighted word in a heading. */
export function ScribbleUnderline() {
  return (
    <svg
      className={s.titleUnderline}
      viewBox="0 0 120 14"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M2 5.5 C40 2.5 80 8.5 118 5.5" />
      <path d="M2 8.5 C40 5.5 80 11.5 118 8.5" />
    </svg>
  );
}

/**
 * Full-bleed wavy line that separates landing sections.
 * `feature` is the thin two-stroke rule between feature blocks; `capability`
 * is the taller three-stroke band that opens the context-capabilities group.
 */
export function WaveDivider({
  variant,
  className,
}: {
  variant: 'feature' | 'capability' | 'a2a';
  /** Extra class merged onto the wrapper — used to reposition via grid `order`. */
  className?: string;
}) {
  if (variant === 'a2a') {
    // A livelier take on the feature wave: a gradient strand that runs blue →
    // pear-green → light-blue, a soft glow, an extra ghost strand, and a gentle
    // drift (see `.a2aSeparatorWaves` in landing.module.css). Tilts the opposite
    // way from the plain separators so it reads as deliberately different.
    return (
      <div
        className={className ? `${s.featureSeparator} ${className}` : s.featureSeparator}
        aria-hidden="true"
      >
        <svg className={s.a2aSeparatorWaves} viewBox="0 0 1200 60" fill="none" preserveAspectRatio="none">
          <defs>
            <linearGradient id="a2aWaveStroke" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#74b8e2" stopOpacity="0" />
              <stop offset="22%" stopColor="#9ccfff" />
              <stop offset="52%" stopColor="#a6d388" />
              <stop offset="80%" stopColor="#74b8e2" />
              <stop offset="100%" stopColor="#74b8e2" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className={s.a2aWaveFlow}>
            <path className={s.a2aWaveLead} d="M-120 30 C150 12 360 14 600 30 S1040 50 1320 28" />
            <path className={s.a2aWaveTrail} d="M-120 38 C168 22 372 24 620 39 S1066 58 1320 36" />
            <path className={s.a2aWaveGhost} d="M-120 22 C140 6 348 8 580 22 S1012 42 1320 18" />
          </g>
        </svg>
      </div>
    );
  }

  if (variant === 'capability') {
    return (
      <div className={s.capabilityDivider} aria-hidden="true">
        <svg
          className={s.capabilityDividerWaves}
          viewBox="0 0 1200 120"
          fill="none"
          preserveAspectRatio="none"
        >
          <path d="M-120 84 C120 42 318 46 560 70 S928 106 1320 24" />
          <path d="M-120 104 C136 60 336 66 580 88 S948 122 1320 46" />
          <path d="M-120 64 C112 24 310 28 540 52 S902 86 1320 8" />
        </svg>
      </div>
    );
  }

  return (
    <div className={className ? `${s.featureSeparator} ${className}` : s.featureSeparator} aria-hidden="true">
      <svg className={s.featureSeparatorWaves} viewBox="0 0 1200 60" fill="none" preserveAspectRatio="none">
        <path d="M-120 26 C160 42 360 40 600 30 S1040 16 1320 34" />
        <path d="M-120 34 C176 50 376 48 620 38 S1060 24 1320 42" />
      </svg>
    </div>
  );
}
