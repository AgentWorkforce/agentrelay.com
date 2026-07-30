import type { Metadata } from 'next';
import Image from 'next/image';
import {
  ArrowRight,
  Braces,
  CalendarDays,
  Check,
  CircleDollarSign,
  Cloud,
  Database,
  Eye,
  Fingerprint,
  GitBranch,
  KeyRound,
  LockKeyhole,
  MessagesSquare,
  Network,
  Server,
  ShieldCheck,
} from 'lucide-react';

import { FadeIn } from '../../components/FadeIn';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { ScribbleUnderline } from '../../components/home/icons';
import { ogImage } from '../../lib/og-meta';
import { absoluteUrl } from '../../lib/site';
import s from './enterprise.module.css';

const exploratoryCallHref = 'https://agentrelay.com/will';
const enterpriseDescription =
  'Deploy coordinated AI agent teams around your systems, security, and data boundaries with hosted, private cloud, or self-managed Agent Relay.';
const enterpriseOgPath = '/enterprise/og.png';

export const metadata: Metadata = {
  title: 'Enterprise AI Agent Teams',
  description: enterpriseDescription,
  keywords: [
    'enterprise AI agents',
    'AI agent teams',
    'multi-agent coordination',
    'AI agent governance',
    'private cloud AI',
    'self-hosted AI agents',
  ],
  alternates: {
    canonical: absoluteUrl('/enterprise'),
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Enterprise AI Agent Teams | Agent Relay',
    description: enterpriseDescription,
    url: absoluteUrl('/enterprise'),
    type: 'website',
    images: [ogImage(enterpriseOgPath, 'Enterprise AI agent teams by Agent Relay')],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Enterprise AI Agent Teams | Agent Relay',
    description: enterpriseDescription,
    images: [absoluteUrl(enterpriseOgPath)],
  },
};

const foundations = [
  {
    icon: Network,
    title: 'Mapped to your operating model',
    body: 'Give every agent a defined role, clear peers, and an escalation path that matches how your teams already work.',
  },
  {
    icon: Braces,
    title: 'Connected to your stack',
    body: 'Bring your own models, runtimes, internal APIs, and tools. Relay stays vendor-neutral at the coordination layer.',
  },
  {
    icon: MessagesSquare,
    title: 'Context that survives the handoff',
    body: 'Channels, threads, DMs, reactions, and durable delivery keep decisions attached to the work that produced them.',
  },
  {
    icon: ShieldCheck,
    title: 'Boundaries your team controls',
    body: 'Scope access by agent and workflow, route sensitive actions through approvals, and retain a readable record of activity.',
  },
];

const deploymentOptions = [
  {
    icon: Cloud,
    title: 'Relay Cloud',
    operations: 'Managed by Agent Relay',
    body: 'The fastest path to production. We operate the service and updates while your team focuses on agent workflows.',
    dataBoundary: 'Agent Relay cloud',
    bestFit: 'Fast production rollout',
  },
  {
    icon: Server,
    title: 'Private cloud',
    operations: 'Scoped with your team',
    body: 'Deploy around your network and data residency requirements with an architecture designed for your organization.',
    dataBoundary: 'Your cloud boundary',
    bestFit: 'Enterprise network controls',
  },
  {
    icon: LockKeyhole,
    title: 'Self-managed core',
    operations: 'Operated by your team',
    body: 'Run the open-source coordination layer yourself and keep the service inside your own infrastructure.',
    dataBoundary: 'Your infrastructure',
    bestFit: 'Maximum deployment control',
  },
];

const securityControls = [
  {
    icon: Fingerprint,
    title: 'Identity-aware access',
    body: 'Give people and agents distinct identities, credentials, and permissions.',
  },
  {
    icon: Eye,
    title: 'Observable by default',
    body: 'Trace messages, tool calls, handoffs, and outcomes across the agent team.',
  },
  {
    icon: KeyRound,
    title: 'Scoped credentials',
    body: 'Keep secrets out of prompts and expose only the actions each workflow needs.',
  },
  {
    icon: Database,
    title: 'Controlled data boundaries',
    body: 'Choose where coordination data lives and how long your deployment retains it.',
  },
  {
    icon: GitBranch,
    title: 'Human approval paths',
    body: 'Put checkpoints in front of sensitive actions and define who can release them.',
  },
  {
    icon: CircleDollarSign,
    title: 'Costs you can control',
    body: 'Choose the deployment and model for each workflow, so spend follows the work instead of a fixed platform.',
  },
];

const engagement = [
  {
    title: 'Discovery',
    body: 'We map the workflows worth automating, the systems involved, the deployment boundary, and the success criteria.',
  },
  {
    title: 'Build',
    body: 'We configure the agents, integrations, context, and human checkpoints, iterating with your team as we go.',
  },
  {
    title: 'Deploy',
    body: 'We launch into your hosted, private-cloud, or self-managed environment with rollout controls in place.',
  },
  {
    title: 'Support',
    body: 'We monitor, tune, and expand the system as your agents build working context and your needs evolve.',
  },
];

function SalesButton({
  href = exploratoryCallHref,
  inverted = false,
  label = 'Talk to us',
}: {
  href?: string;
  inverted?: boolean;
  label?: string;
}) {
  return (
    <a className={inverted ? s.salesButtonLight : s.salesButton} href={href}>
      {label}
      <ArrowRight aria-hidden="true" />
    </a>
  );
}

export default function EnterprisePage() {
  const navAction = <SalesButton inverted label="Book Call" />;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Agent Relay Enterprise',
    description: enterpriseDescription,
    url: absoluteUrl('/enterprise'),
    serviceType: 'Enterprise AI agent deployment and coordination',
    areaServed: 'Worldwide',
    provider: {
      '@type': 'Organization',
      name: 'Agent Relay',
      url: absoluteUrl('/'),
    },
  };

  return (
    <div className={s.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteNav actions={navAction} mobileMenuContent={navAction} />

      <main>
        <section className={s.hero}>
          <div className={s.heroGrid}>
            <div className={s.heroCopy}>
              <h1>
                We&apos;ll build you a team of agents that deliver{' '}
                <span className={s.outcomesWord}>
                  outcomes
                  <ScribbleUnderline />
                </span>
              </h1>
              <p className={s.heroLead}>
                We connect the models, tools, data, and guardrails, then help your organization take the system from its
                first workflow to production.
              </p>
              <div className={s.heroActions}>
                <SalesButton href={exploratoryCallHref} label="Book Exploratory Call" />
              </div>
            </div>
          </div>
        </section>

        <section className={s.proofBar} aria-label="Enterprise platform qualities">
          <div className={s.proofGrid}>
            <span>Model-agnostic</span>
            <span>Open-source core</span>
            <span>Hosted or self-managed</span>
            <span>Human approval ready</span>
          </div>
        </section>

        <section className={s.foundationSection}>
          <FadeIn className={s.sectionIntro}>
            <h2>Free your human teams to do human work.</h2>
            <p>
              Agent Relay gives teams a shared communication rail without prescribing the agents, models, or tools they
              have to use.
            </p>
          </FadeIn>

          <div className={s.foundationGrid}>
            {foundations.map((item, index) => {
              const Icon = item.icon;
              return (
                <FadeIn className={s.foundationItem} delay={index * 70} key={item.title}>
                  <span className={s.iconFrame}>
                    <Icon aria-hidden="true" />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </FadeIn>
              );
            })}
          </div>
        </section>

        <section className={s.deploymentSection}>
          <FadeIn className={s.deploymentIntro}>
            <h2>Run Relay where your data needs to live.</h2>
            <p>Start managed, deploy into your cloud, or operate the open-source core inside your own environment.</p>
          </FadeIn>

          <div className={s.deploymentLayout}>
            {deploymentOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <FadeIn className={s.deploymentCard} delay={index * 80} key={option.title}>
                  <div className={s.deploymentCardHeader}>
                    <span className={s.deploymentIcon}>
                      <Icon aria-hidden="true" />
                    </span>
                    <p className={s.deploymentMeta}>{option.operations}</p>
                  </div>
                  <h3>{option.title}</h3>
                  <p className={s.deploymentDescription}>{option.body}</p>
                  <dl className={s.deploymentDetails}>
                    <div>
                      <dt>Data boundary</dt>
                      <dd>{option.dataBoundary}</dd>
                    </div>
                    <div>
                      <dt>Best fit</dt>
                      <dd>{option.bestFit}</dd>
                    </div>
                  </dl>
                </FadeIn>
              );
            })}
          </div>

        </section>

        <section className={s.securitySection}>
          <div className={s.securityGrid}>
            <FadeIn className={s.securityStatement} direction="right">
              <h2>Built to make agent work inspectable.</h2>
              <p>
                Agent Relay keeps communication, handoffs, and action requests in a system your team can observe and
                control.
              </p>
            </FadeIn>

            <div className={s.controlList}>
              {securityControls.map((control, index) => {
                const Icon = control.icon;
                return (
                  <FadeIn className={s.controlItem} delay={index * 55} key={control.title}>
                    <Icon aria-hidden="true" />
                    <div>
                      <h3>{control.title}</h3>
                      <p>{control.body}</p>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>

        <section className={s.engagementSection}>
          <FadeIn className={s.engagementIntro}>
            <h2>From first call to ongoing partnership.</h2>
            <p>A clear process, with shared ownership from discovery through production.</p>
          </FadeIn>

          <div className={s.engagementTrack}>
            {engagement.map((item, index) => (
              <FadeIn className={s.engagementItem} delay={index * 80} key={item.title}>
                <span className={s.engagementNumber}>{String(index + 1).padStart(2, '0')}</span>
                <div className={s.engagementItemContent}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        <section className={s.ctaSection}>
          <FadeIn className={s.ctaInner}>
            <div className={s.ctaCopy}>
              <h2>Scope your Agent Relay deployment.</h2>
              <p>
                Talk through your first agent team with the people building Agent Relay. We will map the workflow, systems,
                guardrails, and deployment boundary with you.
              </p>

              <ul className={s.ctaChecklist} aria-label="Topics covered on the call">
                <li>
                  <Check aria-hidden="true" />
                  Walk through a real multi-agent deployment
                </li>
                <li>
                  <Check aria-hidden="true" />
                  Scope agents around your roles, stack, and workflows
                </li>
                <li>
                  <Check aria-hidden="true" />
                  Review hosted, private cloud, or self-managed options
                </li>
                <li>
                  <Check aria-hidden="true" />
                  Leave with a clear path from discovery to production
                </li>
              </ul>

              <div className={s.ctaOwner}>
                <Image alt="Will Washburn" height={56} src="/authors/will.png" width={56} />
                <div>
                  <strong>Will Washburn</strong>
                  <span>Co-founder, CEO</span>
                </div>
              </div>
            </div>

            <div className={s.ctaCard}>
              <span className={s.ctaCalendar}>
                <CalendarDays aria-hidden="true" />
              </span>
              <h3>Schedule a 30-minute call</h3>
              <p>Pick a time that works for you. We will send a calendar invite with a video link.</p>
              <SalesButton label="Book Call" />
              <span className={s.ctaFinePrint}>Scheduling takes just a few minutes.</span>
            </div>
          </FadeIn>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
