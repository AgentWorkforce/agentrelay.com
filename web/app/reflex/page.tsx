import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  BookOpenCheck,
  ChartNoAxesCombined,
  EyeOff,
  Gauge,
  Lightbulb,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
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

const managerQuestions = [
  'Are we getting better?',
  'Where is money being wasted?',
  'What workflows should be standardized?',
  'Who discovered something useful?',
  'What knowledge is trapped in individuals?',
];

const heroUsageRows = [
  { label: 'Tool calls', value: '8.4k', width: 92 },
  { label: 'MCP usage', value: '71%', width: 71 },
  { label: 'Accepted steers', value: '43', width: 58 },
  { label: 'Review loops', value: '-28%', width: 38 },
];

const heroInsightTiles = [
  {
    tone: 'blue',
    eyebrow: 'Workflow lift',
    title: 'Storybook first keeps winning',
    body: 'Frontend sessions that start from generated stories need fewer review passes.',
    metric: '40% fewer loops',
  },
  {
    tone: 'orange',
    eyebrow: 'Waste found',
    title: 'Auth retries are burning tokens',
    body: 'Permission changes repeatedly stall when the policy fixture is skipped.',
    metric: '5 reverted paths',
  },
];

export default function ReflexPage() {
  const navGetStartedLink = (
    <Link href="/docs" className={`${home.ctaPrimary} ${home.homeNavAction}`}>
      Get Started
    </Link>
  );
  const mobileGetStartedLink = (
    <Link href="/docs" className={`${home.ctaPrimary} ${home.homeNavAction}`}>
      Get Started
    </Link>
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
              <Link href="/docs" className={s.ctaPrimary}>
                Get Started
                <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
              </Link>
              <Link href="#capture" className={s.ctaSecondary}>
                See how it works
              </Link>
            </div>
          </div>

          <div className={s.usageVisual} aria-label="Reflex team usage insights">
            <div className={s.usageHeader}>
              <div>
                <span>Team relay</span>
                <strong>Session intelligence</strong>
              </div>
              <span className={s.usagePill}>14 runs</span>
            </div>

            <div className={s.usageBars}>
              {heroUsageRows.map((row) => (
                <div className={s.usageRow} key={row.label}>
                  <div className={s.usageRowMeta}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                  <div className={s.usageTrack}>
                    <span style={{ width: `${row.width}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className={s.insightTiles}>
              {heroInsightTiles.map((tile) => (
                <article
                  className={`${s.insightTile} ${tile.tone === 'orange' ? s.insightTileOrange : s.insightTileBlue}`}
                  key={tile.title}
                >
                  <svg className={s.insightWave} viewBox="0 0 280 120" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M-16 72C30 36 58 110 102 72S168 34 214 72 258 110 296 72" />
                    <path d="M-16 92C30 56 58 130 102 92S168 54 214 92 258 130 296 92" />
                  </svg>
                  <span>{tile.eyebrow}</span>
                  <strong>{tile.title}</strong>
                  <p>{tile.body}</p>
                  <em>{tile.metric}</em>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={s.contextBand} aria-label="What Reflex observes">
          <div>
            <span>Across Claude Code, Codex, OpenCode, and the rest of your agent stack.</span>
          </div>
          <div className={s.bandMetrics}>
            <strong>Anonymous by default</strong>
            <strong>Opt out anytime</strong>
            <strong>Codebase-aware</strong>
          </div>
        </section>

        <section className={s.captureSection} id="capture">
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

        <section className={s.learnSection}>
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

        <section className={s.visualProof}>
          <div className={s.assetFrame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand-kit/media/easy-to-build-the-right-context.png"
              alt="Agent Relay context tools showing real-time events, webhooks, and search"
              width={2048}
              height={1152}
              loading="lazy"
            />
          </div>
          <div className={s.assetCopy}>
            <Sparkles aria-hidden="true" size={24} strokeWidth={1.8} />
            <h2>Every session becomes better context for the next one.</h2>
            <p>
              Reflex builds on Agent Relay's event stream, search, and team messaging layer. The result is a
              living memory of how your agents actually get work done.
            </p>
          </div>
        </section>

        <section className={s.planSection}>
          <div className={s.planCopy}>
            <BookOpenCheck aria-hidden="true" size={26} strokeWidth={1.8} />
            <h2>Ask how your team usually solves the problem.</h2>
            <p>
              Plans should come from learned truths in your own repository, not generic internet advice or a
              teammate's memory.
            </p>
          </div>
          <div className={s.promptPanel}>
            <div className={s.promptQuestion}>How do we usually build React forms?</div>
            <div className={s.promptAnswer}>
              <p>Looking at the last 14 React forms shipped in this repository, engineers typically:</p>
              <ol>
                {planSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className={s.pairSection}>
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

        <section className={s.managerSection}>
          <div className={s.managerHead}>
            <ChartNoAxesCombined aria-hidden="true" size={28} strokeWidth={1.8} />
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

        <section className={s.finalCta}>
          <div>
            <MessagesSquare aria-hidden="true" size={26} strokeWidth={1.8} />
            <h2>Bring every useful discovery back to the team.</h2>
          </div>
          <Link href="/docs" className={s.ctaPrimary}>
            Get Started
            <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
