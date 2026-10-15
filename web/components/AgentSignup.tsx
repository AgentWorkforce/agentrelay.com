'use client';

import { useSignupAnalytics } from './useSignupAnalytics';
import { Grok } from './brand-icons';
import { AgentToolLogo } from './AgentToolLogos';
import type { AgentSignupProduct } from '../lib/agent-signup';
import s from './agent-signup.module.css';

/** Agent logos that take turns in one spot. `mono` draws them as white
 *  silhouettes; OpenCode's block keeps its window cut out so it reads as a mark. */
export function AgentIcons({ mono = false }: { mono?: boolean }) {
  return (
    <span className={`${s.icons} ${mono ? s.mono : ''}`} aria-hidden="true">
      <span><AgentToolLogo provider="codex" className={s.logo} /></span>
      <span><AgentToolLogo provider="claude" className={s.logo} /></span>
      <span><Grok size={24} /></span>
      <span>
        {mono ? (
          <svg viewBox="0 0 24 24" className={s.logo}>
            <path d="M4 2h16v20H4zM8 6v6h8V6z" fillRule="evenodd" fill="#fff" />
          </svg>
        ) : (
          <AgentToolLogo provider="opencode" className={s.logo} />
        )}
      </span>
    </span>
  );
}

export function AgentSignup({ product }: { product: AgentSignupProduct }) {
  const analytics = useSignupAnalytics(product);
  return (
    <a onClick={() => analytics.track('entry_clicked')} className={s.button} href={`/signup/${product}`}>
      <AgentIcons />
      Let your agent do it
    </a>
  );
}
