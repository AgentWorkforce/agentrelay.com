'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { agentSignupPrompt } from '../../lib/agent-signup';
import { SITE_URL } from '../../lib/site';
import s from './home-6.module.css';

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Embedded browsers can expose the clipboard API without granting write access.
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
 * The agent-driven Teams signup prompt, copyable in one click. The prompt is
 * built for the page's own origin so local and preview builds point the agent
 * at their own signup guide.
 */
export function CopyPrompt({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const preview = agentSignupPrompt('teams', SITE_URL);

  async function handleCopy() {
    await copyText(agentSignupPrompt('teams', window.location.origin));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      className={`${s.prompt} ${compact ? s.promptCompact : ''}`}
      onClick={() => void handleCopy()}
      aria-label="Copy the setup prompt for your coding agent"
    >
      <span className={s.promptHead}>
        <span className={s.promptLabel}>Have your agent install it</span>
        <span className={s.promptCopy} data-copied={copied || undefined}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? 'Copied — paste into your agent' : 'Copy prompt'}
        </span>
      </span>
      <span className={s.promptText} aria-hidden="true">
        <span className={s.promptCaret}>›</span>
        {preview}
      </span>
    </button>
  );
}
