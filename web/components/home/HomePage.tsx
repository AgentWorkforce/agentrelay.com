import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import landing from '../../app/landing.module.css';
import { Hero } from './Hero';
import {
  BuildOnAgentRelay,
  FinalCta,
  HowItWorksSteps,
  Outcomes,
  SIGNUP_HREF,
  UseCases,
  WhyAgentRelay,
  WorksWith,
} from './HomeSections';
import s from './home-sections.module.css';

export function HomeLandingPage() {
  return (
    <div className={`${landing.page} ${landing.messagingPage}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteNav
        hideLinks
        singleAction
        actions={
          <a className={`${landing.ctaPrimary} ${landing.homeNavAction}`} href={SIGNUP_HREF}>
            Sign up for free
          </a>
        }
      />

      <main id="main">
        <Hero showInvestors showSignup />
        <div className={s.page}>
          <WorksWith />
          <HowItWorksSteps />
          <Outcomes />
          <UseCases />
          <WhyAgentRelay />
          <BuildOnAgentRelay />
          <FinalCta />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
