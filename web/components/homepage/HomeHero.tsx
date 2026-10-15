import type { CSSProperties } from 'react';

import { InvestorStrip } from '../InvestorStrip';
import { AgentIcons } from '../AgentSignup';
import { HOME_HERO_DESCRIPTION, HOME_HERO_TITLE_LINES } from '../../lib/home-copy';
import { teamsCloudUrl } from '../../lib/teams-cloud';
import s from '../../app/landing.module.css';

/** Google sign-in that lands on the connect-your-agents page. */
export const HOME_SIGNUP_HREF = teamsCloudUrl('/api/auth/google/start?next=%2Fteams%2Fconnect');

/**
 * The homepage hero: the two-line headline rising in, the description, one
 * sign-up button with the agent logos turning in it, and the backers. The
 * button is marked so the nav can show its own once this one scrolls away.
 */
export function HomeHero() {
  return (
    <div className={s.heroSection}>
      <section className={s.heroCenter}>
        <div className={s.heroCenterColumn}>
          <h1 className={`${s.headline} ${s.heroCenterHeadline}`}>
            {HOME_HERO_TITLE_LINES.map((line, index) => (
              <span className={s.heroTitleLine} key={line}>
                <span className={s.heroTitleLineInner} style={{ '--line': index } as CSSProperties}>
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p className={`${s.subtitle} ${s.heroCenterSubtitle}`}>{HOME_HERO_DESCRIPTION}</p>

          <div className={s.heroCenterCtas}>
            <a className={s.ctaPrimary} href={HOME_SIGNUP_HREF} data-hero-signup="">
              <AgentIcons mono />
              Connect your agents for free
            </a>
          </div>
        </div>
      </section>

      <InvestorStrip />
    </div>
  );
}
