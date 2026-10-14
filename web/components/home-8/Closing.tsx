'use client';

import { useState } from 'react';

import { AGENT_NAMES, type AgentId } from './agents';
import s from './home-8.module.css';

const CHOICES: AgentId[] = ['claude-code', 'codex', 'cursor', 'gemini', 'opencode', 'conductor'];

export function Closing({ signupHref }: { signupHref: string }) {
  const [a, setA] = useState<AgentId>('claude-code');
  const [b, setB] = useState<AgentId>('codex');

  return (
    <section className={s.closing} aria-labelledby="h8-close">
      <h2 id="h8-close" className={s.srOnly}>
        Let your agents talk to each other
      </h2>
      <p className={s.closeLine} data-reveal>
        <span className={s.closeWords}>Let</span>{' '}
        <select className={s.blank} aria-label="First agent" value={a} onChange={(e) => setA(e.target.value as AgentId)}>
          {CHOICES.map((c) => (
            <option key={c} value={c}>
              {AGENT_NAMES[c]}
            </option>
          ))}
        </select>{' '}
        <span className={s.closeWords}>talk to</span>{' '}
        <select className={s.blank} aria-label="Second agent" value={b} onChange={(e) => setB(e.target.value as AgentId)}>
          {CHOICES.map((c) => (
            <option key={c} value={c}>
              {AGENT_NAMES[c]}
            </option>
          ))}
        </select>
      </p>
      <div className={s.closeFoot} data-reveal>
        <a className={`${s.button} ${s.buttonLarge}`} href={signupHref}>
          Sign up
        </a>
        <p className={s.closeNote}>
          {a === b
            ? `Two ${AGENT_NAMES[a]} sessions can message each other too.`
            : `Install the Mac app after signing up, and ${AGENT_NAMES[a]} can message ${AGENT_NAMES[b]} today.`}
        </p>
      </div>
    </section>
  );
}
