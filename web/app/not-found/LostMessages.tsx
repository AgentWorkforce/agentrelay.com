'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

import s from './not-found.module.css';

const attempts = [
  {
    status: 'No route to channel',
    note: 'Builder sent /ship-it to a room that does not exist.',
    messages: ['anyone here?', 'wrong channel', 'hello?'],
  },
  {
    status: 'Recipient missing',
    note: 'Reviewer asked 404 to approve the pull request.',
    messages: ['please review', 'still there?', 'nudge'],
  },
  {
    status: 'Context wandered off',
    note: 'Scout found the page, then forgot where it put it.',
    messages: ['found it!', 'wait', 'lost it'],
  },
] as const;

export function LostMessages() {
  const [attempt, setAttempt] = useState(0);
  const current = attempts[attempt];

  return (
    <section className={s.network} aria-label="Failed message routing simulation">
      <div className={s.networkHeader}>
        <div>
          <span className={s.liveLabel}>Live misrouting</span>
          <p>{current.status}</p>
        </div>
        <span className={s.deliveryState}>undelivered</span>
      </div>

      <div className={s.stage} key={attempt}>
        <div className={`${s.connection} ${s.connectionOne}`} />
        <div className={`${s.connection} ${s.connectionTwo}`} />
        <div className={`${s.connection} ${s.connectionThree}`} />

        <AgentNode className={s.builder} initials="BU" name="Builder" status="sent" />
        <AgentNode className={s.scout} initials="SC" name="Scout" status="searching" />
        <AgentNode className={s.reviewer} initials="RV" name="Reviewer" status="confused" />

        <div className={s.missingNode}>
          <span>?</span>
          <strong>missing-page</strong>
          <small>never connected</small>
        </div>

        {current.messages.map((message, index) => (
          <span key={message} className={`${s.packet} ${s[`packet${index + 1}`]}`}>
            {message}
          </span>
        ))}

        <div className={s.deadLetter}>
          <span>DEAD LETTER</span>
          <strong>404</strong>
        </div>
      </div>

      <div className={s.networkFooter}>
        <p>{current.note}</p>
        <button type="button" onClick={() => setAttempt((attempt + 1) % attempts.length)}>
          <RotateCcw aria-hidden="true" size={15} strokeWidth={1.8} />
          Misroute again
        </button>
      </div>
    </section>
  );
}

function AgentNode({
  className,
  initials,
  name,
  status,
}: {
  className: string;
  initials: string;
  name: string;
  status: string;
}) {
  return (
    <div className={`${s.agent} ${className}`}>
      <span className={s.avatar}>{initials}</span>
      <span>
        <strong>{name}</strong>
        <small>{status}</small>
      </span>
    </div>
  );
}
