import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { HOME_HERO_DESCRIPTION, HOME_HERO_TITLE } from '../../lib/home-copy';
import { HeroTerminalMarquee } from './HeroTerminalMarquee';
import s from '../../app/landing.module.css';
import { GitHubIcon } from './icons';

export function Hero() {
  return (
    <div className={s.heroSection}>
      <section className={s.heroCenter}>
        <div className={s.heroCenterColumn}>
          <h1 className={`${s.headline} ${s.heroCenterHeadline}`}>
            {HOME_HERO_TITLE}
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
