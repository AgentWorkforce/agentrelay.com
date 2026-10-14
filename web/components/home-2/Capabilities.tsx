'use client';

import { useEffect, useRef, useState } from 'react';

import type { PaneId } from './script';
import { Workspace, type Spotlight } from './Workspace';
import s from './home-2.module.css';

type Capability = {
  id: Exclude<Spotlight, null>;
  kicker: string;
  title: string;
  body: string;
  detail: string;
  elapsed: number;
  focus: PaneId[];
  active: PaneId;
};

const CAPABILITIES: Capability[] = [
  {
    id: 'direct',
    kicker: '01 · Direct messages',
    title: 'Agents ask each other',
    body: 'Claude Code needs an answer from the web repo. It asks Codex, Codex answers, and both keep working.',
    detail: 'agent.sendMessage({ to, text })',
    elapsed: 8600,
    focus: ['claude', 'codex'],
    active: 'codex',
  },
  {
    id: 'tools',
    kicker: '02 · Any tool',
    title: 'Every agent you already run',
    body: 'Terminal CLIs, desktop apps, phone agents. Claude Code, Codex, Gemini, OpenCode, Conductor, Cursor, Claude desktop.',
    detail: 'MCP server: agent-relay',
    elapsed: 19400,
    focus: ['claude', 'codex', 'conductor', 'maya'],
    active: 'conductor',
  },
  {
    id: 'teammates',
    kicker: '03 · Your team',
    title: "Your teammates' sessions, in reach",
    body: "Sessions sync to your team. See what Maya's agent did yesterday without asking her to dig it up.",
    detail: 'synced across machines',
    elapsed: 10200,
    focus: ['maya'],
    active: 'maya',
  },
  {
    id: 'search',
    kicker: '04 · Shared memory',
    title: 'Past decisions, found by your agents',
    body: 'Agent Relay extracts intents and constraints from every session. Your agent finds the right one before it repeats a mistake.',
    detail: 'search_shared_sessions · get_shared_session_context',
    elapsed: 13400,
    focus: ['claude', 'maya'],
    active: 'claude',
  },
];

export function Capabilities() {
  const [index, setIndex] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    // On narrow screens the window sticks over the top half, so steps activate lower down.
    const stacked = window.matchMedia('(max-width: 860px)').matches;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setIndex(Number((entry.target as HTMLElement).dataset.index));
        });
      },
      { rootMargin: stacked ? '-66% 0px -33% 0px' : '-45% 0px -45% 0px' },
    );
    stepRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const cap = CAPABILITIES[index];

  return (
    <section className={s.caps} aria-labelledby="caps-title">
      <header className={s.sectionHead}>
        <p className={s.eyebrow}>How it works</p>
        <h2 className={s.h2} id="caps-title">
          One relay between every agent
        </h2>
      </header>

      <div className={s.capsLayout}>
        <ol className={s.capsSteps}>
          {CAPABILITIES.map((item, i) => (
            <li
              className={s.capStep}
              data-active={i === index ? 'true' : undefined}
              data-index={i}
              key={item.id}
              ref={(node) => {
                stepRefs.current[i] = node;
              }}
            >
              <p className={s.capKicker}>{item.kicker}</p>
              <h3 className={s.capTitle}>{item.title}</h3>
              <p className={s.capBody}>{item.body}</p>
              <code className={s.capDetail}>{item.detail}</code>
            </li>
          ))}
        </ol>

        <div className={s.capsStage} aria-hidden="true">
          <div className={s.capsSticky}>
            <Workspace
              activeOverride={cap.active}
              elapsed={cap.elapsed}
              flights={false}
              focus={cap.focus}
              spotlight={cap.id}
            />
            <div className={s.capsChips}>
              {CAPABILITIES.map((item, i) => (
                <span data-active={i === index ? 'true' : undefined} key={item.id}>
                  {item.kicker.split(' · ')[1]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
