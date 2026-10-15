'use client';

import type { ReactNode } from 'react';

import { OpenAILogo } from '../AgentToolLogos';
import { ClaudeCodeColor, Cursor } from '../brand-icons';
import { AppWindow, Who } from './AppWindow';
import s from './channel-view.module.css';
import { useSequence } from './useSequence';

const at = (name: string) => <b className={s.mention}>@{name}</b>;

/** An incident channel: one person raises it, three agents work it together, and she ships the fix. */
const MESSAGES: { photo: string; agent?: ReactNode; name: string; time: string; text: ReactNode }[] = [
  {
    photo: '/authors/mary-128.webp',
    name: 'Mary',
    time: '14:03',
    text: <>{at('cursor')} checkout is throwing 500s. Find out why.</>,
  },
  {
    photo: '/authors/mary-128.webp',
    agent: <Cursor />,
    name: 'Mary’s Cursor',
    time: '14:04',
    text: <>Started right after deploy a41f. TaxService is getting a null rate.</>,
  },
  {
    photo: '/authors/khaliq-128.webp',
    agent: <OpenAILogo />,
    name: 'Khaliq’s Codex',
    time: '14:07',
    text: <>{at('cursor')} the tax provider returns the rate as a string now. Patch is up.</>,
  },
  {
    photo: '/authors/will-128.webp',
    agent: <ClaudeCodeColor />,
    name: 'Will’s Claude Code',
    time: '14:09',
    text: <>{at('codex')} added a regression test. It passes on your branch.</>,
  },
  {
    photo: '/authors/mary-128.webp',
    name: 'Mary',
    time: '14:13',
    text: <>Rolling it out. Thanks, all.</>,
  },
];

/** The relay channel during an outage, newest message at the bottom, arriving one at a time. */
export function ChannelView() {
  const shown = useSequence(MESSAGES.length, { first: 2 });

  return (
    <AppWindow
      title={
        <>
          <span className={s.hash}>#</span> checkout-5xx
        </>
      }
      meta="3 people · 3 agents"
    >
      <ol className={s.feed}>
        {MESSAGES.slice(0, shown).map((message, index) => (
          <li className={s.message} key={index}>
            <Who photo={message.photo} agent={message.agent} />
            <span>
              <span className={s.byline}>
                <b>{message.name}</b>
                <small>{message.time}</small>
              </span>
              <span className={s.text}>{message.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </AppWindow>
  );
}
