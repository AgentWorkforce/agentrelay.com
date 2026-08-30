import { GitHubStarsBadge } from '../GitHubStars';
import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import s from '../../app/home.module.css';
import { HomeHero } from './HomeHero';
import {
  A2ASection,
  AgentStrip,
  CapabilitiesSection,
  ChannelsSection,
  DeliverySection,
  OpenSourceSection,
  SdkSection,
  WaitlistSection,
} from './HomeSections';

/**
 * The homepage, also served at /messaging.
 *
 * `.page` carries the whole warm light palette as scoped custom properties, so
 * the shared nav, footer, GitHub badge and waitlist form re-theme here without
 * any of the other ~400 routes changing.
 */
export function MessagingLandingPage() {
  return (
    <div className={s.page}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteNav actions={<GitHubStarsBadge />} />

      <main className={s.main} id="main">
        <HomeHero />
        <AgentStrip />
        <ChannelsSection />
        <DeliverySection />
        <CapabilitiesSection />
        <SdkSection />
        <A2ASection />
        <OpenSourceSection />
        <WaitlistSection />
      </main>

      <SiteFooter />
    </div>
  );
}
