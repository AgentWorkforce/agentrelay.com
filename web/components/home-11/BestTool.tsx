import type { ReactNode } from 'react';

import { OpenAILogo } from '../AgentToolLogos';
import { ClaudeCodeColor, Cursor, OpenCode } from '../brand-icons';
import landing from '../../app/landing.module.css';
import s from './best-tool.module.css';

/** Which agent a handoff can land on, and why. The highlight steps through them in turn. */
const ROUTES: { name: string; model: string; reason: string; logo: ReactNode }[] = [
  { name: 'Cursor', model: 'Composer', reason: 'Right harness', logo: <Cursor /> },
  { name: 'OpenCode', model: 'Kimi K2', reason: 'Cheaper model', logo: <OpenCode /> },
  { name: 'Codex', model: 'GPT-5', reason: 'Fallback', logo: <OpenAILogo /> },
];

/** Claude Code hands off, and each pass a different agent picks the work up. */
function Router() {
  return (
    <div className={s.panel}>
      <div className={s.from}>
        <span className={s.logo}>
          <ClaudeCodeColor />
        </span>
        <span>
          <b>Claude Code</b>
          <small>Handing off</small>
        </span>
      </div>
      <ol className={s.routes}>
        {ROUTES.map((route) => (
          <li className={s.route} key={route.name}>
            <span className={s.logo}>{route.logo}</span>
            <span className={s.info}>
              <b>{route.name}</b>
              <small>{route.model}</small>
            </span>
            <span className={s.reason}>{route.reason}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function BestTool() {
  return (
    <section className={s.section} aria-labelledby="best-tool-title">
      <div className={s.copy}>
        <h2 id="best-tool-title" className={s.title}>
          Use the best tool for the job.
        </h2>
        <p className={s.line}>
          Agents hand work to whichever agent fits: a specialized harness, a cheaper or faster model, or a fallback when
          a subscription runs out.
        </p>
      </div>
      <div className={s.stage} aria-hidden="true">
        <div className={landing.previewAccentBlue} />
        <Router />
      </div>
    </section>
  );
}
