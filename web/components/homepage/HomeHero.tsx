import type { CSSProperties } from 'react';

import { InvestorStrip } from '../InvestorStrip';
import { HOME_HERO_SUBTITLE, HOME_HERO_TITLE_LINES } from '../../lib/home-copy';
import s from '../../app/landing.module.css';
import { DesktopDownloadCta } from './DesktopDownloadCta';
import { HeroLogoCloud } from './HeroLogoCloud';
import home from './home-hero.module.css';

/**
 * The homepage hero: the two-line headline rising in, the description, one
 * download button for the visitor's OS (getting started on phones) and the
 * backers on navy, inside the orbiting agents.
 * The button is marked so the nav can show its own once this one scrolls away.
 */
export function HomeHero() {
  return (
    <div className={`${s.heroSection} ${home.hero}`}>
      <HeroLogoCloud />
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
            <DesktopDownloadCta
              className={`${s.ctaPrimary} ${s.heroCta} ${home.downloadCta}`}
              data-hero-cta=""
              fallback={
                <>
                  Get started
                  <svg className={s.heroCtaArrow} viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              }
            />
          </div>
        </div>
      </section>

      <InvestorStrip compact />
    </div>
  );
}
