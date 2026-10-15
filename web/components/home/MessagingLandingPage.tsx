import { DurableWorkflowFeature } from './DeliveryFeature';
import { GitHubStarsBadge } from '../GitHubStars';
import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import { Deploy } from './Deploy';
import { Hero } from './Hero';
import { HowItWorks } from './HowItWorks';
import { MessagingFeature } from './MessagingFeature';
import { QuickStart } from './QuickStart';
import { SignupBand } from './SignupBand';
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

        <SignupBand />
      </main>

      <SiteFooter />
    </div>
  );
}
