import { FadeIn } from '../FadeIn';
import { AGENT_TOOLS, type AgentTool } from '../home/AgentMarks';
import s from './tools-you-love.module.css';

/** The agents people already run, and where they run them. */
const TOOLS: { tool: AgentTool; where: string }[] = [
  { tool: 'claude', where: 'CLI · app' },
  { tool: 'codex', where: 'CLI · app' },
  { tool: 'opencode', where: 'terminal' },
  { tool: 'cursor', where: 'editor · CLI' },
  { tool: 'grok', where: 'terminal' },
  { tool: 'antigravity', where: 'agent IDE' },
];

const POINTS = ['Your plan, your settings, your skills.', 'Mix agents in one workspace.', 'New agents added all the time.'];

/** "Keep the tools you love": a ruled row of the agents we connect, with no switch required. */
export function ToolsYouLove() {
  return (
    <section className={s.section} aria-labelledby="tools-you-love-title">
      <FadeIn direction="up">
        <h2 id="tools-you-love-title" className={s.title}>
          Keep the tools you love
        </h2>
        <p className={s.line}>
          Agent Relay isn’t another agent to switch to. Keep running Claude Code, Codex, OpenCode, Cursor, Grok, and
          Antigravity the way you do today, on the plan you already have. We connect them; you keep your setup.
        </p>
      </FadeIn>

      <FadeIn direction="up">
        <ul className={s.row}>
          {TOOLS.map(({ tool, where }) => (
            <li className={s.cell} key={tool}>
              <span className={s.logo} aria-hidden="true">
                {AGENT_TOOLS[tool].logo}
              </span>
              <span className={s.text}>
                <span className={s.name}>{AGENT_TOOLS[tool].name}</span>
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
