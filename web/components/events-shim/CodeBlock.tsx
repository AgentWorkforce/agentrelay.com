'use client';

import { useState } from 'react';

import s from './events-shim.module.css';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={s.copy}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* Clipboard blocked; the text is selectable. */
        }
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

export function CodeBlock({ code }: { code: string }) {
  return (
    <div className={s.codeBlock}>
      <pre>
        <code>{code}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  );
}
