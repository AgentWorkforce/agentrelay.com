import Link from 'next/link';
import { InvestorStrip } from '../InvestorStrip';
import { ArrowRight } from 'lucide-react';

import type { CSSProperties } from 'react';

import { HOME_HERO_DESCRIPTION, HOME_HERO_TITLE_LINES } from '../../lib/home-copy';
import { HeroTerminalMarquee } from './HeroTerminalMarquee';
import s from '../../app/landing.module.css';
import { GitHubIcon } from './icons';
import { AgentSignup } from '../AgentSignup';
import { teamsCloudUrl } from '../../lib/teams-cloud';

export function Hero({
  showInvestors = false,
  showSignup = false,
  showMarquee = true,
}: {
  showInvestors?: boolean;
  showSignup?: boolean;
  showMarquee?: boolean;
}) {
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
            {showSignup ? (
              <>
                <a className={s.ctaPrimary} href={teamsCloudUrl('/api/auth/google/start?next=%2Fteams%2Fconnect')}>
                  Sign up for free
                </a>
                <AgentSignup product="teams" />
                <p className={s.homeSignupNote}>No credit card required</p>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </section>

      {showInvestors && <InvestorStrip />}
      {showMarquee && <HeroTerminalMarquee />}
    </div>
  );
}
