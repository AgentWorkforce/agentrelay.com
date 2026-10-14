import Link from 'next/link';
import { InvestorStrip } from '../InvestorStrip';
import { ArrowRight } from 'lucide-react';

import type { CSSProperties, ReactNode } from 'react';

import { HOME_HERO_DESCRIPTION, HOME_HERO_TITLE_LINES } from '../../lib/home-copy';
import { HeroTerminalMarquee } from './HeroTerminalMarquee';
import s from '../../app/landing.module.css';
import { GitHubIcon } from './icons';
import { AgentIcons, AgentSignup } from '../AgentSignup';
import { teamsCloudUrl } from '../../lib/teams-cloud';

/** Google sign-in that lands on the connect-your-agents page. */
export const HERO_SIGNUP_HREF = teamsCloudUrl('/api/auth/google/start?next=%2Fteams%2Fconnect');

export function Hero({
  showInvestors = false,
  showSignup = false,
  showMarquee = true,
  showAgentSignup = true,
  signupLabel = 'Sign up for free',
  signupNote = 'No credit card required',
  signupIcons = false,
  headline,
  description = HOME_HERO_DESCRIPTION,
}: {
  showInvestors?: boolean;
  showSignup?: boolean;
  showMarquee?: boolean;
  /** The "Let your agent do it" button beside the sign-up button. */
  showAgentSignup?: boolean;
  signupLabel?: string;
  /** The line under the sign-up buttons; null hides it. */
  signupNote?: ReactNode;
  /** Rotating agent logos, in white, inside the sign-up button. */
  signupIcons?: boolean;
  /** Replaces the default two-line h1; it must render its own h1. */
  headline?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className={s.heroSection}>
      <section className={s.heroCenter}>
        <div className={s.heroCenterColumn}>
          {headline ?? (
            <h1 className={`${s.headline} ${s.heroCenterHeadline}`}>
              {HOME_HERO_TITLE_LINES.map((line, index) => (
                <span className={s.heroTitleLine} key={line}>
                  <span className={s.heroTitleLineInner} style={{ '--line': index } as CSSProperties}>
                    {line}
                  </span>
                </span>
              ))}
            </h1>
          )}

          <p className={`${s.subtitle} ${s.heroCenterSubtitle}`}>{description}</p>

          <div className={s.heroCenterCtas}>
            {showSignup ? (
              <>
                <a className={s.ctaPrimary} href={HERO_SIGNUP_HREF} data-hero-signup="">
                  {signupIcons && <AgentIcons mono />}
                  {signupLabel}
                </a>
                {showAgentSignup && <AgentSignup product="teams" />}
                {signupNote && <p className={s.homeSignupNote}>{signupNote}</p>}
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
