import Link from 'next/link';

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
} from '../home';
import { CloudIcon, MonitorIcon } from '../home/icons';
import s from '../../app/landing.module.css';

const startFreeLink = (
  <Link href="/docs/relayflows" className={s.ctaPrimary}>
    Start Free
  </Link>
);

const deployOptions = [
  {
    href: 'https://github.com/AgentWorkforce/relayflows',
    label: 'View Relay Flows on GitHub',
    Icon: MonitorIcon,
    title: 'Self host',
    text: 'Run durable workflows in your own infrastructure.',
  },
  {
    href: 'https://agentrelay.com/cloud',
    label: 'Open Agent Relay hosted cloud',
    Icon: CloudIcon,
    title: 'Hosted cloud',
    text: 'Let us operate the execution layer for you.',
  },
];

export function DurableWorkflowsLandingPage() {
  return (
    <div className={`${s.page} ${s.messagingPage}`}>
      <SiteNav actions={startFreeLink} mobileMenuContent={startFreeLink} docsHref="/docs/relayflows" />

      <Hero
        headline="Agent teams you can trust"
        subtitle="Shared visibility, human approvals, and durable execution for every agent workflow."
        ctaLabel="Start Free Today"
        ctaHref="/docs/relayflows"
        graphVariant="workflows"
      />

      <div className={s.featuresWrapper}>
        <section className={s.featuresSection}>
          <MessagingFeature
            title="Agent teams that work together."
            emphasis="Consistently."
            items={[
              'Persist state across every step so interrupted runs resume safely.',
              'Retry failed work with backoff, context, and idempotency controls.',
              'Inspect logs, inputs, outputs, artifacts, and timing for every run.',
              'Pause for a person to inspect, steer, approve, reject, and resume.',
            ]}
          />
          <HowItWorks
            title="Works with all of them"
            subtitle="Use the right agent for each step. Relay Flows connects their dependencies and keeps the complete run durable."
          />
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
          <QuickStart
            title="Define workflows in code or YAML"
            subtitle="Build dependencies, retries, verification, and human escalation with Relay Flows."
            docsHref="/docs/relayflows"
            githubHref="https://github.com/AgentWorkforce/relayflows"
            command="npm install @relayflows/core"
          />
          <WaveDivider variant="feature" />
          <AgentToolsFeature
            title="Put humans inside the loop"
            items={[
              'Pause execution at explicit breakpoints before high-impact actions.',
              'Inspect the full run state, logs, artifacts, and the agent’s working context.',
              'Enter the harness to steer the agent or request a specific revision.',
              'Approve or reject the result, then resume the same durable execution.',
            ]}
          />
          <WaveDivider variant="a2a" className={s.a2aSeparator} />
          <A2AFeature
            title="Compose specialized Personas"
            items={[
              'Give every step the model, instructions, tools, and permissions its role requires.',
              'Connect integrations and isolated sandboxes without rebuilding orchestration glue.',
              'Combine Personas into content pipelines, software factories, and operational workflows.',
              'Launch proactive agents from schedules, webhooks, and events with a full audit trail.',
            ]}
          />
        </section>
      </div>

      <div className={s.deployWrapper}>
        <Deploy
          title="Open source from day one"
          subtitle="Run Relay Flows in your own infrastructure, or let us operate it for you."
          options={deployOptions}
        />
      </div>

      <Waitlist
        title="Build Relay Flows with us"
        subtitle="Join the design-partner program for early access to durable agent workflows."
      />

      <SiteFooter />
    </div>
  );
}
