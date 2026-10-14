/** Small inline glyphs for the /home-7 concept. All decorative; callers label them. */

export function ConductorMark({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M1 1h10v3H4v4h7v3H1z" fill="currentColor" />
    </svg>
  );
}

export function PhoneMark({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.5 18h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M3 8h9M8.5 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClipboardMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="5" y="4" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 4.5V3h6v1.5M9 11h6M9 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SearchMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.5 15.5 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
