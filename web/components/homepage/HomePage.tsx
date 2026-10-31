import { GitHubStarsBadge } from '../GitHubStars';
import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import landing from '../../app/landing.module.css';
import { HomeHero } from './HomeHero';
import sections from '../home/home-sections.module.css';
import { FinalCta, Why } from '../home/HomeSections';
import { Distribute } from './Distribute';
import { MessengerSection } from './MessengerSection';
import { MiddleOptions } from './MiddleOptions';
import { NavActions } from './NavActions';
import { RotatingHeadline } from './RotatingHeadline';
import { Hosting } from './Hosting';
import { SetupItem } from './Setup';
import { ToolsYouLove } from './ToolsYouLove';
import { TrioWaves } from './TrioWaves';
import { Unblock } from './Unblock';
import headline from './rotating-headline.module.css';

/**
 * The homepage: the "Stop copy-pasting between your agents" hero with one
 * sign-up button, then "Let X talk to Y", the move-faster rows, the tools you keep, why it
 * fits how you work, multi-player agent work with your agent's public
 * address, hosting, and the final call to action.
 */
export function HomeLandingPage() {
  return (
    <div className={`${landing.page} ${landing.messagingPage} ${landing.homeLanding}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteNav
        hideLinks
        singleAction
        actions={
          <>
            <GitHubStarsBadge />
            <NavActions />
          </>
        }
      />

      <main id="main">
        <HomeHero />
        <div className={sections.page}>
          <div className={headline.intro}>
            <RotatingHeadline />
            <p className={headline.lead}>Terminal agents, desktop apps, even agents on your phone.</p>
          </div>
          <div className={`${sections.band} ${sections.bandRaised}`}>
            <TrioWaves />
            <MiddleOptions />
            <Unblock />
            <Distribute />
          </div>
          <div className={headline.followOn}>
            <ToolsYouLove />
            <Why title="No new IDE. No new habits." last={<SetupItem />} />
          </div>
          <MessengerSection />
          <Hosting />
          <div className={`${sections.band} ${sections.bandNight}`}>
            <FinalCta />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
