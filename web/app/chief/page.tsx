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
import { SiteNav } from '../../components/SiteNav';
import { ogImage } from '../../lib/og-meta';
import { absoluteUrl } from '../../lib/site';
import s from './chief.module.css';

const pilotHref = 'https://agentrelay.com/will';
const description =
  'Chief manages coding-agent teams across your Linear or GitHub backlog and returns pull requests ready for review.';
const ogPath = '/chief/og.png';

export const metadata: Metadata = {
  title: { absolute: 'Chief by Agent Relay | Run your engineering backlog with agent teams' },
  description,
  alternates: { canonical: absoluteUrl('/chief') },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Chief by Agent Relay | The Agent Software Manager',
    description,
    url: absoluteUrl('/chief'),
    type: 'website',
    images: [ogImage(ogPath, 'Chief coordinates coding-agent teams across an engineering backlog')],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chief by Agent Relay | The Agent Software Manager',
    description,
    images: [absoluteUrl(ogPath)],
  },
};

const workflow = [
  {
    icon: ListTodo,
    title: 'Import the work',
    body: 'Chief takes issues from Linear or GitHub and determines what can run in parallel.',
    detail: 'Backlog in',
  },
  {
    icon: Bot,
    title: 'Start the right team',
    body: 'For each issue, Chief assembles and directs the coding agents needed to implement and review it.',
    detail: 'Teams assigned',
  },
  {
    icon: Workflow,
    title: 'Keep the work moving',
    body: 'Chief passes context, monitors progress, handles handoffs, and escalates decisions that need human judgment.',
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

function ResponsibilityDiagram() {
  return (
    <div className={s.responsibilityDiagram}>
      <div className={s.beforeDiagram}>
        <h3>Before Chief</h3>
        <div className={s.manualMap} aria-label="Engineer manually coordinates agents and tasks">
          <span className={s.personNode}><UserRound aria-hidden="true" />Engineer</span>
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
        <h3>With Chief</h3>
        <div className={s.managedMap} aria-label="Engineer directs Chief, Chief coordinates teams, and pull requests return to the engineer">
          <span className={s.personNode}><UserRound aria-hidden="true" />Engineer</span>
          <ArrowDown aria-hidden="true" />
          <span className={s.managedChief}>Chief</span>
          <div className={s.managedTeams}>
            <span>Team</span>
            <span>Team</span>
            <span>Team</span>
          </div>
          <span className={s.returnNode}><GitPullRequest aria-hidden="true" />Pull requests</span>
        </div>
        <p>You set direction and review the result.</p>
      </div>
    </div>
  );
}

export default function ChiefPage() {
  const navAction = <PilotButton compact />;

  return (
    <div className={s.page}>
      <SiteNav actions={navAction} mobileMenuContent={navAction} />

      <main>
        <section className={s.hero}>
          <div className={s.heroInner}>
            <div className={s.heroCopy}>
              <h1>The Agent Software Manager</h1>
              <p className={s.heroLead}>Let an agent manage the coordination of your agents. Step in when you need to.</p>
              <div className={s.heroActions}>
                <PilotButton />
                <Link className={s.secondaryButton} href="#workflow">
                  See how Chief works
                  <ArrowDown aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={s.problemSection}>
          <FadeIn className={s.problemInner}>
            <h2>Coding agents created a new management job.</h2>
            <div className={s.problemCopy}>
              <p>You can run eight coding agents at once. But then you spend the day starting them, passing context, checking progress, recovering failures, and deciding what happens next.</p>
              <p>The agents may be writing the code, but you are still managing every handoff.</p>
            </div>
          </FadeIn>
        </section>

        <section className={s.workflowSection} id="workflow">
          <div className={s.sectionIntro}>
            <FadeIn>
              <h2>Give Chief the backlog.</h2>
              <p>Chief turns a queue of issues into coordinated work that comes back in a form engineers already know how to review.</p>
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
                  <div className={s.workflowIcon}><Icon aria-hidden="true" /></div>
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
            <h2>You review the work. Chief manages the work.</h2>
            <p>Chief does not remove engineering judgment. It removes engineers from the coordination loop.</p>
            <p>You set priorities, permissions, and approval boundaries. Chief manages the agents. You review the pull requests and make the decisions that matter.</p>
          </FadeIn>
          <FadeIn delay={100}>
            <ResponsibilityDiagram />
          </FadeIn>
        </section>

        <section className={s.infrastructureSection}>
          <div className={s.infrastructureInner}>
            <FadeIn className={s.infrastructureCopy} direction="right">
              <h2>Relay underneath. Chief on top.</h2>
              <p>Agent Relay provides the durable communication layer beneath Chief across models, harnesses, and environments.</p>
              <p>Chief uses that infrastructure to coordinate long-running software work without requiring a human to relay every message.</p>
            </FadeIn>

            <FadeIn className={s.layerDiagram} delay={90} direction="left">
              <div className={s.chiefLayer}>
                <span>Management layer</span>
                <strong>Chief</strong>
                <p>Backlog planning, team direction, progress, handoffs, escalation</p>
              </div>
              <div className={s.relayLayer}>
                <span>Communication layer</span>
                <strong>Agent Relay</strong>
                <div className={s.capabilityGrid}>
                  {relayCapabilities.map((capability) => {
                    const Icon = capability.icon;
                    return <span key={capability.label}><Icon aria-hidden="true" />{capability.label}</span>;
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
              <p>We built Agent Relay so agents could communicate directly. Users built teams of coding agents to complete and review software tasks, but still had to supervise those teams themselves.</p>
              <p>Chief is the manager those agent teams were missing.</p>
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
