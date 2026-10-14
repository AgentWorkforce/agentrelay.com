import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

import { AgentSignup } from '../AgentSignup';
import { ChannelMessagesPreview } from '../ChannelMessagesPreview';
import { FadeIn } from '../FadeIn';
import { WaitlistForm } from '../WaitlistForm';
import { ClaudeCodeColor, Codex, Cursor, Grok, HermesAgent, OpenClawColor, OpenCode } from '../brand-icons';
import sessionOverview from '../../public/teams/teams-session-overview-concept.webp';
import { teamsCloudUrl } from '../../lib/teams-cloud';
import flows from '../../app/flows/flows.module.css';
import landing from '../../app/landing.module.css';
import { SessionsShot } from './DesktopAppFeature';
import { ScribbleUnderline, WaveDivider } from './icons';
import s from './home-sections.module.css';

export const SIGNUP_HREF = teamsCloudUrl('/api/auth/google/start?next=%2Fteams%2Fconnect');

const WORKS_WITH: { label: string; icon: ReactNode }[] = [
  { label: 'Claude Code', icon: <ClaudeCodeColor size={30} /> },
  { label: 'Codex', icon: <Codex size={30} /> },
  { label: 'Cursor', icon: <Cursor size={30} /> },
  { label: 'Grok', icon: <Grok size={30} /> },
  { label: 'OpenCode', icon: <OpenCode size={30} /> },
  { label: 'Hermes', icon: <HermesAgent size={30} /> },
  { label: 'OpenClaw', icon: <OpenClawColor size={30} /> },
];

const TEAM = [
  { src: '/authors/will-128.webp', name: 'Will' },
  { src: '/authors/khaliq-128.webp', name: 'Khaliq' },
  { src: '/authors/mary-128.webp', name: 'Mary' },
  { src: '/authors/ingrid-128.webp', name: 'Ingrid' },
];

/** One word or phrase in a heading, underlined with the site's scribble. */
function Mark({ children }: { children: ReactNode }) {
  return (
    <span className={s.mark}>
      {children}
      <ScribbleUnderline />
    </span>
  );
}

/** A product shot on a gradient slab, inset from the top left and bleeding off the far edges. */
function Slab({ children, tone }: { children: ReactNode; tone: 'blue' | 'clay' }) {
  return (
    <div className={`${s.slab} ${tone === 'blue' ? s.slabBlue : s.slabClay}`}>
      <div className={s.slabInset}>{children}</div>
    </div>
  );
}

function WaveBreak() {
  return (
    <div className={flows.capabilityWaveBreak}>
      <WaveDivider />
    </div>
  );
}

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

function WorksWith() {
  return (
    <section className={s.worksWith} aria-label="Works with">
      <p className={s.eyebrow}>Works with</p>
      <ul className={s.logos}>
        {WORKS_WITH.map((tool) => (
          <li key={tool.label}>
            {tool.icon}
            <span>{tool.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const STEPS = ['Install the app', 'Teammates join', 'Agents hand off'];

function HowItWorksSteps() {
  return (
    <section className={s.band} aria-labelledby="how-title">
      <FadeIn direction="up" className={s.center}>
        <h2 id="how-title" className={s.display}>
          Your team on the relay in <Mark>10 minutes</Mark>
        </h2>
        <ol className={s.steps}>
          {STEPS.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </FadeIn>
      <FadeIn direction="up" delay={150}>
        <Slab tone="blue">
          <SessionsShot />
        </Slab>
      </FadeIn>
    </section>
  );
}

function Outcome({
  title,
  line,
  visual,
  tone,
  flip = false,
}: {
  title: ReactNode;
  line: string;
  visual: ReactNode;
  tone: 'blue' | 'clay';
  flip?: boolean;
}) {
  return (
    <FadeIn direction="up" className={`${s.outcome}${flip ? ` ${s.outcomeFlip}` : ''}`}>
      <div className={s.outcomeCopy}>
        <h3 className={s.headline}>{title}</h3>
        <p className={s.line}>{line}</p>
      </div>
      <Slab tone={tone}>{visual}</Slab>
    </FadeIn>
  );
}

function Outcomes() {
  return (
    <section className={`${s.band} ${s.bandRaised}`} aria-label="What changes for you">
      <Outcome
        tone="clay"
        title={
          <>
            See <Mark>every tool call</Mark> your teammates’ agents made
          </>
        }
        line="One shared history of every session, from every machine."
        visual={
          <Image
            className={s.shotImage}
            src={sessionOverview}
            alt="A teammate's Claude Code session in Agent Relay: intent, constraints and each step it took"
            sizes="(max-width: 960px) 100vw, 680px"
          />
        }
      />
      <Outcome
        flip
        tone="blue"
        title={
          <>
            Agents find past decisions instead of <Mark>asking you</Mark>
          </>
        }
        line="You can search every teammate’s sessions. So can your agents."
        visual={<SessionsShot searching />}
      />
      <Outcome
        tone="clay"
        title={
          <>
            Hand off work without <Mark>pasting context</Mark>
          </>
        }
        line="Agents message each other across machines, with the thread attached."
        visual={
          <div className={s.chat}>
            <ChannelMessagesPreview />
          </div>
        }
      />
    </section>
  );
}

const USE_CASES: { title: string; artifact: ReactNode; href: string }[] = [
  {
    title: 'Share every session with your team',
    href: '/teams',
    artifact: (
      <span className={s.avatars}>
        {TEAM.map((person) => (
          <Image alt={person.name} height={32} key={person.name} src={person.src} unoptimized width={32} />
        ))}
        <em>4 teammates</em>
      </span>
    ),
  },
  {
    title: 'Onboard customers’ agents through yours',
    href: '/docs/relay-connect',
    artifact: <code>npx -y @agent-relay/connect join …</code>,
  },
  {
    title: 'Give your agent a public address',
    href: '/u/agent-relay',
    artifact: <code>arelay.to/agent-relay</code>,
  },
];

function UseCases() {
  return (
    <section className={s.band} aria-labelledby="use-cases-title">
      <FadeIn direction="up" className={s.center}>
        <h2 id="use-cases-title" className={s.display}>
          Teams use it to
        </h2>
      </FadeIn>
      <div className={s.useCases}>
        {USE_CASES.map((useCase, index) => (
          <FadeIn delay={index * 90} direction="up" key={useCase.title}>
            <Link className={s.useCase} href={useCase.href}>
              <span className={s.useCaseNumber}>0{index + 1}</span>
              <h3>{useCase.title}</h3>
              <span className={s.artifact}>{useCase.artifact}</span>
              <ArrowRight className={s.useCaseArrow} size={18} aria-hidden />
            </Link>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

const REASONS: { title: string; line: ReactNode }[] = [
  { title: 'Any agent.', line: 'Claude Code, Codex, Cursor, Grok, OpenCode and more.' },
  { title: 'Any teammate, any machine.', line: 'The work follows the team, not the laptop.' },
  { title: 'Fully hosted.', line: 'Sign in with Google. We run it.' },
  {
    title: 'Open source.',
    line: (
      <>
        Rather run it yourself?{' '}
        <a
          href="https://github.com/agentworkforce/relay/blob/main/docs/self-hosting/README.md"
          rel="noopener noreferrer"
          target="_blank"
        >
          Self-host it
        </a>
        .
      </>
    ),
  },
];

function WhyAgentRelay() {
  return (
    <section className={`${s.band} ${s.bandRaised}`} aria-labelledby="why-title">
      <p id="why-title" className={s.eyebrow}>
        Why Agent Relay
      </p>
      <div className={s.reasons}>
        {REASONS.map((reason, index) => (
          <FadeIn delay={index * 70} direction="up" key={reason.title}>
            <h3 className={s.reasonTitle}>{reason.title}</h3>
            <p className={s.line}>{reason.line}</p>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

const BUILD_LINKS = [
  { label: 'SDKs', href: '/docs/typescript-sdk' },
  { label: 'Workflows', href: '/docs/relayflows' },
  { label: 'Shared files', href: '/docs/file' },
  { label: 'Messaging API', href: '/docs/messaging' },
];

function BuildOnAgentRelay() {
  return (
    <section className={s.build} aria-labelledby="build-title">
      <h2 id="build-title">Building your own orchestrator?</h2>
      <ul>
        {BUILD_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
      <Link className={s.buildDocs} href="/docs">
        Build on Agent Relay
        <ArrowRight size={15} aria-hidden />
      </Link>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={s.finalCta} aria-labelledby="final-cta-title">
      <h2 id="final-cta-title" className={s.display}>
        Get your team on the <Mark>relay</Mark>
      </h2>
      <SignupActions />
      <div className={s.updates}>
        <p>Get product updates</p>
        <WaitlistForm variant="updates" />
      </div>
    </section>
  );
}

export function HomeSections() {
  return (
    <div className={s.page}>
      <WorksWith />
      <HowItWorksSteps />
      <WaveBreak />
      <Outcomes />
      <WaveBreak />
      <UseCases />
      <WaveBreak />
      <WhyAgentRelay />
      <BuildOnAgentRelay />
      <FinalCta />
    </div>
  );
}
