import { FlowLandingAnalytics } from './FlowLandingAnalytics';
import { DeploymentCall } from '../../components/home/DeploymentCall';
import { GitHubIcon, WaveDivider } from '../../components/home/icons';
import { FlowGatePreview } from '../../components/home/FlowGatePreview';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';

import { MessagingFeature } from '../../components/home/MessagingFeature';
import { DurableWorkflowFeature } from '../../components/home/DeliveryFeature';
import { InvestorStrip } from '../../components/InvestorStrip';

import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { FLOWS_OG_ALT, FLOWS_OG_IMAGE_PATH, ogImage } from '../../lib/og-meta';
import { absoluteUrl, SITE_NAME } from '../../lib/site';
import home from '../landing.module.css';
import s from './flows.module.css';
import { FlowExamples } from './FlowExamples';
import { IntegrationMarquee } from './IntegrationMarquee';

export const metadata: Metadata = {
  title: 'Flows: Script your agents',
  description:
    'Write the steps once. Flows runs your agents in order, checks their work, and pauses for human approval.',
  alternates: {
    canonical: absoluteUrl('/flows'),
  },
  openGraph: {
    siteName: SITE_NAME,
    title: 'Flows: Script your agents',
    description:
      'Write the steps once. Flows runs your agents in order, checks their work, and pauses for human approval.',
    url: absoluteUrl('/flows'),
    type: 'website',
    images: [ogImage(FLOWS_OG_IMAGE_PATH, FLOWS_OG_ALT)],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flows: Script your agents',
    description: 'Write the steps once. Flows runs your agents and checks their work before moving on.',
    images: [absoluteUrl(FLOWS_OG_IMAGE_PATH)],
  },
};

function flowsSignInHref(utmContent: string) {
  return `/flows/onboarding?ref=flows&utm_source=agentrelay.com&utm_medium=flows_landing&utm_campaign=flows&utm_content=${utmContent}`;
}

function WaveBreak({ tone = 'blue' }: { tone?: 'blue' | 'orange' }) {
  return (
    <div className={`${s.waveBreak} ${tone === 'orange' ? s.waveBreakOrange : s.waveBreakBlue}`} aria-hidden="true">
      <svg viewBox="0 0 1440 110" preserveAspectRatio="none">
        <path d="M-80 58C86 18 160 92 300 58C440 24 524 18 660 58C796 98 888 90 1030 58C1172 26 1260 18 1520 58" />
        <path d="M-80 78C86 38 160 112 300 78C440 44 524 38 660 78C796 118 888 110 1030 78C1172 46 1260 38 1520 78" />
      </svg>
    </div>
  );
}



export default function FlowsPage() {
  const navGetStartedLink = (
    <a href={flowsSignInHref('nav')} className={`${home.ctaPrimary} ${home.homeNavAction}`}>
      Try Free with Cloud
    </a>
  );
  const mobileGetStartedLink = (
    <a href={flowsSignInHref('mobile_nav')} className={`${home.ctaPrimary} ${home.homeNavAction}`}>
      Try Free with Cloud
    </a>
  );

  return (
    <div className={s.page}>
      <FlowLandingAnalytics />
      <SiteNav hideLinks actions={navGetStartedLink} mobileMenuContent={mobileGetStartedLink} />

      <main className={s.main}>
        <section className={s.hero}>
          <div className={s.heroCopy}>
            <h1>
              <span className={s.headlineLine}>Stop babysitting agents.</span>{' '}
              <span className={s.headlineLine}>Script them.</span>
            </h1>
            <p className={s.heroLead}>
              Define complex sequences of tasks for agents instead of hoping they
              follow the rules in your prompt.
              <br />
              Predictable, auditable and dependable.
            </p>
            <div className={s.ctaRow}>
              <a href={flowsSignInHref('hero')} className={s.ctaPrimary}>
                Try Free with Cloud
                <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
              </a>
              <a href="/khaliq" className={s.ctaSecondary}>
                Chat with founders
              </a>
            </div>
          </div>
        </section>

        <InvestorStrip />

        <WaveBreak />

        <section id="use-cases" className={`${s.sectionBand} ${s.bandCode}`}>
          <FlowExamples introductoryCode={
              <pre className={s.codePre}>
{`export default `}<span className={s.codeFn}>flow</span>{`<TicketInput>(
  `}<span className={s.codeStr}>&quot;software-factory&quot;</span>{`,
  { budget: `}<span className={s.codeStr}>&quot;$8/run&quot;</span>{` },
  `}<span className={s.codeKw}>async</span>{` (f, input) => {
    `}<span className={s.codeKw}>await</span>{` f
      .`}<span className={s.codeFn}>agent</span>{`(`}<span className={s.codeStr}>&quot;planner&quot;</span>{`, { model: `}<span className={s.codeStr}>&quot;claude-sonnet-5&quot;</span>{`, task: ... })
      .`}<span className={s.codeFn}>gate</span>{`((r) => r.artifacts.includes(`}<span className={s.codeStr}>&quot;plan/plan.md&quot;</span>{`));

    `}<span className={s.codeKw}>await</span>{` f
      .`}<span className={s.codeFn}>agent</span>{`(`}<span className={s.codeStr}>&quot;implementer&quot;</span>{`, { model: `}<span className={s.codeStr}>&quot;claude-opus-5&quot;</span>{`, task: ... })
      .`}<span className={s.codeFn}>gate</span>{`((r) => r.artifacts.includes(`}<span className={s.codeStr}>&quot;impl/branch.txt&quot;</span>{`));

    `}<span className={s.codeCmt}>{`// The tests run outside the agent.
    // The agent cannot lie about the exit code.`}</span>{`
    `}<span className={s.codeKw}>await</span>{` f
      .`}<span className={s.codeFn}>run</span>{`(`}<span className={s.codeStr}>{`\`git checkout $(cat impl/branch.txt) && npm test\``}</span>{`)
      .`}<span className={s.codeFn}>gate</span>{`((out) => /failed:\\s*0/.test(out));

    `}<span className={s.codeCmt}>{`// Different model. Its only job is to break the PR.`}</span>{`
    `}<span className={s.codeKw}>await</span>{` f
      .`}<span className={s.codeFn}>agent</span>{`(`}<span className={s.codeStr}>&quot;adversary&quot;</span>{`, { model: `}<span className={s.codeStr}>&quot;gpt-5&quot;</span>{`, task: ... })
      .`}<span className={s.codeFn}>gate</span>{`((r) => r.artifacts.includes(`}<span className={s.codeStr}>&quot;adversary/clean&quot;</span>{`));

    `}<span className={s.codeCmt}>{`// Deterministic step, not an agent decision.`}</span>{`
    `}<span className={s.codeKw}>await</span>{` f.github.`}<span className={s.codeFn}>createPullRequest</span>{`({
      repo: input.repo,
      head: `}<span className={s.codeStr}>{`\`feat/\${input.ticketId}\``}</span>{`,
      base: input.baseBranch,
      bodyPath: `}<span className={s.codeStr}>&quot;impl/summary.md&quot;</span>{`,
    });

    f.`}<span className={s.codeFn}>done</span>{`(`}<span className={s.codeStr}>&quot;success&quot;</span>{`);
  },
);`}
              </pre>
          } />
        </section>

        <WaveBreak />

        <section className={s.workflowSection} aria-label="Agents can ignore instructions. Flows can’t.">
          <MessagingFeature
            title={<>Agents can ignore instructions.<br />Flows can’t.</>}
            preview={<FlowGatePreview />}
            expandedPreview
            items={[
              'Require files, run scripts, and check results before the next step starts.',
              'Enforce requirements in code instead of relying on an agent to follow markdown instructions.',
              'Save tokens by running deterministic steps directly, without asking and hoping the LLM does them.',
            ]}
          />
        </section>

        <div className={s.capabilityWaveBreak}>
          <WaveDivider variant="capability" />
        </div>

        <section className={s.workflowSection} aria-label="Durable. Observable. Repeatable.">
          <DurableWorkflowFeature title="Durable. Observable. Repeatable." showCapabilities={false} />
        </section>

        <section className={`${s.sectionBand} ${s.openSourceSection}`} aria-labelledby="flows-open-source">
          <div className={s.sectionIntro}>
            <h2 id="flows-open-source">Open source.<br />Run it anywhere.</h2>
            <p>
              Your laptop, your servers, or your cloud. Agent Relay runs where your work lives,
              with the source code in your hands.
            </p>
            <div className={s.ctaRow}>
              <a href="https://github.com/agentworkforce/relay" className={s.ctaSecondary}>
                <GitHubIcon />
                Github
              </a>
            </div>
          </div>
        </section>

        <WaveBreak />

        <section className={`${s.sectionBand} ${s.bandIntegrations}`}>
          <div className={s.sectionIntro}>
            <h2>Connect the tools you already use.</h2>
            <p>
              Built on top of Agent Relay, so your Flows can open pull requests, send Slack messages,
              and update tickets in the tools your team already uses.
            </p>
          </div>

          <IntegrationMarquee />
        </section>

        <DeploymentCall />
      </main>

      <SiteFooter />
    </div>
  );
}
