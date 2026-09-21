'use client';

import { useSignupAnalytics } from './useSignupAnalytics';
import Link from 'next/link';
import Grok from '@lobehub/icons/es/Grok';
import { AgentToolLogo } from './AgentToolLogos';
import type { AgentSignupProduct } from '../lib/agent-signup';
import s from './agent-signup.module.css';

export function AgentSignup({ product }: { product: AgentSignupProduct }) {
  const analytics = useSignupAnalytics(product);
  return (
    <Link onClick={() => analytics.track('entry_clicked')} className={s.button} href={`/signup/${product}`}>
      <span className={s.icons} aria-hidden="true">
        <span><AgentToolLogo provider="codex" className={s.logo} /></span>
        <span><AgentToolLogo provider="claude" className={s.logo} /></span>
        <span><Grok size={24} /></span>
        <span><AgentToolLogo provider="opencode" className={s.logo} /></span>
      </span>
      Let your agent do it
    </Link>
  );
}
