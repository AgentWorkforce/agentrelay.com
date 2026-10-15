import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import landing from '../../app/landing.module.css';
import { HOME_HERO_DESCRIPTION } from '../../lib/home-copy';
import { Hero } from '../home/Hero';
import sections from '../home/home-sections.module.css';
import { HomeSections, Why } from '../home/HomeSections';
import { Distribute } from './Distribute';
import { Faq } from './Faq';
import { MessengerHeadline } from './MessengerHeadline';
import { MessengerSection } from './MessengerSection';
import { MiddleOptions } from './MiddleOptions';
import { NavActions } from './NavActions';
import { RotatingHeadline } from './RotatingHeadline';
import { Hosting } from './Hosting';
import { SetupItem } from './Setup';
import { TrioWaves } from './TrioWaves';
import { Unblock } from './Unblock';
import headline from './rotating-headline.module.css';

/**
 * The homepage: the "Don’t shoot the messenger" hero with one sign-up button,
 * then "Let X talk to Y", the move-faster rows, why it fits how you work,
 * multi-player agent work, the final call to action, hosting, and the FAQ.
 */
export function HomeLandingPage() {
  return (
    <div className={`${landing.page} ${landing.messagingPage}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteNav
        hideLinks
        singleAction
        actions={<NavActions />}
      />

      <main id="main">
        <Hero
          showInvestors
          showSignup
          showMarquee={false}
          headline={<MessengerHeadline />}
          description={HOME_HERO_DESCRIPTION}
          showAgentSignup={false}
          signupLabel="Connect your agents for free"
          signupNote={null}
          signupIcons
        />
        <HomeSections
          opening={
            <>
              <div className={headline.intro}>
                <RotatingHeadline />
                <p className={headline.lead}>
                  Terminal agents, desktop apps, even agents on your phone.
                </p>
              </div>
              <div className={`${sections.band} ${sections.bandRaised}`}>
                <TrioWaves />
                <MiddleOptions />
                <Unblock />
                <Distribute />
              </div>
              <div className={headline.followOn}>
                <Why title="No new IDE. No new habits." last={<SetupItem />} />
              </div>
              <MessengerSection />
            </>
          }
          showUseCases={false}
          showWhy={false}
          showMiddle={false}
          showWorksWith={false}
          showSilo={false}
          showContext={false}
        />
        <div className={headline.closing}>
          <Hosting />
        </div>
        <Faq />
      </main>

      <SiteFooter productUpdates />
    </div>
  );
}
