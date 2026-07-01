import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  EyeOff,
  Gauge,
  Lightbulb,
  MessagesSquare,
  ShieldCheck,
} from 'lucide-react';

import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { HOME_OG_IMAGE_PATH, ogImage } from '../../lib/og-meta';
import { absoluteUrl } from '../../lib/site';
import home from '../landing.module.css';
import s from './reflex.module.css';

export const metadata: Metadata = {
  title: 'Reflex by Agent Relay',
  description:
    'Reflex turns isolated AI coding sessions into shared team knowledge, so every prompt, tool choice, retry, and review can improve the next run.',
  alternates: {
    canonical: absoluteUrl('/reflex'),
  },
  openGraph: {
    title: 'Reflex by Agent Relay',
    description:
      'Capture what works across AI coding sessions, discover team patterns, and guide agents with knowledge from your own codebase.',
    url: absoluteUrl('/reflex'),
    type: 'website',
    images: [ogImage(HOME_OG_IMAGE_PATH, 'Reflex by Agent Relay')],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reflex by Agent Relay',
    description: 'Learn from every AI coding session your team runs.',
    images: [absoluteUrl(HOME_OG_IMAGE_PATH)],
  },
};

const captureSignals = [
  'Prompts and steers',
  'Tool and MCP usage',
  'Skills, rules, and agents.md files',
  'Retries and model switches',
  'Code churn and review outcomes',
  'Cost and time to completion',
];

const learningPatterns = [
  {
    title: 'Effective workflows',
    body: 'Find the workflows that keep shipping. Storybook first for frontend work, Skill X for migrations, MCP Y for low-churn changes.',
    icon: Lightbulb,
  },
  {
    title: 'Waste and drift',
    body: 'See where agents burn tokens, repeat dead ends, ignore existing patterns, or keep using skills that are not helping.',
    icon: Gauge,
  },
  {
    title: 'Codebase footguns',
    body: 'Surface the places where agents and engineers repeatedly miss permissions, validation, schemas, or release steps.',
    icon: ShieldCheck,
  },
];

const planSteps = [
  'Start from FormTemplate.tsx',
  'Install the team form skill',
  'Use the validation MCP server',
  'Check the schema issue that caused three reverted PRs',
];

const learnedSkillFiles = [
  {
    path: 'skills/frontend-forms.skill.md',
    meta: 'Workflow copied from shipped form changes',
  },
  {
    path: 'agents.md',
    meta: 'Repository defaults for planning and review',
  },
  {
    path: 'rules/auth-permissions.md',
    meta: 'Guardrail from repeated policy misses',
  },
  {
    path: 'mcp/playwright-harness.md',
    meta: 'Best-value browser check for UI work',
  },
];

const learnedSignals = [
  'Session pattern accepted by reviewers',
  'Tool sequence reused with low churn',
  'Private run excluded from team memory',
];

const managerQuestions = [
  'Are we getting better?',
  'Where is money being wasted?',
  'What workflows should be standardized?',
  'Who discovered something useful?',
  'What knowledge is trapped in individuals?',
];

const REFLEX_CLOUD_URL =
  'https://agentrelay.com/cloud?ref=reflex&utm_source=agentrelay.com&utm_medium=reflex_landing&utm_campaign=reflex';

function reflexCloudHref(utmContent: string) {
  return `${REFLEX_CLOUD_URL}&utm_content=${utmContent}`;
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

export default function ReflexPage() {
  const navGetStartedLink = (
    <a href={reflexCloudHref('nav')} className={`${home.ctaPrimary} ${home.homeNavAction}`}>
      Get Started
    </a>
  );
  const mobileGetStartedLink = (
    <a href={reflexCloudHref('mobile_nav')} className={`${home.ctaPrimary} ${home.homeNavAction}`}>
      Get Started
    </a>
  );

  return (
    <div className={s.page}>
      <SiteNav actions={navGetStartedLink} mobileMenuContent={mobileGetStartedLink} hideLinks />

      <main className={s.main}>
        <section className={s.hero}>
          <div className={s.heroCopy}>
            <h1>
              <span className={s.headlineLine}>Learn from every session</span>
              {' '}
              <span className={s.headlineLine}>your team runs.</span>
            </h1>
            <p className={s.heroLead}>
              Capture what works across AI coding sessions and turn it into shared team knowledge.
            </p>
            <div className={s.ctaRow}>
              <a href={reflexCloudHref('hero')} className={s.ctaPrimary}>
                Get Started
                <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
              </a>
              <Link href="#capture" className={s.ctaSecondary}>
                See how it works
              </Link>
            </div>
          </div>
        </section>

        <WaveBreak />

        <section className={`${s.captureSection} ${s.sectionBand} ${s.bandCapture}`} id="capture">
          <div className={s.sectionIntro}>
            <h2>Capture the work around the code.</h2>
            <p>
              Code is no longer the only output. Reflex observes the session mechanics that explain why a run
              succeeded, failed, got steered, or became expensive.
            </p>
          </div>

          <div className={s.captureGrid}>
            <div className={s.signalPanel}>
              {captureSignals.map((signal) => (
                <div className={s.signalRow} key={signal}>
                  <span>{signal}</span>
                </div>
              ))}
            </div>
            <div className={s.privacyPanel}>
              <EyeOff aria-hidden="true" size={26} strokeWidth={1.8} />
              <h3>Go incognito when the work needs privacy.</h3>
              <p>
                Disable capture for sensitive sessions without changing the rest of your team setup. Reflex is
                built for shared learning, not surveillance.
              </p>
            </div>
          </div>
        </section>

        <WaveBreak tone="orange" />

        <section className={`${s.learnSection} ${s.sectionBand} ${s.bandLearn}`}>
          <div className={s.sectionIntro}>
            <h2>Turn repeated behavior into team standards.</h2>
            <p>
              Reflex looks for patterns that can become skills, agents.md guidance, model defaults, harnesses,
              and review checklists.
            </p>
          </div>

          <div className={s.patternGrid}>
            {learningPatterns.map((pattern) => {
              const Icon = pattern.icon;
              return (
                <article className={s.patternCard} key={pattern.title}>
                  <Icon aria-hidden="true" size={24} strokeWidth={1.8} />
                  <h3>{pattern.title}</h3>
                  <p>{pattern.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className={`${s.visualProof} ${s.sectionBand} ${s.bandProof}`}>
          <div className={s.assetFrame}>
            <div className={s.skillMemoryVisual} aria-label="Learned skills file tree">
              <div className={s.skillMemoryGrid}>
                <div className={s.skillTreePane}>
                  <div className={s.treeRoot}>agentrelay-learning/</div>
                  <ol className={s.fileTree}>
                    {learnedSkillFiles.map((file) => (
                      <li className={s.fileTreeItem} key={file.path}>
                        <span className={s.filePath}>{file.path}</span>
                        <span className={s.fileMeta}>{file.meta}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className={s.skillSignalPane}>
                  <span>promoted from sessions</span>
                  {learnedSignals.map((signal) => (
                    <p key={signal}>{signal}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className={s.assetCopy}>
            <h2>Every session becomes better context for the next one.</h2>
            <p>
              Reflex builds on Agent Relay's event stream, search, and team messaging layer. The result is a
              living memory of how your agents actually get work done.
            </p>
          </div>
        </section>

        <WaveBreak />

        <section className={`${s.planSection} ${s.sectionBand} ${s.bandPlan}`}>
          <div className={s.planCopy}>
            <h2>Ask how your team usually solves the problem.</h2>
            <p>
              Plans should come from learned truths in your own repository, not generic internet advice or a
              teammate's memory.
            </p>
          </div>
          <div className={s.promptPanel} aria-label="Reflex terminal answer for React form planning">
            <div className={s.terminalHeader}>
              <div className={s.terminalChrome} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <span className={s.terminalTitle}>reflex.memory</span>
              <span className={s.terminalState}>team history</span>
            </div>
            <div className={s.terminalBody}>
              <div className={`${s.terminalLine} ${s.terminalCommand}`}>
                <span className={s.terminalPrompt}>$</span>
                <span>How do we usually build React forms?</span>
                <span className={s.terminalCursor} aria-hidden="true" />
              </div>
              <div className={`${s.terminalLine} ${s.terminalSearch}`}>
                <span className={s.terminalPrompt}>&gt;</span>
                <span>Searching the last 14 shipped React forms</span>
              </div>
              <div className={s.terminalAnswer}>
                <p>Engineers typically:</p>
                <ol>
                  {planSteps.map((step) => (
                    <li key={step}>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <WaveBreak tone="orange" />

        <section className={`${s.pairSection} ${s.sectionBand} ${s.bandPair}`}>
          <div className={s.sectionIntro}>
            <h2>Pair with the history of your team.</h2>
            <p>
              Real-time guidance calls out common failure modes while an engineer or agent is still in the
              session.
            </p>
          </div>
          <div className={s.warningGrid}>
            {[
              'Engineers usually forget to update permissions when modifying this service.',
              'This approach caused five reverted PRs.',
              'The last three similar changes used a different workflow.',
            ].map((warning) => (
              <article className={s.warningCard} key={warning}>
                <BellRing aria-hidden="true" size={20} strokeWidth={1.8} />
                <p>{warning}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${s.managerSection} ${s.sectionBand} ${s.bandManager}`}>
          <div className={s.managerHead}>
            <h2>Make your team better with the sessions you already pay for.</h2>
            <p>
              Reflex helps engineering leaders see whether agent usage is compounding into standards, savings,
              and faster onboarding.
            </p>
          </div>
          <div className={s.questionGrid}>
            {managerQuestions.map((question) => (
              <div className={s.questionItem} key={question}>
                {question}
              </div>
            ))}
          </div>
        </section>

        <section className={`${s.finalCta} ${s.sectionBand} ${s.bandFinal}`}>
          <div>
            <MessagesSquare aria-hidden="true" size={26} strokeWidth={1.8} />
            <h2>Bring every useful discovery back to the team.</h2>
          </div>
          <a href={reflexCloudHref('final_cta')} className={s.ctaPrimary}>
            Get Started
            <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
          </a>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
