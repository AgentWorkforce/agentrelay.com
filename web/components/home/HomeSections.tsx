import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

import { AgentSignup } from '../AgentSignup';
import { RelayRibbons } from '../RelayRibbons';
import { FadeIn } from '../FadeIn';
import { ClaudeCodeColor, Codex, Cursor, Grok, HermesAgent, OpenClawColor, OpenCode } from '../brand-icons';
import teamDashboard from '../../public/teams/teams-dashboard-concept.webp';
import { teamsCloudUrl } from '../../lib/teams-cloud';
import landing from '../../app/landing.module.css';
import { APP_META, HeroAppWindow, type AppWindowCard } from './HeroAppWindow';
import { AGENT_META, HeroTerminalCard, ROW_ONE, ROW_TWO } from './HeroTerminalMarquee';
import { ScribbleUnderline, WaveDivider } from './icons';
import { MessagingFeature } from './MessagingFeature';
import s from './home-sections.module.css';

export const SIGNUP_HREF = teamsCloudUrl('/api/auth/google/start?next=%2Fteams%2Fconnect');

function Mark({ children }: { children: ReactNode }) {
  return (
    <span className={s.mark}>
      {children}
      <ScribbleUnderline />
    </span>
  );
}

/** Heading block shared by the story sections: a big title and one line. */
function SectionHeader({ id, title, line }: { id: string; title: ReactNode; line: string }) {
  return (
    <FadeIn direction="up" className={s.header}>
      <h2 id={id} className={s.title}>
        {title}
      </h2>
      <p className={s.line}>{line}</p>
    </FadeIn>
  );
}

function Talk() {
  return (
    <div className={landing.featuresWrapper}>
      <section className={landing.featuresSection}>
        <MessagingFeature />
      </section>
    </div>
  );
}

const CONDUCTOR: AppWindowCard = {
  kind: 'app',
  app: 'conductor',
  repo: 'relay/router',
  title: 'Fix reconnect gap',
  ask: 'Close the 30s reconnect gap Codex found',
  reply: 'Retry now backs off from 250ms and resumes the cursor.',
  relay: '#build-router · Reviewer approved',
  sessions: ['fix-reconnect-gap', 'usage-export', 'pricing-table'],
};

const CODEX_APP: AppWindowCard = {
  kind: 'app',
  app: 'codex',
  repo: 'agentrelay/web',
  title: 'Review PR #482',
  from: 'Will’s Claude Code',
  ask: 'PR #482 fixes the flaky retry test. Can you review?',
  reply: 'Reviewed with Will’s session as context. One nit, then merge.',
  relay: 'Replied to Will’s Claude Code',
  sessions: ['Review PR #482', 'Pull latest main', 'Retry budget'],
};

const TOOL_LOGOS: { label: string; logo: ReactNode }[] = [
  { label: 'Claude Code', logo: <ClaudeCodeColor size={20} /> },
  { label: 'Codex', logo: <Codex size={20} /> },
  { label: 'Cursor', logo: <Cursor size={20} /> },
  { label: 'Grok', logo: <Grok size={20} /> },
  { label: 'OpenCode', logo: <OpenCode size={20} /> },
  { label: 'Hermes', logo: <HermesAgent size={20} /> },
  { label: 'OpenClaw', logo: <OpenClawColor size={20} /> },
];

const DEVIN: AppWindowCard = {
  kind: 'app',
  app: 'devin',
  repo: 'relay/auth',
  title: 'Add enterprise SSO',
  ask: 'Add SAML SSO for enterprise workspaces',
  reply: 'SSO is wired into org settings. Tested sign-in end to end.',
  relay: 'PR #503 open · asked Reviewer in #build-auth',
  sessions: ['Add enterprise SSO', 'Multi-region failover', 'API latency spike'],
};

const HERMES: AppWindowCard = {
  kind: 'app',
  app: 'hermes',
  repo: 'relay/gateway',
  title: 'Rotate webhook secrets',
  ask: 'Rotate the webhook secrets before Friday',
  reply: 'Rotated all four. Saved the steps as a skill for next time.',
  relay: 'Posted the rollout plan in #ops',
  sessions: ['Rotate webhook secrets', 'Morning briefing', 'Backup check'],
};

/** Seconds each card holds a slot before the deck shuffles. */
const DECK_STEP = 3;

/** Front to back at the first frame; the deck rotates through every card. */
const DECK: { key: string; node: ReactNode }[] = [
  {
    key: 'claude-terminal',
    node: (
      <HeroTerminalCard
        card={ROW_ONE[0]}
        idPrefix="deck-claude"
        owner="Will"
        style={{ '--term-cycle': AGENT_META.claude.cycle, '--term-phase': '-1s' }}
      />
    ),
  },
  {
    key: 'conductor',
    node: (
      <HeroAppWindow
        card={CONDUCTOR}
        idPrefix="deck-conductor"
        owner="Khaliq"
        style={{ '--term-cycle': APP_META.conductor.cycle, '--term-phase': '-2s' }}
      />
    ),
  },
  {
    key: 'hermes',
    node: (
      <HeroAppWindow
        card={HERMES}
        idPrefix="deck-hermes"
        owner="Mary"
        style={{ '--term-cycle': APP_META.hermes.cycle, '--term-phase': '-1.5s' }}
      />
    ),
  },
  {
    key: 'codex-app',
    node: (
      <HeroAppWindow
        card={CODEX_APP}
        idPrefix="deck-codex"
        owner="Ingrid"
        style={{ '--term-cycle': APP_META.codex.cycle, '--term-phase': '-3s' }}
      />
    ),
  },
  {
    key: 'grok-terminal',
    node: (
      <HeroTerminalCard
        card={ROW_TWO[0]}
        idPrefix="deck-grok"
        owner="Khaliq"
        style={{ '--term-cycle': AGENT_META.grok.cycle, '--term-phase': '-2.4s' }}
      />
    ),
  },
  {
    key: 'devin',
    node: (
      <HeroAppWindow
        card={DEVIN}
        idPrefix="deck-devin"
        owner="Will"
        style={{ '--term-cycle': APP_META.devin.cycle, '--term-phase': '-0.6s' }}
      />
    ),
  },
];

/**
 * Works with: a deck of the real surfaces agents run in. Cards recede to the
 * left and off the page; every few seconds the front card is dealt away and
 * reshuffled to the back, so the deck shows one tool after another.
 */
function WorksWith() {
  return (
    <section className={s.section} aria-labelledby="works-with-title">
      <SectionHeader
        id="works-with-title"
        line="Terminals, Conductor, Mac apps and phones. Your agents stay where they are."
        title={
          <>
            Works with every tool you <Mark>already use</Mark>
          </>
        }
      />
      <div className={s.deck} aria-hidden="true">
        {DECK.map((card, index) => (
          <div className={s.deckSlot} key={card.key} style={{ '--deck-delay': `${-(DECK.length - 1 - index) * DECK_STEP}s` } as CSSProperties}>
            {card.node}
          </div>
        ))}
      </div>
      <ul className={s.logos} aria-label="Supported agents">
        {TOOL_LOGOS.map((tool) => (
          <li key={tool.label}>
            {tool.logo}
            {tool.label}
          </li>
        ))}
        <li>and more</li>
      </ul>
    </section>
  );
}

/** Stop working in a silo: every teammate's sessions, grouped by person. */
function Silo() {
  return (
    <div className={landing.featuresWrapper}>
      <section className={landing.featuresSection}>
        <FadeIn direction="up" className={`${landing.featureCol} ${s.scene}`}>
          <div className={landing.featureCopy}>
            <h3 className={landing.featureTitle}>Stop working in a silo</h3>
            <ul className={landing.featureList}>
              <li>See what every teammate’s agents are working on, live.</li>
              <li>Open any session to see every prompt and tool call.</li>
              <li>Catch overlapping work before two agents build the same thing.</li>
            </ul>
          </div>
          <div className={`${landing.featurePreview} ${s.scenePreview}`}>
            <div className={landing.previewAccentBlue} />
            <div className={s.sceneInset}>
              <Image
                className={s.sceneImage}
                src={teamDashboard}
                alt="Agent Relay sessions grouped by teammate: Will, Maya and Alex, each with their tool, status and pull request"
                sizes="(max-width: 960px) 100vw, 640px"
              />
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}

const SEARCH_LINES: { kind: 'prompt' | 'tool' | 'result' | 'reply'; text: string }[] = [
  { kind: 'prompt', text: 'Add Google sign-in to the teams flow' },
  { kind: 'tool', text: 'agent-relay · search_shared_sessions("google sign-in")' },
  { kind: 'result', text: '3 sessions · best match: Will’s Claude Code, Oct 9' },
  { kind: 'reply', text: 'Will already decided this. Keeping email sign-in and his auth flow.' },
];

const MARKER = { prompt: '>', tool: '⏺', result: '⎿', reply: '⏺' } as const;

/** Context: agents search teammates' and their own past sessions, distilled into intent and constraints. */
function Context() {
  return (
    <section className={s.section} aria-labelledby="context-title">
      <SectionHeader
        id="context-title"
        line="Your agents search your team’s sessions and your own past work. We pull out each session’s intent and constraints, so they find decisions, not just words."
        title={
          <>
            Your agents find the <Mark>context</Mark> themselves
          </>
        }
      />
      <FadeIn direction="up" delay={120}>
        <div className={s.contextSlab}>
          <div className={s.terminal} role="img" aria-label="Mary's Claude Code searching the team's sessions before starting work">
            <span className={s.terminalBar}>
              <i />
              <i />
              <i />
              <b>
                <ClaudeCodeColor size={13} /> Mary · Claude Code
              </b>
            </span>
            {SEARCH_LINES.map((line, index) => (
              <span
                className={`${s.terminalLine} ${s[`line_${line.kind}`]}`}
                key={line.text}
                style={{ animationDelay: `${index * 1}s` }}
              >
                <span className={s.terminalMarker}>{MARKER[line.kind]}</span>
                {line.text}
              </span>
            ))}
          </div>
          <ArrowRight className={s.contextArrow} size={22} aria-hidden />
          <div className={s.distilled} role="img" aria-label="The intent and constraints Agent Relay extracted from Will's session">
            <span className={s.distilledHead}>
              <Image alt="" height={26} src="/authors/will-128.webp" unoptimized width={26} />
              <span>
                <b>Add Google sign-in</b>
                <em>Will · Claude Code · Oct 9</em>
              </span>
            </span>
            <span className={s.distilledLabel}>Intent</span>
            <span className={s.distilledValue}>Let teammates sign in with Google and join their workspace.</span>
            <span className={s.distilledLabel}>Constraints</span>
            <span className={s.chips}>
              <span>Keep email sign-in</span>
              <span>Reuse the auth flow</span>
              <span>No new dependencies</span>
            </span>
            <span className={s.extracted}>
              <Sparkles size={12} aria-hidden /> Extracted by Agent Relay
            </span>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

const FAMILIAR: { quote: string; answer: string }[] = [
  {
    quote: 'I copy-paste between Claude Code and Codex all day.',
    answer: 'Your agents message each other directly.',
  },
  {
    quote: 'My teammate’s agent solved this yesterday. I had no idea.',
    answer: 'Every teammate’s session is searchable, by you and your agents.',
  },
  {
    quote: 'I re-explain the same constraints every new session.',
    answer: 'Intent and constraints carry over from past sessions.',
  },
  {
    quote: 'Nobody knows what anyone’s agents are doing.',
    answer: 'See every teammate’s sessions, live.',
  },
  {
    quote: 'I run agents in a terminal, Conductor and on my phone.',
    answer: 'They all join the same relay.',
  },
  {
    quote: 'I’m the one who carries context between agents.',
    answer: 'Hand off a whole session, not a summary.',
  },
];

function SoundFamiliar() {
  return (
    <section className={s.section} aria-labelledby="familiar-title">
      <SectionHeader
        id="familiar-title"
        line="If you run more than one agent, you’ve said one of these."
        title={
          <>
            Sound <Mark>familiar?</Mark>
          </>
        }
      />
      <div className={s.familiar}>
        {FAMILIAR.map((item, index) => (
          <FadeIn className={s.familiarCard} delay={(index % 3) * 80} direction="up" key={item.quote}>
            <p className={s.quote}>“{item.quote}”</p>
            <p className={s.answer}>
              <ArrowRight size={15} aria-hidden />
              {item.answer}
            </p>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={s.finalCta} aria-labelledby="final-cta-title">
      <RelayRibbons className={s.ctaRibbons} focus={[0.5, 0.6]} />
      <h2 id="final-cta-title" className={s.title}>
        Get your team on the <Mark>relay</Mark>
      </h2>
      <p className={s.line}>Install the desktop app and sign in. About 10 minutes to your first handoff.</p>
      <div className={s.actions}>
        <a className={landing.ctaPrimary} href={SIGNUP_HREF}>
          Sign up for free
        </a>
        <AgentSignup product="teams" />
      </div>
    </section>
  );
}

function WaveBreak() {
  return (
    <div className={s.waveBreak}>
      <WaveDivider />
    </div>
  );
}

/**
 * Each section sits on its own band so the page steps between tones instead
 * of running one flat color; wave breaks mark the larger shifts.
 */
export function HomeSections() {
  return (
    <div className={s.page}>
      <Talk />
      <div className={`${s.band} ${s.bandRaised}`}>
        <WorksWith />
      </div>
      <Silo />
      <WaveBreak />
      <div className={`${s.band} ${s.bandDeep}`}>
        <Context />
      </div>
      <div className={`${s.band} ${s.bandGrid}`}>
        <SoundFamiliar />
      </div>
      <div className={`${s.band} ${s.bandNight}`}>
        <FinalCta />
      </div>
    </div>
  );
}
