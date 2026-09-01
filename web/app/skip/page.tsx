import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  Bot,
  FileCode2,
  Files,
  GitBranch,
  GitPullRequest,
  KeyRound,
  ListTodo,
  MessagesSquare,
  ShieldCheck,
  UserRound,
  Workflow,
} from 'lucide-react';

import { FadeIn } from '../../components/FadeIn';
import { SiteFooter } from '../../components/SiteFooter';
import { LogoIcon, SiteNav } from '../../components/SiteNav';
import { ogImage } from '../../lib/og-meta';
import { absoluteUrl } from '../../lib/site';
import s from './skip.module.css';

const pilotHref = 'https://agentrelay.com/will';
const description =
  'Skip is the single agent you talk to. It manages coding-agent teams across your Linear or GitHub backlog and returns pull requests ready for review.';
const ogPath = '/skip/og.png';

export const metadata: Metadata = {
  title: { absolute: 'Skip by Agent Relay | Run your engineering backlog with agent teams' },
  description,
  alternates: { canonical: absoluteUrl('/skip') },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Skip by Agent Relay | The Agent Software Manager',
    description,
    url: absoluteUrl('/skip'),
    type: 'website',
    images: [ogImage(ogPath, 'Skip coordinates coding-agent teams across an engineering backlog')],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Skip by Agent Relay | The Agent Software Manager',
    description,
    images: [absoluteUrl(ogPath)],
  },
};

const workflow = [
  {
    icon: ListTodo,
    title: 'Import the work',
    body: 'Skip takes issues from Linear or GitHub and determines what can run in parallel.',
    detail: 'Backlog in',
  },
  {
    icon: Bot,
    title: 'Start the right team',
    body: 'For each issue, Skip assembles and directs the coding agents needed to implement and review it.',
    detail: 'Teams assigned',
  },
  {
    icon: Workflow,
    title: 'Keep the work moving',
    body: 'Skip passes context, monitors progress, handles handoffs, and escalates decisions that need human judgment.',
    detail: 'Work managed',
  },
  {
    icon: GitPullRequest,
    title: 'Review the result',
    body: 'You receive pull requests ready for review instead of a collection of unfinished agent sessions.',
    detail: 'PRs returned',
  },
];

const relayCapabilities = [
  { icon: MessagesSquare, label: 'Real-time messaging' },
  { icon: Files, label: 'Shared context and files' },
  { icon: ShieldCheck, label: 'Scoped permissions' },
  { icon: KeyRound, label: 'Authentication' },
  { icon: GitBranch, label: 'Workflow state' },
];

function PilotButton({ compact = false }: { compact?: boolean }) {
  return (
    <a className={compact ? s.pilotButtonCompact : s.pilotButton} href={pilotHref}>
      Request a pilot
      <ArrowRight aria-hidden="true" />
    </a>
  );
}

function AgentRelayGlyph() {
  return (
    <svg className={s.skipMarkGlyph} viewBox="0 0 112 91" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M71.3682 21.7098L54.042 39.036C50.6567 42.4213 50.6568 47.9099 54.042 51.2952L71.3727 68.6259L52.8321 87.1665C48.6005 91.3981 41.7397 91.3981 37.5081 87.1665L3.17369 52.8321C-1.05789 48.6005 -1.0579 41.7397 3.17369 37.5081L37.5081 3.17369C41.7397 -1.0579 48.6005 -1.05789 52.8321 3.17369L71.3682 21.7098Z"
        fill="currentColor"
      />
      <path
        d="M75.5711 72.8243C78.9563 76.2096 84.445 76.2096 87.8302 72.8243L109.359 51.2952C112.745 47.9099 112.745 42.4213 109.359 39.036L87.8302 17.507C84.445 14.1218 78.9563 14.1218 75.5711 17.507L71.3682 21.7098L88.6989 39.0405C92.0842 42.4258 92.0842 47.9144 88.6989 51.2997L71.3727 68.6259L75.5711 72.8243Z"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  );
}

function SkipMark({ size = 18 }: { size?: number }) {
  return (
    <span className={s.skipMark} style={{ width: size, height: size }}>
      <AgentRelayGlyph />
    </span>
  );
}

function HeroMock() {
  return (
    <div className={s.mock} aria-hidden="true">
      <div className={s.mockTitlebar}>
        <span className={s.mockDots}>
          <i className={s.dotRed} />
          <i className={s.dotYellow} />
          <i className={s.dotGreen} />
        </span>
        <span className={s.mockBrand}>
          <LogoIcon />
          Agent Relay
        </span>
      </div>

      <div className={s.mockBody}>
        <div className={s.mockSidebar}>
          <div className={s.mockSearch}>Search</div>
          <p className={s.mockSidebarLabel}>Pinned</p>
          <div className={s.mockPinned}>
            <SkipMark size={34} />
            <div>
              <strong>Skip</strong>
              <span>Latest: eng-341 status u&hellip; &middot; 12:04</span>
            </div>
          </div>
        </div>

        <div className={s.mockChat}>
          <div className={s.mockChatHeader}>
            <SkipMark size={30} />
            <div>
              <strong>Skip</strong>
              <span className={s.mockStatus}>
                <i /> Active
              </span>
            </div>
          </div>

          <div className={s.mockThread}>
            <div className={s.mockRow}>
              <span className={`${s.mockBubble} ${s.mockBubbleUser}`}>
                Skip connectivity check. Please reply with a short acknowledgement.
              </span>
              <span className={s.mockTime}>10:35</span>
            </div>
            <div className={`${s.mockRow} ${s.mockRowAgent}`}>
              <span className={`${s.mockBubble} ${s.mockBubbleAgent}`}>
                Acknowledged — Skip is online and responsive, workspace rw_7ccfea89.
              </span>
              <span className={s.mockTime}>10:36</span>
            </div>
            <div className={s.mockRow}>
              <span className={`${s.mockBubble} ${s.mockBubbleUser}`}>what&apos;s the status on ENG-341?</span>
              <span className={s.mockTime}>10:50</span>
            </div>
            <div className={`${s.mockRow} ${s.mockRowAgent}`}>
              <span className={`${s.mockBubble} ${s.mockBubbleAgent}`}>
                ENG-341 status: in progress. Team of 2 assigned — builder on the branch, reviewer running the
                suite. I&apos;ll report back once it&apos;s green.
              </span>
              <span className={s.mockTime}>10:51</span>
            </div>
            <div className={s.mockRow}>
              <span className={`${s.mockBubble} ${s.mockBubbleUser}`}>ship it once tests pass</span>
              <span className={s.mockTime}>10:57</span>
            </div>
            <div className={`${s.mockRow} ${s.mockRowAgent}`}>
              <span className={`${s.mockBubble} ${s.mockBubbleAgent}`}>
                Confirmed — tests passed. PR #128 opened for review, linked back to ENG-341.
              </span>
              <span className={s.mockTime}>10:58</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResponsibilityDiagram() {
  return (
    <div className={s.responsibilityDiagram}>
      <div className={s.beforeDiagram}>
        <h3>Before Skip</h3>
        <div className={s.manualMap} aria-label="Engineer manually coordinates agents and tasks">
          <span className={s.personNode}>
            <UserRound aria-hidden="true" />
            Engineer
          </span>
          <span className={s.manualNode}>Agent</span>
          <span className={s.manualNode}>Agent</span>
          <span className={s.manualNode}>Agent</span>
          <span className={s.manualNode}>Task</span>
          <span className={s.manualNode}>Review</span>
          <span className={s.manualNode}>Context</span>
        </div>
        <p>Every handoff runs through you.</p>
      </div>

      <ArrowRight className={s.compareArrow} aria-hidden="true" />

      <div className={s.afterDiagram}>
        <h3>With Skip</h3>
        <div
          className={s.managedMap}
          aria-label="Engineer talks to Skip, Skip coordinates teams, and pull requests return to the engineer"
        >
          <span className={s.personNode}>
            <UserRound aria-hidden="true" />
            Engineer
          </span>
          <ArrowDown aria-hidden="true" />
          <span className={s.managedSkip}>
            <SkipMark size={16} />
            Skip
          </span>
          <div className={s.managedTeams}>
            <span>Team</span>
            <span>Team</span>
            <span>Team</span>
          </div>
          <span className={s.returnNode}>
            <GitPullRequest aria-hidden="true" />
            Pull requests
          </span>
        </div>
        <p>You set direction and review the result.</p>
      </div>
    </div>
  );
}

export default function SkipPage() {
  const navAction = <PilotButton compact />;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Skip',
    applicationCategory: 'DeveloperApplication',
    description,
    url: absoluteUrl('/skip'),
    operatingSystem: 'Web',
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
          <div className={s.heroInner}>
            <div className={s.heroCopy}>
              <span className={s.eyebrow}>The Agent Software Manager</span>
              <h1>One agent you talk to. A whole team it runs.</h1>
              <p className={s.heroLead}>
                Skip is a single point of contact — you chat with one agent, and it assembles, directs, and manages
                the coding-agent team that actually does the work. Step in when you need to.
              </p>
              <div className={s.heroActions}>
                <PilotButton />
                <Link className={s.secondaryButton} href="#workflow">
                  See how Skip works
                  <ArrowDown aria-hidden="true" />
                </Link>
              </div>
            </div>

            <FadeIn className={s.heroVisual} delay={80}>
              <HeroMock />
            </FadeIn>
          </div>
        </section>

        <section className={s.proofBar} aria-label="Skip qualities">
          <div className={s.proofGrid}>
            <span>Single point of contact</span>
            <span>Manages full agent teams</span>
            <span>Linear &amp; GitHub ready</span>
            <span>Step in anytime</span>
          </div>
        </section>

        <section className={s.problemSection}>
          <FadeIn className={s.problemInner}>
            <h2>Coding agents created a new management job.</h2>
            <div className={s.problemCopy}>
              <p>
                You can run eight coding agents at once. But then you spend the day starting them, passing
                context, checking progress, recovering failures, and deciding what happens next.
              </p>
              <p>The agents may be writing the code, but you are still managing every handoff.</p>
            </div>
          </FadeIn>
        </section>

        <section className={s.workflowSection} id="workflow">
          <div className={s.sectionIntro}>
            <FadeIn>
              <h2>Give Skip the backlog.</h2>
              <p>
                Skip turns a queue of issues into coordinated work that comes back in a form engineers already
                know how to review.
              </p>
            </FadeIn>
          </div>

          <div className={s.workflowTrack}>
            {workflow.map((item, index) => {
              const Icon = item.icon;
              return (
                <FadeIn className={s.workflowItem} delay={index * 70} key={item.title}>
                  <div className={s.workflowRail} aria-hidden="true">
                    <span />
                  </div>
                  <div className={s.workflowIcon}>
                    <Icon aria-hidden="true" />
                  </div>
                  <p className={s.workflowDetail}>{item.detail}</p>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </FadeIn>
              );
            })}
          </div>
        </section>

        <section className={s.responsibilitySection}>
          <FadeIn className={s.responsibilityIntro}>
            <h2>You review the work. Skip manages the work.</h2>
            <p>Skip does not remove engineering judgment. It removes engineers from the coordination loop.</p>
            <p>
              You set priorities, permissions, and approval boundaries. Skip manages the agents. You review the
              pull requests and make the decisions that matter.
            </p>
          </FadeIn>
          <FadeIn delay={100}>
            <ResponsibilityDiagram />
          </FadeIn>
        </section>

        <section className={s.infrastructureSection}>
          <div className={s.infrastructureInner}>
            <FadeIn className={s.infrastructureCopy} direction="right">
              <h2>Relay underneath. Skip on top.</h2>
              <p>Agent Relay provides the durable communication layer beneath Skip across models, harnesses, and environments.</p>
              <p>
                Skip uses that infrastructure to coordinate long-running software work without requiring a human
                to relay every message.
              </p>
            </FadeIn>

            <FadeIn className={s.layerDiagram} delay={90} direction="left">
              <div className={s.skipLayer}>
                <span>Management layer</span>
                <strong>Skip</strong>
                <p>Backlog planning, team direction, progress, handoffs, escalation</p>
              </div>
              <div className={s.relayLayer}>
                <span>Communication layer</span>
                <strong>Agent Relay</strong>
                <div className={s.capabilityGrid}>
                  {relayCapabilities.map((capability) => {
                    const Icon = capability.icon;
                    return (
                      <span key={capability.label}>
                        <Icon aria-hidden="true" />
                        {capability.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className={s.evolutionSection}>
          <FadeIn className={s.evolutionInner}>
            <FileCode2 aria-hidden="true" />
            <div>
              <h2>Communication was only the first layer.</h2>
              <p>
                We built Agent Relay so agents could communicate directly. Users built teams of coding agents to
                complete and review software tasks, but still had to supervise those teams themselves.
              </p>
              <p>Skip is the manager those agent teams were missing.</p>
            </div>
          </FadeIn>
        </section>

        <section className={s.ctaSection}>
          <FadeIn className={s.ctaInner}>
            <h2>Stop managing every agent.</h2>
            <p>Run more of your engineering backlog without becoming the bottleneck.</p>
            <PilotButton />
            <span>We are onboarding a small number of engineering teams as design partners.</span>
          </FadeIn>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
