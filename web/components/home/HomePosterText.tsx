import s from '../../app/landing.module.css';
import { HomeAgentTerminal } from './HomeAgentTerminal';
import { HomeHumanRelayVisual } from './HomeHumanRelayVisual';

// Edit these lines to change the homepage poster copy.
// const HOME_POSTER_LINES = ['STOP', 'AGENT', 'CHAOS'];
const HOME_POSTER_LINES = ['TEAMS', 'BEAT', 'TOOLS'];
// const HOME_POSTER_LINES = ['TEAMS', 'HAVE', 'CHANGED'];
const HOME_POSTER_SHADOW_STEPS = Array.from({ length: 360 }, (_, index) => index + 1);
const HOME_POSTER_LINE_START = 236;
const HOME_POSTER_LINE_HEIGHT = 194;
const HOME_POSTER_SHADOW_STEP_SIZE = 2.3;

export function HomePosterText({
  lines = HOME_POSTER_LINES,
  visual = 'terminal',
}: {
  lines?: string[];
  visual?: 'terminal' | 'relay' | 'none';
}) {
  const title = lines.join(' ');

  return (
    <section className={s.homePosterHero} aria-label={title}>
      <svg
        className={s.homePosterSvg}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMinYMin meet"
        role="img"
      >
        <title>{title}</title>
        <g aria-hidden="true">
          {HOME_POSTER_SHADOW_STEPS.map((step) => (
            <g
              key={step}
              transform={`translate(${step * HOME_POSTER_SHADOW_STEP_SIZE} ${
                step * HOME_POSTER_SHADOW_STEP_SIZE
              })`}
            >
              {lines.map((line, index) => (
                <text
                  key={`${step}-${line}-${index}`}
                  className={s.homePosterShadowLine}
                  x="34"
                  y={HOME_POSTER_LINE_START + index * HOME_POSTER_LINE_HEIGHT}
                >
                  {line}
                </text>
              ))}
            </g>
          ))}
        </g>
        <g>
          {lines.map((line, index) => (
            <text
              key={`${line}-${index}`}
              className={s.homePosterTextLine}
              x="34"
              y={HOME_POSTER_LINE_START + index * HOME_POSTER_LINE_HEIGHT}
            >
              {line}
            </text>
          ))}
        </g>
      </svg>
      {visual === 'terminal' && (
        <div className={s.homePosterTerminal}>
          <HomeAgentTerminal />
        </div>
      )}
      {visual === 'relay' && (
        <div className={s.homePosterRelayVisual}>
          <HomeHumanRelayVisual />
        </div>
      )}
    </section>
  );
}
