import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import landing from '../../app/landing.module.css';
import { Hero } from '../home/Hero';
import sections from '../home/home-sections.module.css';
import { HomeSections, UseCases, Why } from '../home/HomeSections';
import { OnTheRelay } from '../home-9/OnTheRelay';
import { BestTool } from './BestTool';
import { ConnectAnywhere } from './ConnectAnywhere';
import { Faq } from './Faq';
import { MessengerSection } from './MessengerSection';
import { MiddleOptions } from './MiddleOptions';
import { NavActions } from './NavActions';
import { RotatingHeadline } from './RotatingHeadline';
import { TrioWaves } from './TrioWaves';
import { Unblock } from './Unblock';
import headline from './rotating-headline.module.css';

/** home-9's hero, then "Let X talk to Y" opening the sections below it. */
export function HomeEleven() {
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
          description="Your agents and your teammates’ agents hand off to each other directly, so you can stop copy-pasting and ship faster."
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
                  Terminal agents, desktop apps, even agents on your phone. Keep your setup.
                </p>
              </div>
              <div className={`${sections.band} ${sections.bandRaised}`}>
                <TrioWaves />
                <MiddleOptions />
                <Unblock />
                <BestTool />
              </div>
              <ConnectAnywhere />
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
        <Faq />
      </main>

      <SiteFooter productUpdates />
    </div>
  );
}
