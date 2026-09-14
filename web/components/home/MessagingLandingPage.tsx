import { DurableWorkflowFeature } from './DeliveryFeature';
import { GitHubStarsBadge } from '../GitHubStars';
import { SiteFooter } from '../SiteFooter';
import { SiteNav } from '../SiteNav';
import {
  A2AFeature,
  AgentToolsFeature,
  Deploy,
  Hero,
  HowItWorks,
  MessagingFeature,
  QuickStart,
  Waitlist,
  WaveDivider,
} from './index';
import s from '../../app/landing.module.css';

export function MessagingLandingPage({ showInvestors = false }: { showInvestors?: boolean }) {
  return (
    <div className={`${s.page} ${s.messagingPage}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteNav actions={<GitHubStarsBadge />} />

      <main id="main">
        <Hero showInvestors={showInvestors} />

        <div className={s.featuresWrapper}>
          <section className={s.featuresSection}>
            <MessagingFeature />
            <HowItWorks />
            <DurableWorkflowFeature />
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
      </main>

      <SiteFooter />
    </div>
  );
}
