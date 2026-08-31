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
            Durable coding agent team workflows
          </h1>

          <p className={`${s.subtitle} ${s.heroCenterSubtitle}`}>
            Give Claude, Codex or any other agent DMs, channels and a searchable chat history. Build
            your multi-agent system without worrying about the glue.
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
