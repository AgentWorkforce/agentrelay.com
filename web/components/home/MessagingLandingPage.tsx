import { DurableWorkflowFeature } from './DeliveryFeature';
import { GitHubStarsBadge } from '../GitHubStars';
import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import {
  Deploy,
  DesktopSessionsFeature,
  Hero,
  HowItWorks,
  MessagingFeature,
  QuickStart,
  Waitlist,
  WaveDivider,
} from './index';
import s from '../../app/landing.module.css';
import { teamsCloudUrl } from '../../lib/teams-cloud';

export function MessagingLandingPage({ showInvestors = false, showSignup = false }: { showInvestors?: boolean; showSignup?: boolean }) {
  return (
    <div className={`${s.page} ${s.messagingPage}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteNav
        hideLinks={showSignup}
        singleAction={showSignup}
        actions={showSignup ? (
          <a className={`${s.ctaPrimary} ${s.homeNavAction}`} href={teamsCloudUrl('/api/auth/google/start?next=%2Fteams%2Fconnect')}>
            Sign up for free
          </a>
        ) : <GitHubStarsBadge />}
      />

      <main id="main">
        <Hero showInvestors={showInvestors} showSignup={showSignup} />

        <div className={s.featuresWrapper}>
          <section className={s.featuresSection}>
            <MessagingFeature />
            <HowItWorks />
            <DurableWorkflowFeature />
            <QuickStart />
            <WaveDivider variant="feature" />
            <DesktopSessionsFeature />
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
