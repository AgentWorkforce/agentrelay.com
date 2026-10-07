'use client';

import { useEffect, useState } from 'react';

import { agentChatSnippet, newConversationId } from '../lib/agent-chat-snippet';
import s from './agent-chat-snippet.module.css';

export function AgentChatSnippet() {
  // Generated in the browser so every visitor gets a private conversation.
  const [conversationId, setConversationId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => setConversationId(newConversationId()), []);

  const snippet = conversationId ? agentChatSnippet({ conversationId }) : '';

  async function handleCopy() {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={s.card}>
      <div className={s.header}>
        <span className={s.label}>Paste into Claude Code or Codex</span>
        <div className={s.actions}>
          <button type="button" className={s.secondary} onClick={() => setConversationId(newConversationId())}>
            New conversation
          </button>
          <button type="button" className={s.primary} onClick={handleCopy} disabled={!snippet}>
            {copied ? 'Copied' : 'Copy snippet'}
          </button>
        </div>
      </div>
      <pre className={s.snippet} aria-live="polite">
        {snippet || 'Creating your conversation…'}
      </pre>
    </div>
  );
}
