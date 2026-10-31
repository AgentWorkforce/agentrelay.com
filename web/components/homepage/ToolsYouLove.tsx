import type { ReactNode } from 'react';

import { AgentToolLogo, OpenAILogo } from '../AgentToolLogos';
import { ClaudeCodeColor, Codex } from '../brand-icons';
import { FadeIn } from '../FadeIn';
import { AGENT_TOOLS } from '../home/AgentMarks';
import s from './tools-you-love.module.css';

/** The agents people already run, and where they run them. */
const TOOLS: { name: string; where: string; logo: ReactNode }[] = [
  { name: 'Claude Code', where: 'Native app', logo: <AgentToolLogo provider="claude" className={s.mark} /> },
  { name: 'Codex', where: 'Native app', logo: <Codex /> },
  { name: 'Claude Code', where: 'Terminal', logo: <ClaudeCodeColor /> },
  { name: 'ChatGPT', where: 'Native app', logo: <OpenAILogo /> },
  { name: 'OpenCode', where: 'Terminal', logo: AGENT_TOOLS.opencode.logo },
];

const POINTS = ['Your plan, your settings, your skills.', 'Mix agents in one workspace.', 'New agents added all the time.'];

/** "Keep the tools you love": a ruled row of the apps and terminals we connect, with no switch required. */
export function ToolsYouLove() {
  return (
    <section className={s.section} aria-labelledby="tools-you-love-title">
      <FadeIn direction="up">
        <h2 id="tools-you-love-title" className={s.title}>
          Keep the tools you love
        </h2>
        <p className={s.line}>
          Agent Relay isn’t another agent to switch to. Keep running Claude Code, Codex, ChatGPT, and OpenCode the way
          you do today, in the app or the terminal, on the plan you already have. We connect them; you keep your setup.
        </p>
      </FadeIn>

      <FadeIn direction="up">
        <ul className={s.row}>
          {TOOLS.map(({ name, where, logo }) => (
            <li className={s.cell} key={`${name}-${where}`}>
              <span className={s.logo} aria-hidden="true">
                {logo}
              </span>
              <span className={s.text}>
                <span className={s.name}>{name}</span>
                <span className={s.where}>{where}</span>
              </span>
            </li>
          ))}
        </ul>

        <ul className={s.points}>
          {POINTS.map((point) => (
            <li key={point}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {point}
            </li>
          ))}
        </ul>
      </FadeIn>
    </section>
  );
}
