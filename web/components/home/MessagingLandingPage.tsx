import { GitHubStarsBadge } from '../GitHubStars';
import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import {
  A2AFeature,
  AgentToolsFeature,
  Deploy,
  DeliveryFeature,
  Hero,
  HowItWorks,
  MessagingFeature,
  QuickStart,
  Waitlist,
  WaveDivider,
} from './index';
import s from '../../app/landing.module.css';

export function MessagingLandingPage() {
  return (
    <div className={`${s.page} ${s.messagingPage}`}>
      <SiteNav actions={<GitHubStarsBadge />} />

      <Hero />

      <div className={s.featuresWrapper}>
        <section className={s.featuresSection}>
          <MessagingFeature />
          <HowItWorks />
          <DeliveryFeature />
          <QuickStart />
          <WaveDivider variant="feature" />
          <AgentToolsFeature />
          <WaveDivider variant="a2a" className={s.a2aSeparator} />
          <A2AFeature />
        </section>
      </div>

      <div className={s.deployWrapper}>
        <Deploy />
      </div>

      <Waitlist />

      <SiteFooter />
    </div>
  );
}
