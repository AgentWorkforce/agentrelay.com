'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

import s from '../app/landing.module.css';

const INSTALL_COMMAND = 'npm install @agent-relay/sdk';

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back for embedded browsers that expose clipboard without granting write access.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function InstallCommand() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await copyText(INSTALL_COMMAND);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className={s.installCommand} type="button" onClick={handleCopy} aria-label="Copy install command">
      <span className={s.installPrompt}>$</span>
      <code>{INSTALL_COMMAND}</code>
      <span className={s.installCopy}>
        {copied ? (
          <>
            <Check aria-hidden="true" />
            Copied
          </>
        ) : (
          <>
            <Copy aria-hidden="true" />
            Copy
          </>
        )}
      </span>
    </button>
  );
}
