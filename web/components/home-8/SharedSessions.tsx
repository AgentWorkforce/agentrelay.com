'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import dashboard from '../../public/teams/teams-dashboard-concept.webp';
import overview from '../../public/teams/teams-session-overview-concept.webp';
import { AgentMark, type AgentId } from './agents';
import s from './home-8.module.css';

const SESSIONS: { title: string; who: string; tool: AgentId; intent: string }[] = [
  { title: 'Review retry handling', who: 'Maya Chen', tool: 'gemini', intent: 'Make queue retries back off and reset' },
  { title: 'Build sessions search', who: 'Maya Chen', tool: 'codex', intent: 'Search teammates’ sessions by intent' },
  { title: 'Fix duplicate uploads', who: 'Will Washburn', tool: 'claude-code', intent: 'Stop double uploads on retry' },
  { title: 'Audit session sharing', who: 'Alex Rivera', tool: 'claude-code', intent: 'Check who can read shared sessions' },
  { title: 'Update setup guide', who: 'Alex Rivera', tool: 'opencode', intent: 'Document the Mac app install' },
];

const BLOCKS = [
  {
    title: 'See every teammate’s session',
    body: 'Sessions sync to the cloud, so the whole team sees what each agent is working on, live.',
  },
  {
    title: 'Your agent searches them first',
    body: 'Before it starts, your agent calls search_shared_sessions and finds work a teammate already did.',
  },
  {
    title: 'Intent and constraints, extracted',
    body: 'Agent Relay pulls out what each session is for and what it must not break, so search lands on the right one.',
  },
  {
    title: 'Context comes in, not a retyped summary',
    body: 'get_shared_session_context hands that session’s context straight to your agent.',
  },
];

export function SharedSessions() {
  const [stage, setStage] = useState(0);
  const [query, setQuery] = useState('retry');
  const [attached, setAttached] = useState(false);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setStage(Number((e.target as HTMLElement).dataset.stage));
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    blockRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const q = query.trim().toLowerCase();
  const hits = SESSIONS.filter((x) => !q || `${x.title} ${x.intent}`.toLowerCase().includes(q));

  return (
    <div className={s.shared}>
      <h2 className={`${s.h2} ${s.sharedHead}`} data-reveal>
        Your team’s sessions, shared
      </h2>
      <div className={s.sharedField}>
        <div className={s.sharedStage} data-active={stage === 0}>
          <Image
            src={dashboard}
            alt="Agent Relay sessions view: each teammate’s Claude Code, Codex, Gemini CLI and OpenCode sessions with status and pull requests"
            sizes="(max-width: 760px) 100vw, 46vw"
            className={s.sharedImg}
          />
        </div>
        <div className={s.sharedStage} data-active={stage === 1}>
          <div className={s.searchUi} data-ui>
            <div className={s.searchCall}>
              <span className={s.searchFn}>search_shared_sessions</span>
              <span>(“{query || ' '}”)</span>
            </div>
            <ul className={s.searchList}>
              {hits.length === 0 && <li className={s.searchEmpty}>No shared sessions match.</li>}
              {hits.map((h) => (
                <li key={h.title}>
                  <AgentMark id={h.tool} size={16} />
                  <span className={s.searchTitle}>{h.title}</span>
                  <span className={s.searchWho}>{h.who}</span>
                  <span className={s.searchIntent}>{h.intent}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className={s.sharedStage} data-active={stage === 2}>
          <Image
            src={overview}
            alt="A shared session overview showing the session’s extracted intent and constraints above the conversation"
            sizes="(max-width: 760px) 100vw, 46vw"
            className={s.sharedImg}
          />
        </div>
        <div className={s.sharedStage} data-active={stage === 3}>
          <div className={s.contextUi} data-ui>
            <div className={s.termBar}>
              <AgentMark id="claude-code" size={14} />
              <span>claude-code</span>
              <span className={s.termPath}>~/queue</span>
            </div>
            <div className={s.contextBody}>
              <p className={s.termTool}>⏺ agent-relay · get_shared_session_context</p>
              <p className={s.contextFrom}>Review retry handling · Maya Chen · Gemini CLI</p>
              <dl className={s.contextDl}>
                <dt>Intent</dt>
                <dd>Make queue retries back off and reset after a success.</dd>
                <dt>Constraints</dt>
                <dd>Keep the public retry API. No new dependencies.</dd>
              </dl>
              <p className={s.contextStatus} data-on={attached}>
                {attached ? 'Context attached to this session' : 'Not attached yet'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={s.sharedCol}>
        {BLOCKS.map((b, i) => (
          <div
            key={b.title}
            className={s.sharedBlock}
            data-stage={i}
            ref={(el) => {
              blockRefs.current[i] = el;
            }}
          >
            <h3 className={s.h3}>{b.title}</h3>
            <p className={s.body}>{b.body}</p>
            {i === 1 && (
              <label className={s.inlineField}>
                <span>Search</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setStage(1)}
                  placeholder="retry, sign-in, uploads…"
                />
              </label>
            )}
            {i === 3 && (
              <button
                type="button"
                className={s.ghostButton}
                aria-pressed={attached}
                onClick={() => {
                  setStage(3);
                  setAttached((v) => !v);
                }}
              >
                {attached ? 'Detach context' : 'Attach to my Claude Code'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
