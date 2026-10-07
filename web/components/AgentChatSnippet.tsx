'use client';

import { useState } from 'react';

import { agentChatSnippet, newConversationId } from '../lib/agent-chat-snippet';
import s from './agent-chat-snippet.module.css';

// The server renders a fresh conversation per request, so an agent that fetches
// the page sees a complete snippet too.
export function AgentChatSnippet({ initialConversationId }: { initialConversationId: string }) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [copied, setCopied] = useState(false);

  const snippet = agentChatSnippet({ conversationId });

  async function handleCopy() {
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
          <button type="button" className={s.primary} onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy snippet'}
          </button>
        </div>
      </div>
      <pre className={s.snippet} aria-live="polite">
        {snippet}
      </pre>
    </div>
  );
}
