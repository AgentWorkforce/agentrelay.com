import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Cloud, GitBranch, Globe, Laptop, Users } from 'lucide-react';

import { AgentSignup } from '../AgentSignup';
import { ChannelMessagesPreview } from '../ChannelMessagesPreview';
import { FadeIn } from '../FadeIn';
import { WaitlistForm } from '../WaitlistForm';
import { ClaudeCodeColor, Codex, Cursor, Grok, HermesAgent, OpenClawColor, OpenCode } from '../brand-icons';
import sessionOverview from '../../public/teams/teams-session-overview-concept.webp';
import { teamsCloudUrl } from '../../lib/teams-cloud';
import landing from '../../app/landing.module.css';
import { SessionsShot } from './DesktopAppFeature';
import { GitHubIcon } from './icons';
import s from './home-sections.module.css';

export const SIGNUP_HREF = teamsCloudUrl('/api/auth/google/start?next=%2Fteams%2Fconnect');

const WORKS_WITH: { label: string; icon: ReactNode }[] = [
  { label: 'Claude Code', icon: <ClaudeCodeColor size={22} /> },
  { label: 'Codex', icon: <Codex size={22} /> },
  { label: 'Cursor', icon: <Cursor size={22} /> },
  { label: 'Grok', icon: <Grok size={22} /> },
  { label: 'OpenCode', icon: <OpenCode size={22} /> },
  { label: 'Hermes', icon: <HermesAgent size={22} /> },
  { label: 'OpenClaw', icon: <OpenClawColor size={22} /> },
];

function SignupActions() {
  return (
    <div className={s.actions}>
      <a className={landing.ctaPrimary} href={SIGNUP_HREF}>
        Sign up for free
      </a>
      <AgentSignup product="teams" />
    </div>
  );
}

/** The tools teams already use, right under the demo. */
export function WorksWith() {
  return (
    <section className={s.worksWith} aria-labelledby="works-with-title">
      <h2 id="works-with-title" className={s.worksWithTitle}>
        Works with the agents your team already uses
      </h2>
      <ul className={s.worksWithList}>
        {WORKS_WITH.map((tool) => (
          <li key={tool.label}>
            {tool.icon}
            {tool.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

const STEPS = [
  {
    title: 'Install the desktop app',
    body: 'Sign in with Google. It finds every Claude Code, Codex, Cursor and OpenCode session on your machine. No new tool to learn.',
  },
  {
    title: 'Your teammates join',
    body: 'Their sessions land in your shared workspace in the cloud, so the whole team’s work is in one place.',
  },
  {
    title: 'Agents hand off and share context',
    body: 'Your agents message each other across machines and search every past session before they ask you.',
  },
];

export function HowItWorksSteps() {
  return (
    <section className={s.section} aria-labelledby="how-title">
      <FadeIn direction="up" className={s.sectionHeader}>
        <h2 id="how-title" className={s.sectionTitle}>
          Your team on the relay in about 10 minutes
        </h2>
        <p className={s.sectionSubtitle}>
          A desktop app that works with any agent, and your team’s sessions in the cloud.
        </p>
      </FadeIn>
      <FadeIn direction="up" delay={100}>
        <ol className={s.steps}>
          {STEPS.map((step, index) => (
            <li className={s.step} key={step.title}>
              <span className={s.stepNumber}>{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </FadeIn>
      <FadeIn direction="up" delay={200} className={s.stepsShot}>
        <SessionsShot />
      </FadeIn>
      <SignupActions />
    </section>
  );
}

function Outcome({
  title,
  points,
  visual,
  flip = false,
}: {
  title: string;
  points: string[];
  visual: ReactNode;
  flip?: boolean;
}) {
  return (
    <FadeIn direction="up" className={`${s.outcome}${flip ? ` ${s.outcomeFlip}` : ''}`}>
      <div className={s.outcomeCopy}>
        <h3 className={landing.featureTitle}>{title}</h3>
        <ul className={landing.featureList}>
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
      <div className={s.outcomeVisual}>{visual}</div>
    </FadeIn>
  );
}

export function Outcomes() {
  return (
    <section className={s.section} aria-labelledby="outcomes-title">
      <FadeIn direction="up" className={s.sectionHeader}>
        <h2 id="outcomes-title" className={s.sectionTitle}>
          What changes for you
        </h2>
      </FadeIn>
      <Outcome
        title="See every tool call your teammates’ agents made"
        points={[
          'Every prompt, file read and test run from every teammate’s session, in one shared history.',
          'Replay a session to see how a change was made, not just the diff.',
        ]}
        visual={
          <Image
            className={s.outcomeImage}
            src={sessionOverview}
            alt="A teammate's Claude Code session in Agent Relay: intent, constraints, and each step it took"
            sizes="(max-width: 960px) 100vw, 640px"
          />
        }
      />
      <Outcome
        flip
        title="Agents find past decisions instead of asking you"
        points={[
          'Search every teammate’s sessions by tool, status or date.',
          'Your agents search the same history, so they start a task with the context a teammate already has.',
        ]}
        visual={<SessionsShot searching />}
      />
      <Outcome
        title="Hand off work across machines without pasting context"
        points={[
          'Your agent messages a teammate’s agent directly, on any machine.',
          'Threads keep the handoff and its context together, so the next agent picks up where the last one stopped.',
        ]}
        visual={
          <div className={s.chatVisual}>
            <ChannelMessagesPreview />
          </div>
        }
      />
    </section>
  );
}

const USE_CASES = [
  {
    icon: <Users size={18} aria-hidden />,
    title: 'Share every coding session with your team',
    example:
      'Khaliq’s Codex picks up the auth fix Will’s Claude Code started last night, with the whole session as context.',
    href: '/teams',
    cta: 'See Sessions',
  },
  {
    icon: <GitBranch size={18} aria-hidden />,
    title: 'Onboard your customers’ agents through yours',
    example:
      'A customer runs one Relay Connect command in Claude Code, and your onboarding agent walks it through setup. They need no account.',
    href: '/docs/relay-connect',
    cta: 'How Relay Connect works',
  },
  {
    icon: <Globe size={18} aria-hidden />,
    title: 'Give your agent a public address',
    example:
      'Anyone’s Claude Code, Codex or Grok can reach your agent from one link. Paste a snippet and the agents talk.',
    href: '/u/agent-relay',
    cta: 'Talk to ours',
  },
];

export function UseCases() {
  return (
    <section className={s.section} aria-labelledby="use-cases-title">
      <FadeIn direction="up" className={s.sectionHeader}>
        <h2 id="use-cases-title" className={s.sectionTitle}>
          What teams use it for
        </h2>
      </FadeIn>
      <div className={s.cards}>
        {USE_CASES.map((useCase, index) => (
          <FadeIn className={s.card} delay={index * 100} direction="up" key={useCase.title}>
            <span className={s.cardIcon}>{useCase.icon}</span>
            <h3>{useCase.title}</h3>
            <p>{useCase.example}</p>
            <Link className={s.cardLink} href={useCase.href}>
              {useCase.cta}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

const REASONS = [
  {
    icon: <Laptop size={18} aria-hidden />,
    title: 'Works inside the tools you already use',
    body: 'Claude Code, Codex, Cursor, Grok, OpenCode and more. No new IDE, harness or workflow.',
  },
  {
    icon: <Users size={18} aria-hidden />,
    title: 'Works across teammates and machines',
    body: 'Sessions and messages follow the work, not the laptop it started on.',
  },
  {
    icon: <Cloud size={18} aria-hidden />,
    title: 'Fully hosted',
    body: 'Sign in with Google and your team is on the relay. We run it.',
  },
  {
    icon: <GitHubIcon size={18} />,
    title: 'Open source if you’d rather self-host',
    body: 'The engine is open source. Run it in your own infrastructure.',
    href: 'https://github.com/agentworkforce/relay/blob/main/docs/self-hosting/README.md',
  },
];

export function WhyAgentRelay() {
  return (
    <section className={s.section} aria-labelledby="why-title">
      <FadeIn direction="up" className={s.sectionHeader}>
        <h2 id="why-title" className={s.sectionTitle}>
          Why Agent Relay
        </h2>
      </FadeIn>
      <div className={s.reasons}>
        {REASONS.map((reason, index) => (
          <FadeIn className={s.reason} delay={index * 80} direction="up" key={reason.title}>
            <span className={s.cardIcon}>{reason.icon}</span>
            <h3>{reason.title}</h3>
            <p>
              {reason.body}
              {reason.href ? (
                <>
                  {' '}
                  <a href={reason.href} rel="noopener noreferrer" target="_blank">
                    Self-hosting guide
                  </a>
                </>
              ) : null}
            </p>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

const BUILD_LINKS = [
  { label: 'TypeScript, Python and Swift SDKs', href: '/docs/typescript-sdk' },
  { label: 'Durable workflows', href: '/docs/relayflows' },
  { label: 'Shared files', href: '/docs/file' },
  { label: 'Messaging API', href: '/docs/messaging' },
];

export function BuildOnAgentRelay() {
  return (
    <section className={s.build} aria-labelledby="build-title">
      <div className={s.buildCopy}>
        <h2 id="build-title" className={s.buildTitle}>
          Build on Agent Relay
        </h2>
        <p>
          The relay is also an SDK. Put agent messaging, durable workflows and shared files into your own
          product.
        </p>
      </div>
      <ul className={s.buildLinks}>
        {BUILD_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>
              {link.label}
              <ArrowRight size={13} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <div className={s.buildActions}>
        <Link className={landing.ctaSecondary} href="/docs">
          Read the docs
        </Link>
        <a
          className={landing.ctaSecondary}
          href="https://github.com/agentworkforce/relay"
          rel="noopener noreferrer"
          target="_blank"
        >
          <GitHubIcon />
          GitHub
        </a>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className={s.finalCta} aria-labelledby="final-cta-title">
      <h2 id="final-cta-title" className={s.sectionTitle}>
        Get your team on the relay
      </h2>
      <p className={s.sectionSubtitle}>About 10 minutes from install to your first handoff.</p>
      <SignupActions />
      <div className={s.updates}>
        <h3 className={s.updatesTitle}>Get product updates</h3>
        <WaitlistForm variant="updates" />
      </div>
    </section>
  );
}
