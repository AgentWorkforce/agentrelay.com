import type { CSSProperties } from 'react';

import { InvestorStrip } from '../InvestorStrip';
import { AgentIcons } from '../AgentSignup';
import { HOME_HERO_SUBTITLE, HOME_HERO_TITLE_LINES } from '../../lib/home-copy';
import { teamsGoogleAuthHref } from '../../lib/teams-cloud';
import s from '../../app/landing.module.css';
import home from './home-hero.module.css';

/**
 * The homepage hero: the two-line headline rising in, the description, one
 * sign-up button and the backers on plain navy.
 * The button is marked so the nav can show its own once this one scrolls away.
 */
export function HomeHero() {
  return (
    <div className={`${s.heroSection} ${home.hero}`}>
      <section className={`${s.heroCenter} ${home.copy}`}>
        <div className={`${s.heroCenterColumn} ${home.content}`}>
          <h1 className={`${s.headline} ${s.heroCenterHeadline}`}>
            {HOME_HERO_TITLE_LINES.map((line, index) => (
              <span className={s.heroTitleLine} key={line}>
                <span className={s.heroTitleLineInner} style={{ '--line': index } as CSSProperties}>
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p className={`${s.subtitle} ${s.heroCenterSubtitle}`}>{HOME_HERO_SUBTITLE}</p>

          <div className={`${s.heroCenterCtas} ${home.actions}`}>
            <a className={`${s.ctaPrimary} ${s.heroCta}`} href={teamsGoogleAuthHref('home_hero')} data-hero-signup="">
              <AgentIcons mono />
              Connect your agents for free
              <svg className={s.heroCtaArrow} viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      <InvestorStrip compact />
    </div>
  );
}
