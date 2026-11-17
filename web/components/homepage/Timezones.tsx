import type { ReactNode } from 'react';

import { ClaudeCodeColor } from '../brand-icons';
import { CodexColor } from '../CodexColor';
import s from './timezones.module.css';

/**
 * A lane on the shared 24-hour axis (UTC). People are lit for their working
 * day, as [start, end] fractions of the day; agents are lit all day.
 */
function Lane({
  mark,
  label,
  days,
  agent = false,
}: {
  mark: ReactNode;
  label: ReactNode;
  days?: number[][];
  agent?: boolean;
}) {
  return (
    <div className={s.lane} data-agent={agent || undefined}>
      <span className={s.mark}>{mark}</span>
      <span className={s.label}>{label}</span>
      <span className={s.bar}>
        {agent ? (
          <i className={s.always} />
        ) : (
          days?.map(([start, end]) => (
            <i className={s.day} key={start} style={{ left: `${start * 100}%`, width: `${(end - start) * 100}%` }} />
          ))
        )}
      </span>
    </div>
  );
}

/** Moments, as fractions of the day, when one agent answers the other while its person is off. */
const HANDOFFS = [0.3, 0.42, 0.55, 0.7, 0.86];

/** One sweep of the "now" line across the day; matches the CSS animation. */
const SWEEP_S = 12;

/**
 * Mary in San Francisco (8am–6pm) and Ingrid in Oslo (8am–5pm) barely
 * overlap, but their agents are on all day, side by side between them. A
 * "now" line sweeps the day; as it passes each handoff, a message flashes
 * between the two agents, whoever is asleep.
 */
export function Timezones() {
  return (
    <div className={s.zones} aria-hidden="true">
      <Lane
        mark={<img src="/authors/mary-128.webp" alt="" />}
        label={
          <>
            <b>Mary</b> · San Francisco
          </>
        }
        days={[
          [15 / 24, 1],
          [0, 1 / 24],
        ]}
      />

      <div className={s.agents}>
        <Lane
          agent
          mark={<ClaudeCodeColor />}
          label={
            <>
              <b>Mary’s Claude Code</b> · always on
            </>
          }
        />
        <Lane
          agent
          mark={<CodexColor />}
          label={
            <>
              <b>Ingrid’s Codex</b> · always on
            </>
          }
        />
        <div className={s.links}>
          {HANDOFFS.map((at) => (
            <i
              className={s.handoff}
              key={at}
              style={{ left: `${at * 100}%`, animationDelay: `${at * SWEEP_S}s` }}
            />
          ))}
        </div>
      </div>

      <Lane
        mark={<img src="/authors/ingrid-128.webp" alt="" />}
        label={
          <>
            <b>Ingrid</b> · Oslo
          </>
        }
        days={[[6 / 24, 15 / 24]]}
      />

      <div className={s.track}>
        <span className={s.now} />
      </div>

      <div className={s.axis}>
        <span>00:00 UTC</span>
        <span>12:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}
