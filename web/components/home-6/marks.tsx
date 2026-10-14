/** Conductor's mark: the open-sided square from its app chrome. */
export function ConductorMark({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M1 1h10v3H4v4h7v3H1z" fill="currentColor" />
    </svg>
  );
}

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
