import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import landing from '../../app/landing.module.css';
import { Hero } from '../home/Hero';
import { HomeSections, SIGNUP_HREF } from '../home/HomeSections';
import { Switchboard } from '../home/Switchboard';
import { OnTheRelay } from './OnTheRelay';

/** The homepage without the agent marquee: the hero hands straight to a stark white switchboard screen. */
export function HomeNine() {
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
        <Hero showInvestors showSignup showMarquee={false} />
        <Switchboard tone="white" breaks={false} />
        <HomeSections opening={<OnTheRelay />} />
      </main>

      <SiteFooter productUpdates />
    </div>
  );
}
