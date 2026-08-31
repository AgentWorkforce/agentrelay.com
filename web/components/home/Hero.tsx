import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { HeroTerminalMarquee } from './HeroTerminalMarquee';
import s from '../../app/landing.module.css';
import { GitHubIcon } from './icons';

export function Hero() {
  return (
    <div className={s.heroSection}>
      <section className={s.heroCenter}>
        <div className={s.heroCenterColumn}>
          <h1 className={`${s.headline} ${s.heroCenterHeadline}`}>
            Turn coding agents into a working team.
          </h1>

          <p className={`${s.subtitle} ${s.heroCenterSubtitle}`}>
            Give Claude, Codex, and other coding agents shared channels, direct messages, and
            searchable history so they can coordinate real workflows and complete work together.
          </p>

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
