import type { ReactNode } from 'react';

import { AgentToolLogo, OpenAILogo } from '../AgentToolLogos';
import { ClaudeCodeColor, Codex } from '../brand-icons';
import { FadeIn } from '../FadeIn';
import { AGENT_TOOLS } from '../home/AgentMarks';
import s from './tools-you-love.module.css';

/** The agents people already run, and where they run them, mixed so no row is all one kind. */
const TOOLS: { name: string; where: string; logo: ReactNode }[] = [
  { name: 'Claude Code', where: 'Native app', logo: <AgentToolLogo provider="claude" className={s.mark} /> },
  { name: 'Cursor', where: 'Editor', logo: AGENT_TOOLS.cursor.logo },
  { name: AGENT_TOOLS.hermes.name, where: 'Terminal', logo: AGENT_TOOLS.hermes.logo },
  { name: AGENT_TOOLS.devin.name, where: 'Cloud', logo: AGENT_TOOLS.devin.logo },
  { name: 'Codex CLI', where: 'Terminal', logo: <Codex /> },
  { name: AGENT_TOOLS.conductor.name, where: 'Native app', logo: AGENT_TOOLS.conductor.logo },
  { name: 'Muse', where: 'Assistant', logo: <img src="/logos/muse-transparent.png" alt="" /> },
  { name: 'ChatGPT', where: 'Native app', logo: <OpenAILogo /> },
  { name: AGENT_TOOLS.paseo.name, where: 'Mobile app', logo: AGENT_TOOLS.paseo.logo },
  { name: AGENT_TOOLS.openclaw.name, where: 'Assistant', logo: AGENT_TOOLS.openclaw.logo },
  { name: 'Codex', where: 'Native app', logo: <Codex /> },
  { name: 'Pi', where: 'Terminal', logo: <img className={s.mono} src="/logos/pi.svg" alt="" /> },
  { name: 'Antigravity', where: 'Editor', logo: AGENT_TOOLS.antigravity.logo },
  { name: AGENT_TOOLS.muse.name, where: 'Native app', logo: AGENT_TOOLS.muse.logo },
  { name: 'Grok Build', where: 'Terminal', logo: AGENT_TOOLS.grok.logo },
  { name: AGENT_TOOLS.capy.name, where: 'Cloud', logo: AGENT_TOOLS.capy.logo },
  { name: 'Claude Code', where: 'Terminal', logo: <ClaudeCodeColor /> },
  { name: 'Dots', where: 'Assistant', logo: <img src="/logos/dot.webp" alt="" /> },
  { name: 'OpenCode', where: 'Terminal', logo: AGENT_TOOLS.opencode.logo },
  { name: AGENT_TOOLS.grokbot.name, where: 'Assistant', logo: AGENT_TOOLS.grokbot.logo },
];

const POINTS = ['Your plan, your settings, your skills.', 'Mix agents in one workspace.', 'New agents added all the time.'];

/** "No new IDE. Keep the tools you love": a ruled row of the apps and terminals we connect, with no switch required. */
export function ToolsYouLove() {
  return (
    <section className={s.section} aria-labelledby="tools-you-love-title">
      <FadeIn direction="up">
        <h2 id="tools-you-love-title" className={s.title}>
          No new IDE. Keep the tools you love
        </h2>
        <p className={s.line}>
          Agent Relay runs in the background so you can use the tools you already love. Don’t change your workflow or
          force your team to change theirs. Install Agent Relay, and work like you already are.
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
