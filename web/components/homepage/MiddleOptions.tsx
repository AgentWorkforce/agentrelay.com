import type { CSSProperties } from 'react';

import { AGENT_TOOLS, type AgentTool } from '../home/AgentMarks';
import s from './middle-options.module.css';

/**
 * Old way vs. new way: today a message hops agent → you → teammate → their
 * agent; with the relay the two agents talk and each person stays with their
 * own. Every badge is the same size: a logo tile, or a photo.
 */

function Badge({ tool, style }: { tool: AgentTool; style?: CSSProperties }) {
  return (
    <span className={s.badge} style={style} title={AGENT_TOOLS[tool].name}>
      {AGENT_TOOLS[tool].logo}
    </span>
  );
}

const PHOTOS = { will: '/authors/will-128.webp', khaliq: '/authors/khaliq-128.webp' } as const;

function You({
  style,
  away = false,
  who = 'will',
}: {
  style?: CSSProperties;
  away?: boolean;
  who?: keyof typeof PHOTOS;
}) {
  return (
    <span className={`${s.badge} ${s.you}`} data-away={away || undefined} style={style}>
      <img src={PHOTOS[who]} alt="" />
    </span>
  );
}

/** A teammate and their agent as one unit: the photo tucked behind the agent's badge. */
function Pair({ who, tool, flip = false }: { who: keyof typeof PHOTOS; tool: AgentTool; flip?: boolean }) {
  return (
    <span className={s.pair} data-flip={flip || undefined}>
      <You who={who} />
      <Badge tool={tool} />
    </span>
  );
}

/** Today a message goes agent → you → teammate → their agent; with the relay, agent → agent. */
function Lanes() {
  return (
    <div className={s.lanes}>
      <div className={s.lane} data-tone="old">
        <div className={s.track}>
          <Badge tool="claude" />
          <span className={s.wire}>
            <i className={`${s.hop} ${s.hopFirst}`} />
          </span>
          <You who="will" />
          <span className={s.wire}>
            <i className={`${s.hop} ${s.hopSlow}`} />
          </span>
          <You who="khaliq" />
          <span className={s.wire}>
            <i className={`${s.hop} ${s.hopLast}`} />
          </span>
          <Badge tool="codex" />
        </div>
      </div>
      <div className={s.lane} data-tone="new">
        <div className={s.track}>
          <Pair who="will" tool="claude" />
          <span className={`${s.wire} ${s.wireLong}`}>
            <i className={s.direct} />
            <i className={`${s.direct} ${s.back}`} />
          </span>
          <Pair who="khaliq" tool="codex" flip />
        </div>
      </div>
    </div>
  );
}

export function MiddleOptions() {
  return (
    <section className={s.section} aria-labelledby="middle-title">
      <div className={s.copy}>
        <h2 id="middle-title" className={s.title}>
          Move faster.
        </h2>
        <p className={s.line}>
          Today every handoff runs through people: your agent, you, your teammate, their agent. With Agent Relay the
          agents talk directly, and you both stay on the work.
        </p>
      </div>
      <Lanes />
    </section>
  );
}
