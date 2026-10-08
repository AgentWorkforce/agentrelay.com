'use client';

import { useState } from 'react';

import { agentChatSnippet, newConversationId } from '../lib/agent-chat-snippet';
import s from './agent-chat-snippet.module.css';

// The server renders a fresh conversation per request, so an agent that fetches
// the page sees a complete snippet too.
export function AgentChatSnippet({ initialConversationId }: { initialConversationId: string }) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [status, setStatus] = useState<'' | 'copied' | 'copy-failed' | 'new'>('');

  const snippet = agentChatSnippet({ conversationId });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setStatus('copied');
      setTimeout(() => setStatus((current) => (current === 'copied' ? '' : current)), 2000);
    } catch {
      setStatus('copy-failed');
    }
  }

  function handleNewConversation() {
    setConversationId(newConversationId());
    setStatus('new');
  }

  return (
    // The snippet carries a private conversation URL: keep it out of session replay.
    <div className={`${s.card} ph-no-capture ph-sensitive`}>
      <div className={s.header}>
        <span className={s.label}>Paste into Claude Code, Codex or Grok</span>
        <div className={s.actions}>
          <button type="button" className={s.secondary} onClick={handleNewConversation}>
            New conversation
          </button>
          <button type="button" className={s.primary} onClick={handleCopy}>
            {status === 'copied' ? 'Copied' : 'Copy snippet'}
          </button>
        </div>
      </div>
      <p className={status === 'copy-failed' ? s.error : s.visuallyHidden} role="status" aria-live="polite">
        {status === 'copied' && 'Snippet copied.'}
        {status === 'new' && 'New conversation created. Copy the snippet again.'}
        {status === 'copy-failed' && 'Copy failed. Select the snippet below and copy it manually.'}
      </p>
      <pre className={s.snippet}>{snippet}</pre>
    </div>
  );
}
