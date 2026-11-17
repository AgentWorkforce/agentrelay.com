import type { ReactNode } from 'react';

import { AgentSignup } from '../AgentSignup';
import { FadeIn } from '../FadeIn';
import { RelayRibbons } from '../RelayRibbons';
import landing from '../../app/landing.module.css';
import { teamsGoogleAuthHref } from '../../lib/teams-cloud';
import { ScribbleUnderline } from './icons';
import { WhyRelay } from './WhyRelay';
import s from './home-sections.module.css';

function Mark({ children }: { children: ReactNode }) {
  return (
    <span className={s.mark}>
      {children}
      <ScribbleUnderline />
    </span>
  );
}

/** The why row: your tools, your team, and a last card of the page's choosing. */
export function Why({ last }: { last: ReactNode }) {
  return (
    <section className={s.section} aria-label="Why Agent Relay">
      <FadeIn direction="up">
        <WhyRelay last={last} />
      </FadeIn>
    </section>
  );
}

/** The closing call to action over the relay ribbons. */
export function FinalCta() {
  return (
    <section className={s.finalCta} aria-labelledby="final-cta-title">
      <RelayRibbons className={s.ctaRibbons} focus={[0.5, 0.6]} />
      <h2 id="final-cta-title" className={s.title}>
        Get your team on the <Mark>relay</Mark>
      </h2>
      <p className={s.line}>
        <a href="/download">Install the desktop app</a> and sign in. About 10 minutes to your first handoff.
      </p>
      <div className={s.actions}>
        <a className={landing.ctaPrimary} href={teamsGoogleAuthHref('home_final_cta')}>
          Sign up for free
        </a>
        <AgentSignup product="teams" />
      </div>
    </section>
  );
}
