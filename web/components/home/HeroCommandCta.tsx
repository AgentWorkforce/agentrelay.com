'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

import s from '../../app/landing.module.css';

const HERO_COMMAND = 'npx agent-relay@latest skills add';

async function copyCommand() {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(HERO_COMMAND);
      return;
    } catch {
      // Embedded browsers can expose clipboard but still block writes.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = HERO_COMMAND;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function HeroCommandCta() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await copyCommand();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={s.heroCommandGroup}>
      <span className={s.heroCommandIntro}>
        Run our interactive onboarding to try it with your agent right now
      </span>
      <button className={s.heroCommandCta} type="button" onClick={handleCopy}>
        <span className={s.heroCommandPrompt}>$</span>
        <code className={s.heroCommandText}>{HERO_COMMAND}</code>
        <span className={s.heroCommandCopyButton} aria-hidden="true">
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        </span>
        <span className={s.heroCommandCopied} aria-live="polite">
          {copied ? 'Copied' : 'Copy'}
        </span>
      </button>
    </div>
  );
}
