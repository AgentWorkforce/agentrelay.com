import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import landing from '../../app/landing.module.css';
import { Hero } from '../home/Hero';
import { HomeSections, SIGNUP_HREF, UseCases, Why } from '../home/HomeSections';
import { OnTheRelay } from '../home-9/OnTheRelay';
import { MessengerSection } from './MessengerSection';
import { MiddleOptions } from './MiddleOptions';
import { RotatingHeadline } from './RotatingHeadline';
import headline from './rotating-headline.module.css';

/** home-9 with a rotating "Let X talk to Y" headline. */
export function HomeTen() {
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
        <Hero
          headline={<RotatingHeadline />}
          description={
            <>
              <span className={headline.description}>
                Stop copy-pasting context and let your agents level up your workflows. Spend less time as your
                agents’ message bus and more time shipping.
              </span>
            </>
          }
          showInvestors
          showSignup
          showMarquee={false}
        />
        <HomeSections
          opening={
            <>
              <MiddleOptions />
              <div className={headline.followOn}>
                <Why title="No new IDE. No new habits." />
              </div>
              <UseCases title="Stop being your agents’ messenger" />
              <MessengerSection />
              <OnTheRelay />
            </>
          }
          showUseCases={false}
          showWhy={false}
          showMiddle={false}
        />
      </main>

      <SiteFooter productUpdates />
    </div>
  );
}
