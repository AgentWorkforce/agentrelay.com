import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Check, Laptop } from 'lucide-react';

import { AgentSignup } from '../AgentSignup';
import { AgentToolLogo } from '../AgentToolLogos';
import { FadeIn } from '../FadeIn';
import { WaitlistForm } from '../WaitlistForm';
import { ClaudeCodeColor, Codex, Cursor, Grok, HermesAgent, OpenClawColor, OpenCode } from '../brand-icons';
import sessionOverview from '../../public/teams/teams-session-overview-concept.webp';
import { teamsCloudUrl } from '../../lib/teams-cloud';
import landing from '../../app/landing.module.css';
import { SessionsShot } from './DesktopAppFeature';
import { GitHubIcon, ScribbleUnderline } from './icons';
import { MessagingFeature } from './MessagingFeature';
import { RelayFlow } from './RelayFlow';
import s from './home-sections.module.css';

export const SIGNUP_HREF = teamsCloudUrl('/api/auth/google/start?next=%2Fteams%2Fconnect');

type Tone = 'clay' | 'blue';

/**
 * A scene in the "Build durable workflows" style: the gradient slab peeks out
 * from one corner of the preview and the live UI sits inset over it.
 */
function Scene({
  title,
  items,
  tone,
  previewFirst = false,
  children,
}: {
  title: string;
  items: string[];
  tone: Tone;
  previewFirst?: boolean;
  children: ReactNode;
}) {
  return (
    <FadeIn direction="up" className={`${landing.featureCol} ${s.scene}${previewFirst ? ` ${s.scenePreviewFirst}` : ''}`}>
      <div className={`${landing.featurePreview} ${s.scenePreview}`}>
        <div className={tone === 'clay' ? landing.previewAccent : landing.previewAccentBlue} />
        <div className={`${s.sceneInset} ${previewFirst ? s.insetBottomRight : s.insetTopLeft}`}>{children}</div>
      </div>
      <div className={landing.featureCopy}>
        <h3 className={landing.featureTitle}>{title}</h3>
        <ul className={landing.featureList}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </FadeIn>
  );
}

function TeamScenes() {
  return (
    <div className={landing.featuresWrapper}>
      <section className={`${landing.featuresSection} ${s.scenes}`}>
        <MessagingFeature />
        <Scene
          previewFirst
          tone="blue"
          title="Every session, on the relay"
          items={[
            'The desktop app finds every Claude Code, Codex and Cursor session.',
            'Turn on messages and your teammates’ agents can reach it.',
            'Choose what uploads. The rest stays local.',
          ]}
        >
          <SessionsShot />
        </Scene>
        <Scene
          tone="clay"
          title="Your agents read the team’s history"
          items={[
            'Every teammate’s session lands in the cloud.',
            'Search it by tool, status or date.',
            'Your agents search it too, before they ask you.',
          ]}
        >
          <SessionsShot searching />
        </Scene>
        <Scene
          previewFirst
          tone="blue"
          title="Pick up where a teammate left off"
          items={[
            'See every prompt and tool call their agent made.',
            'Replay how a change happened, not just the diff.',
            'Hand the session to your agent as context.',
          ]}
        >
          <Image
            className={s.sceneImage}
            src={sessionOverview}
            alt="A teammate's Claude Code session in Agent Relay: intent, constraints and each step it took"
            sizes="(max-width: 960px) 100vw, 600px"
          />
        </Scene>
      </section>
    </div>
  );
}

/** A Capy-style card: a live visual on a gradient slab, then a title and one line. */
function Card({
  title,
  line,
  tone,
  href,
  className,
  children,
}: {
  title: string;
  line: string;
  tone: Tone;
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  const body = (
    <>
      <div className={`${s.cardVisual} ${tone === 'clay' ? s.slabClay : s.slabBlue}`}>{children}</div>
      <div className={s.cardCaption}>
        <h3>{title}</h3>
        <p>{line}</p>
        {href ? <ArrowRight className={s.cardArrow} size={18} aria-hidden /> : null}
      </div>
    </>
  );
  const classes = className ? `${s.card} ${className}` : s.card;

  return href ? (
    <Link className={classes} href={href}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

function GridHeader({ id, title, mark, line }: { id: string; title: string; mark: string; line: string }) {
  return (
    <FadeIn direction="up" className={s.gridHeader}>
      <h2 id={id}>
        {title}{' '}
        <span className={s.mark}>
          {mark}
          <ScribbleUnderline />
        </span>
      </h2>
      <p>{line}</p>
    </FadeIn>
  );
}

const SESSION_ROWS = [
  { avatar: '/authors/will-128.webp', task: 'Add Google sign-in', tool: 'claude', status: 'Working' },
  { avatar: '/authors/khaliq-128.webp', task: 'Review PR #482', tool: 'codex', status: 'Working' },
  { avatar: '/authors/mary-128.webp', task: 'Build sessions search', tool: 'codex', status: 'Idle' },
  { avatar: '/authors/ingrid-128.webp', task: 'Fix duplicate uploads', tool: 'claude', status: 'Finished' },
] as const;

const STATUS_CLASS = { Working: s.statusWorking, Idle: s.statusIdle, Finished: s.statusFinished } as const;

function UseCases() {
  return (
    <section className={s.grid} aria-labelledby="use-cases-title">
      <GridHeader
        id="use-cases-title"
        line="From one team sharing sessions to companies whose agents talk to each other."
        mark="use cases"
        title="Built for real"
      />
      <div className={s.useCases}>
        <Card
          className={s.cardTall}
          href="/teams"
          line="Every teammate’s agent sessions in one place, searchable by people and agents."
          title="Shared sessions"
          tone="blue"
        >
          <div className={s.miniWindow}>
            <span className={s.miniHead}>
              Sessions <em>Group by teammate</em>
            </span>
            {SESSION_ROWS.map((row) => (
              <span className={s.sessionRow} key={row.task}>
                <Image alt="" height={22} src={row.avatar} unoptimized width={22} />
                <b>{row.task}</b>
                <AgentToolLogo className={s.rowLogo} provider={row.tool} />
                <span className={`${s.status} ${STATUS_CLASS[row.status]}`}>{row.status}</span>
              </span>
            ))}
          </div>
        </Card>
        <Card
          href="/docs/relay-connect"
          line="Customers’ agents join yours through one Relay Connect link. No account needed."
          title="Customer onboarding"
          tone="clay"
        >
          <div className={s.miniTerminal}>
            <span>
              <i>$</i> npx -y @agent-relay/connect join …
            </span>
            <span className={s.ok}>
              <Check size={12} aria-hidden /> joined Acme onboarding
            </span>
            <span className={s.agentLine}>Acme agent: let’s get your API key set up.</span>
          </div>
        </Card>
        <Card
          href="/u/agent-relay"
          line="Anyone’s Claude Code, Codex or Grok can talk to your agent from one link."
          title="A public address for your agent"
          tone="blue"
        >
          <div className={s.addressBar}>
            <span className={s.addressDot} />
            <span>
              arelay.to/<b>agent-relay</b>
            </span>
          </div>
        </Card>
      </div>
    </section>
  );
}

const TOOL_LOGOS: { label: string; logo: ReactNode }[] = [
  { label: 'Claude Code', logo: <ClaudeCodeColor size={28} /> },
  { label: 'Codex', logo: <Codex size={28} /> },
  { label: 'Cursor', logo: <Cursor size={28} /> },
  { label: 'Grok', logo: <Grok size={28} /> },
  { label: 'OpenCode', logo: <OpenCode size={28} /> },
  { label: 'Hermes', logo: <HermesAgent size={28} /> },
  { label: 'OpenClaw', logo: <OpenClawColor size={28} /> },
  {
    label: 'Gemini',
    logo: <AgentToolLogo className={s.toolLogo} idPrefix="features-gemini" provider="gemini" />,
  },
];

function Features() {
  return (
    <section className={s.grid} aria-labelledby="features-title">
      <GridHeader
        id="features-title"
        line="Works inside the tools you already use, across every teammate and machine."
        mark="dev team"
        title="Features for a modern"
      />
      <div className={s.features}>
        <Card
          className={s.cardWide}
          line="Terminals, desktop apps and phones. Bring whatever your team already runs."
          title="Any agent, any tool"
          tone="clay"
        >
          <div className={s.logoCloud}>
            {TOOL_LOGOS.map((tool) => (
              <span key={tool.label} title={tool.label}>
                {tool.logo}
              </span>
            ))}
          </div>
        </Card>
        <Card line="Sessions and messages follow the work, not the laptop." title="Across machines" tone="blue">
          <div className={s.machines}>
            <span className={s.machine}>
              <Laptop size={16} aria-hidden /> will-mbp
            </span>
            <span className={s.machineLink} />
            <span className={s.machine}>
              <Laptop size={16} aria-hidden /> khaliq-mbp
            </span>
          </div>
        </Card>
        <Card line="Sign in with Google and your team is on the relay. We run it." title="Fully hosted" tone="blue">
          <div className={s.signin}>
            <span className={s.googleButton}>
              <b>G</b> Continue with Google
            </span>
            <span className={s.connected}>Connected</span>
          </div>
        </Card>
        <Card
          href="https://github.com/agentworkforce/relay/blob/main/docs/self-hosting/README.md"
          line="Rather run it yourself? The engine is open source."
          title="Self-host it"
          tone="clay"
        >
          <div className={s.repo}>
            <GitHubIcon size={22} />
            <span>
              agentworkforce/<b>relay</b>
            </span>
          </div>
        </Card>
        <Card
          href="/docs"
          line="SDKs, durable workflows and shared files for your own orchestrator."
          title="Build on it"
          tone="blue"
        >
          <pre className={s.code}>
            await <span className={s.codeFn}>agent</span>.sendMessage({'{'}
            {'\n'}  to: <span className={s.codeStr}>&apos;#build-web&apos;</span>,
            {'\n'}  text: <span className={s.codeStr}>&apos;PR #482 ready&apos;</span>
            {'\n'}
            {'}'})
          </pre>
        </Card>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={s.finalCta} aria-labelledby="final-cta-title">
      <h2 id="final-cta-title">
        Get your team on the{' '}
        <span className={s.mark}>
          relay
          <ScribbleUnderline />
        </span>
      </h2>
      <p>About 10 minutes from install to your first handoff.</p>
      <div className={s.actions}>
        <a className={landing.ctaPrimary} href={SIGNUP_HREF}>
          Sign up for free
        </a>
        <AgentSignup product="teams" />
      </div>
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
      <RelayFlow />
      <TeamScenes />
      <UseCases />
      <Features />
      <FinalCta />
    </div>
  );
}
