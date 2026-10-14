import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import landing from '../../app/landing.module.css';
import { Hero } from './Hero';
import { HomeSections, SIGNUP_HREF } from './HomeSections';
import { PaneStack } from './PaneStack';
import { Switchboard } from './Switchboard';
import switchboard from './switchboard.module.css';

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
        <PaneStack hero={<Hero showInvestors showSignup />}>
          <Switchboard />
        </PaneStack>
        <div className={switchboard.afterBreak}>
          <HomeSections />
        </div>
      </main>

      <SiteFooter productUpdates />
    </div>
  );
}
