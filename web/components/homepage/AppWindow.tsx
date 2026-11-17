import type { ReactNode } from 'react';

import s from './app-window.module.css';

/** The Agent Relay app's window frame: traffic lights, a title, an optional note on the right, then its body. */
export function AppWindow({ title, meta, children }: { title: ReactNode; meta?: ReactNode; children: ReactNode }) {
  return (
    <div className={s.window} aria-hidden="true">
      <div className={s.titlebar}>
        <span className={s.lights}>
          <i />
          <i />
          <i />
        </span>
        <span className={s.title}>{title}</span>
        {meta ? <span className={s.meta}>{meta}</span> : null}
      </div>
      <div className={s.body}>{children}</div>
    </div>
  );
}

/** A teammate's photo, optionally badged with the agent acting for them. */
export function Who({ photo, agent }: { photo: string; agent?: ReactNode }) {
  return (
    <span className={s.who} data-agent={agent ? '' : undefined}>
      {agent ? <span className={s.agent}>{agent}</span> : null}
      <img src={photo} alt="" />
    </span>
  );
}
