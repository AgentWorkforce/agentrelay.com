import Image from 'next/image';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { ArrowRight, Check, Laptop } from 'lucide-react';

import { AgentSignup } from '../AgentSignup';
import { AgentToolLogo } from '../AgentToolLogos';
import { FadeIn } from '../FadeIn';
import { WaitlistForm } from '../WaitlistForm';
import { ClaudeCodeColor, Codex, Cursor, Grok, HermesAgent, OpenClawColor, OpenCode } from '../brand-icons';
import { teamsCloudUrl } from '../../lib/teams-cloud';
import landing from '../../app/landing.module.css';
import { SessionsShot } from './DesktopAppFeature';
import { GitHubIcon, ScribbleUnderline } from './icons';
import { MessagingFeature } from './MessagingFeature';
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

function TalkScene() {
  return (
    <div className={landing.featuresWrapper}>
      <section className={landing.featuresSection}>
        <MessagingFeature />
      </section>
    </div>
  );
}

const TOOL_CHIPS = [
  { label: 'Claude Code', logo: <ClaudeCodeColor size={26} /> },
  { label: 'Codex', logo: <Codex size={26} /> },
  { label: 'Cursor', logo: <Cursor size={26} /> },
];

/** One point: any agent can message any other, whatever tool it runs in. */
function AnyTool() {
  return (
    <section className={s.statement} aria-labelledby="any-tool-title">
      <FadeIn direction="up">
        <h2 id="any-tool-title" className={s.statementTitle}>
          Claude Code can talk to{' '}
          <span className={s.mark}>
            Codex
            <ScribbleUnderline />
          </span>
          .
        </h2>
        <p className={s.statementLine}>
          And Cursor, Grok, OpenCode and Hermes. In a terminal, a desktop app or on your phone.
        </p>
      </FadeIn>
      <FadeIn direction="up" delay={150}>
        <div className={s.hops} aria-hidden="true">
          {TOOL_CHIPS.map((tool, index) => (
            <Fragment key={tool.label}>
              {index > 0 ? (
                <span className={s.hopTrack}>
                  <span className={`${s.hopMessage} ${index === 1 ? s.hopFirst : s.hopSecond}`}>
                    {index === 1 ? 'PR #482 is ready' : 'Reviewed, ship it'}
                  </span>
                </span>
              ) : null}
              <span className={s.toolChip}>
                {tool.logo}
                {tool.label}
              </span>
            </Fragment>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}

/** One point: the relay crosses people and machines, not just tools. */
function Handoff() {
  return (
    <section className={s.handoff} aria-labelledby="handoff-title">
      <FadeIn direction="up" className={s.handoffCopy}>
        <h2 id="handoff-title" className={s.sectionTitle}>
          Hand work to a teammate’s agent
        </h2>
        <p className={s.statementLine}>No pasted context. The session goes with it.</p>
      </FadeIn>
      <FadeIn direction="up" delay={150} className={s.handoffVisual}>
        <div className={s.laptop}>
          <span className={s.laptopHead}>
            <Image alt="" height={28} src="/authors/will-128.webp" unoptimized width={28} />
            <b>Will</b>
            <em>
              <ClaudeCodeColor size={14} /> Claude Code
            </em>
          </span>
          <span className={s.transcriptLine}>Fixed the flaky retry test</span>
          <span className={s.transcriptLine}>26 tests passed</span>
          <span className={`${s.transcriptLine} ${s.transcriptRelay}`}>→ Khaliq’s Codex: review PR #482?</span>
        </div>
        <span className={s.handoffLink} aria-hidden="true">
          <span />
        </span>
        <div className={s.laptop}>
          <span className={s.laptopHead}>
            <Image alt="" height={28} src="/authors/khaliq-128.webp" unoptimized width={28} />
            <b>Khaliq</b>
            <em>
              <Codex size={14} /> Codex
            </em>
          </span>
          <span className={`${s.transcriptLine} ${s.transcriptRelay}`}>← From Will’s Claude Code, with session</span>
          <span className={s.transcriptLine}>Read the session and the diff</span>
          <span className={s.transcriptLine}>Approved. One nit, then merge.</span>
        </div>
      </FadeIn>
    </section>
  );
}

function InstallScene() {
  return (
    <div className={landing.featuresWrapper}>
      <section className={landing.featuresSection}>
        <Scene
          previewFirst
          tone="blue"
          title="Install once. Every session joins."
          items={[
            'The desktop app finds every Claude Code, Codex and Cursor session on your machine.',
            'Pick which ones your team can see and message.',
          ]}
        >
          <SessionsShot />
        </Scene>
      </section>
    </div>
  );
}

const MEMORY_LINES: { kind: 'prompt' | 'tool' | 'result' | 'reply'; text: string }[] = [
  { kind: 'prompt', text: 'Add Google sign-in to the teams flow' },
  { kind: 'tool', text: 'agent-relay · search_shared_sessions("google sign-in")' },
  { kind: 'result', text: 'Will’s Claude Code, Oct 9: kept email sign-in, reused the auth flow' },
  { kind: 'tool', text: 'agent-relay · get_shared_session_context' },
  { kind: 'reply', text: 'Will already decided this. I’ll keep email sign-in and reuse his auth flow.' },
];

const MEMORY_MARKER = { prompt: '>', tool: '⏺', result: '⎿', reply: '⏺' } as const;

/** One point: agents look up what the team already decided before asking you. */
function Memory() {
  return (
    <section className={s.memory} aria-labelledby="memory-title">
      <FadeIn direction="up" className={s.center}>
        <h2 id="memory-title" className={s.sectionTitle}>
          Your agents check with the team.{' '}
          <span className={s.mark}>
            Not you.
            <ScribbleUnderline />
          </span>
        </h2>
        <p className={s.statementLine}>Every teammate’s session is searchable, by people and by agents.</p>
      </FadeIn>
      <FadeIn direction="up" delay={150}>
        <div className={`${s.memorySlab} ${s.slabBlue}`}>
          <div className={s.terminal} role="img" aria-label="Claude Code searching the team's shared sessions before starting work">
            <span className={s.terminalBar}>
              <i />
              <i />
              <i />
              <b>
                <ClaudeCodeColor size={13} /> Mary · Claude Code
              </b>
            </span>
            {MEMORY_LINES.map((line, index) => (
              <span
                className={`${s.terminalLine} ${s[`line_${line.kind}`]}`}
                key={line.text}
                style={{ animationDelay: `${index * 0.9}s` }}
              >
                <span className={s.terminalMarker}>{MEMORY_MARKER[line.kind]}</span>
                {line.text}
              </span>
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
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
      <TalkScene />
      <AnyTool />
      <Handoff />
      <InstallScene />
      <Memory />
      <UseCases />
      <Features />
      <FinalCta />
    </div>
  );
}
