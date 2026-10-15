import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CSSProperties } from 'react';

import { HOME_HERO_DESCRIPTION, HOME_HERO_TITLE_LINES } from '../../lib/home-copy';
import s from '../../app/landing.module.css';
import { HeroTerminalMarquee } from './HeroTerminalMarquee';
import { GitHubIcon } from './icons';

/** The messaging page's hero: the two-line headline, the description, docs and GitHub, and the terminal marquee. */
export function Hero() {
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
            <Link className={s.ctaPrimary} href="/docs">
              Read the docs
              <ArrowRight aria-hidden="true" />
            </Link>
            <a
              className={s.ctaSecondary}
              href="https://github.com/agentworkforce/relay"
              rel="noopener noreferrer"
              target="_blank"
            >
              <GitHubIcon />
              GitHub
            </a>
          </div>
        </div>
      </section>

      <HeroTerminalMarquee />
    </div>
  );
}
