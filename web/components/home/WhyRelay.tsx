import type { ReactNode } from 'react';

import { AgentToolLogo } from '../AgentToolLogos';
import { AGENT_TOOLS } from './AgentMarks';
import s from './why-relay.module.css';

/** A teammate's photo with their agent on a small stacked card beside it. */
function Teammate({ photo, name, agent }: { photo: string; name: string; agent: 'claude' | 'codex' }) {
  return (
    <span className={s.teammate}>
      <img className={s.photo} src={photo} alt={name} width={36} height={36} />
      <span className={s.stack}>
        <span className={s.agent} title={agent === 'claude' ? 'Claude' : 'ChatGPT'}>
          <AgentToolLogo provider={agent} idPrefix={`why-${agent}`} className={s.agentLogo} />
        </span>
      </span>
    </span>
  );
}

/** A session row with its sharing switch: shared sessions can send and receive, local ones stay on your machine. */
function Session({ agent, name, shared = false }: { agent: ReactNode; name: string; shared?: boolean }) {
  return (
    <span className={s.session}>
      <span className={s.sessionAgent}>{agent}</span>
      <span className={s.sessionName}>{name}</span>
      <span className={s.switch} data-on={shared || undefined}>
        {shared ? 'Shared' : 'Local'}
      </span>
    </span>
  );
}

/** One cell of a ruled row: a small piece of art, a title, and a line. */
export function WhyItem({ art, title, children }: { art: ReactNode; title: ReactNode; children: ReactNode }) {
  return (
    <div className={s.item}>
      <span className={s.art} aria-hidden="true">
        {art}
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

/** Three reasons in a ruled row: your control, your team, and a last card of the page's choosing. */
export function WhyRelay({ last }: { last: ReactNode }) {
  return (
    <div className={s.why}>
      <div className={s.item}>
        <span className={`${s.art} ${s.sessions}`} aria-hidden="true">
          <Session agent={AGENT_TOOLS.claude.logo} name="billing-fix" shared />
          <Session agent={AGENT_TOOLS.codex.logo} name="client-notes" />
        </span>
        <h3>You choose what goes on the relay</h3>
        <p>
          Switch sharing and messaging per session. Nothing leaves your machine until you pick it, and a message from
          another agent only asks. It never grants permission.
        </p>
      </div>
      <div className={s.item}>
        <span className={s.art} aria-hidden="true">
          <Teammate photo="/authors/will-128.webp" name="Will" agent="claude" />
          <span className={s.link} />
          <Teammate photo="/authors/khaliq-128.webp" name="Khaliq" agent="codex" />
          <span className={s.link} />
          <span className={s.more}>+</span>
        </span>
        <h3>Works across teammates and machines</h3>
        <p>Your laptop, your teammate’s, a box in the cloud. One workspace.</p>
      </div>
      {last}
    </div>
  );
}
