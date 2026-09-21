'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Copy, Terminal } from 'lucide-react';
import { AgentToolLogo } from './AgentToolLogos';
import { agentSignupPrompt, type AgentSignupProduct } from '../lib/agent-signup';
import { SITE_URL } from '../lib/site';
import s from './agent-signup.module.css';

const agents = [
  { id: 'any', label: 'Agent setup' },
  { id: 'claude', label: 'Claude Code' },
  { id: 'codex', label: 'Codex' },
  { id: 'opencode', label: 'OpenCode' },
] as const;

export function AgentSignup({ product }: { product: AgentSignupProduct }) {
  const [origin, setOrigin] = useState(SITE_URL);
  const [agent, setAgent] = useState<(typeof agents)[number]>(agents[0]);
  const [message, setMessage] = useState('');
  const prompt = useRef<HTMLTextAreaElement>(null);
  const text = agentSignupPrompt(product, origin);
  const copied = message.startsWith('Copied.');

  useEffect(() => { setOrigin(window.location.origin); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(agentSignupPrompt(product, window.location.origin));
      setMessage('Copied. Paste it into your agent to get started.');
    } catch {
      prompt.current?.focus();
      prompt.current?.select();
      setMessage('Select and copy the prompt, then paste it into your agent.');
    }
  }

  return (
    <section className={s.root} aria-label="Sign up with your agent">
      <div className={s.agents} role="group" aria-label="Choose your coding agent">
        {agents.map((option) => (
          <button
            className={s.agent}
            key={option.id}
            type="button"
            aria-pressed={agent.id === option.id}
            onClick={() => { setAgent(option); setMessage(''); }}
          >
            {option.id === 'any'
              ? <Terminal className={s.logo} aria-hidden="true" />
              : <AgentToolLogo className={s.logo} provider={option.id} />}
            {option.label}
          </button>
        ))}
      </div>
      <div className={s.panel}>
        <p className={s.heading}>Let your agent take it from here.</p>
        <p className={s.instructions}>
          Copy and paste this prompt into {agent.id === 'any' ? 'your coding agent' : agent.label}.
          {' '}It handles setup. You approve sign-in and connections.
        </p>
        <div className={s.promptRow}>
          <textarea ref={prompt} aria-label="Agent signup prompt" value={text} readOnly rows={4} />
          <button className={s.copy} type="button" onClick={() => void copy()} aria-label="Copy prompt">
            {copied ? <Check size={20} aria-hidden="true" /> : <Copy size={20} aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className={s.footer}>
          <p className={s.status} role="status">{message || (product === 'teams'
            ? 'Use an agent on your Mac to install and connect the app.'
            : 'Use an agent with terminal access to configure your first flow.')}</p>
          <a href={`/signup/agent/${product}`}>Read agent instructions <ArrowUpRight size={14} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}
