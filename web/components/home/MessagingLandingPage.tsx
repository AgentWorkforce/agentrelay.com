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
            <DeliveryFeature
              title="The hard parts of execution, handled"
              previewVariant="workflow"
              items={[
                'Persist every transition so long-running work survives restarts and deploys.',
                'Retry individual steps without repeating successful work or duplicating side effects.',
                'Trace every input, output, model action, artifact, and intervention in one run history.',
                'Trigger workflows from schedules and events, then execute them close to your systems.',
              ]}
            />
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
