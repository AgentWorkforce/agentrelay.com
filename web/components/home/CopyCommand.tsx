'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

import s from '../../app/home.module.css';

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Embedded browsers can expose the clipboard API but still block writes.
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

/**
 * The site's one copy-a-command control. A button, shaped like every other
 * interactive element on the page (tail corner, bottom left), that reads out
 * its own state to assistive tech via the polite live region.
 */
export function CopyCommand({ command, tone = 'ground' }: { command: string; tone?: 'ground' | 'lift' }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await copyText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      className={`${s.command} ${tone === 'lift' ? s.commandLift : ''}`}
      type="button"
      onClick={handleCopy}
      aria-label={`Copy the command ${command}`}
    >
      <span className={s.commandPrompt} aria-hidden="true">
        $
      </span>
      <code className={s.commandText}>{command}</code>
      <span className={s.commandAction}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        <span className={s.commandActionLabel} aria-live="polite">
          {copied ? 'Copied' : 'Copy'}
        </span>
      </span>
    </button>
  );
}
