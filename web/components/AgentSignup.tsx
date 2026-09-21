'use client';

import { useRef, useState } from 'react';
import { agentSignupPrompt, type AgentSignupProduct } from '../lib/agent-signup';
import { SITE_URL } from '../lib/site';
import s from './agent-signup.module.css';

export function AgentSignup({ product }: { product: AgentSignupProduct }) {
  const [origin, setOrigin] = useState(SITE_URL);
  const [message, setMessage] = useState('');
  const prompt = useRef<HTMLTextAreaElement>(null);
  const text = agentSignupPrompt(product, origin);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Copied. Paste it into your agent.');
    } catch {
      prompt.current?.focus();
      prompt.current?.select();
      setMessage('Select and copy the prompt, then paste it into your agent.');
    }
  }

  return (
    <details className={s.root} onToggle={(event) => {
      if (event.currentTarget.open) {
        setOrigin(window.location.origin);
        setMessage('');
      }
    }}>
      <summary>Set up with my agent <span aria-hidden="true">↗</span></summary>
      <div className={s.panel}>
        <p>Paste this into your coding agent. It handles setup; you approve sign-in and connections.</p>
        <textarea ref={prompt} aria-label="Agent signup prompt" value={text} readOnly rows={5} />
        <div className={s.actions}>
          <button type="button" onClick={() => void copy()}>Copy prompt</button>
          <a href={`/signup/agent/${product}`}>Read agent instructions</a>
        </div>
        <p className={s.status} role="status">{message}</p>
      </div>
    </details>
  );
}
