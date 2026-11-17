import type { ReactNode } from 'react';

import { ClaudeAppLogo, OpenAILogo } from '../AgentToolLogos';
import { ClaudeCodeColor, Codex } from '../brand-icons';
import { CodexColor } from '../CodexColor';
import { FadeIn } from '../FadeIn';
import { AGENT_TOOLS } from '../home/AgentMarks';
import s from './tools-you-love.module.css';

/** The agents people already run, and where they run them, most familiar first. */
const TOOLS: { name: string; where: string; logo: ReactNode }[] = [
  { name: 'Claude Code', where: 'Native app', logo: <ClaudeAppLogo /> },
  { name: 'Codex CLI', where: 'Terminal', logo: <Codex /> },
  { name: AGENT_TOOLS.grokbot.name, where: 'Assistant', logo: AGENT_TOOLS.grokbot.logo },
  { name: 'ChatGPT', where: 'Web app', logo: <OpenAILogo /> },
  { name: 'Claude Code', where: 'Terminal', logo: <ClaudeCodeColor /> },
  { name: 'OpenCode', where: 'Terminal', logo: AGENT_TOOLS.opencode.logo },
  { name: 'Codex', where: 'Native app', logo: <CodexColor /> },
  { name: AGENT_TOOLS.conductor.name, where: 'Native app', logo: AGENT_TOOLS.conductor.logo },
  { name: AGENT_TOOLS.muse.name, where: 'Native app', logo: AGENT_TOOLS.muse.logo },
  { name: AGENT_TOOLS.capy.name, where: 'Desktop app', logo: AGENT_TOOLS.capy.logo },
  { name: 'Cursor', where: 'Editor', logo: AGENT_TOOLS.cursor.logo },
  { name: AGENT_TOOLS.hermes.name, where: 'Terminal', logo: AGENT_TOOLS.hermes.logo },
  { name: AGENT_TOOLS.devin.name, where: 'Terminal CLI', logo: AGENT_TOOLS.devin.logo },
  { name: 'Muse', where: 'Assistant', logo: <img src="/logos/muse-transparent.png" alt="" /> },
  { name: AGENT_TOOLS.paseo.name, where: 'Desktop app', logo: AGENT_TOOLS.paseo.logo },
  { name: AGENT_TOOLS.openclaw.name, where: 'Assistant', logo: AGENT_TOOLS.openclaw.logo },
  { name: 'Pi', where: 'Terminal', logo: <img className={s.mono} src="/logos/pi.svg" alt="" /> },
  { name: 'Antigravity', where: 'Editor', logo: AGENT_TOOLS.antigravity.logo },
  { name: 'Grok Build', where: 'Terminal', logo: AGENT_TOOLS.grok.logo },
  { name: 'Dots', where: 'Assistant', logo: <img src="/logos/dot.webp" alt="" /> },
];

/** "No new IDE. Keep the tools you love": a ruled row of the apps and terminals we connect, with no switch required. */
export function ToolsYouLove() {
  return (
    <section className={s.section} aria-labelledby="tools-you-love-title">
      <FadeIn direction="up">
        <h2 id="tools-you-love-title" className={s.title}>
          No new IDE.
          <br />
          Keep the tools you love
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
      </FadeIn>
    </section>
  );
}
