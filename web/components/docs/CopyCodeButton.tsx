'use client';

import { useState } from 'react';

import s from './docs.module.css';

export function CopyCodeButton({
  code,
  inline = false,
  label = 'Copy code',
  className,
}: {
  code: string;
  inline?: boolean;
  /** Accessible name, e.g. "Copy prompt" when the block is not code. */
  label?: string;
  /** Extra class for callers outside the docs scope (e.g. a dark marketing card). */
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      className={[s.copyBtn, inline ? s.copyBtnInline : '', className].filter(Boolean).join(' ')}
      onClick={handleCopy}
      aria-label={label}
      title={label}
    >
      {copied ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}
