import { DurableWorkflowFeature } from './DeliveryFeature';
import { GitHubStarsBadge } from '../GitHubStars';
import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import { Deploy, Hero, HowItWorks, MessagingFeature, QuickStart, Waitlist } from './index';
import s from '../../app/landing.module.css';

export function MessagingLandingPage() {
  return (
    <div className={`${s.page} ${s.messagingPage}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteNav actions={<GitHubStarsBadge />} />

      <main id="main">
        <Hero />

        <div className={s.featuresWrapper}>
          <section className={s.featuresSection}>
            <MessagingFeature />
            <HowItWorks />
            <DurableWorkflowFeature />
            <QuickStart />
          </section>
        </div>

        <div className={s.deployWrapper}>
          <Deploy />
        </div>

        <Waitlist />
      </main>

      <SiteFooter />
    </div>
  );
}
