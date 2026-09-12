import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  GitPullRequest,
  Headphones,
  ShieldCheck,
  FlaskConical,
  FileSearch,
  GitBranch,
  Voicemail,
  MessagesSquare,
  Workflow,
} from 'lucide-react';

import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { HOME_OG_IMAGE_PATH, ogImage } from '../../lib/og-meta';
import { absoluteUrl } from '../../lib/site';
import home from '../landing.module.css';
import s from './flows.module.css';

export const metadata: Metadata = {
  title: 'Relayflows — The runtime for agentic features',
  description:
    'Script your agents instead of prompting them. Relayflows is the runtime layer that runs multi-agent pipelines with hard gates on real artifacts, native integrations, and human approval where judgment matters.',
  alternates: {
    canonical: absoluteUrl('/flows'),
  },
  openGraph: {
    title: 'Relayflows — The runtime for agentic features',
    description:
      'Multi-agent pipelines with hard gates on real artifacts, native integrations, and human approval where judgment matters.',
    url: absoluteUrl('/flows'),
    type: 'website',
    images: [ogImage(HOME_OG_IMAGE_PATH, 'Relayflows by Agent Relay')],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Relayflows — The runtime for agentic features',
    description: 'Script your agents. Gate on files, not on prose. Run in our infrastructure.',
    images: [absoluteUrl(HOME_OG_IMAGE_PATH)],
  },
};

const FLOWS_CLOUD_URL =
  'https://agentrelay.com/cloud?ref=flows&utm_source=agentrelay.com&utm_medium=flows_landing&utm_campaign=flows';

function flowsCloudHref(utmContent: string) {
  return `${FLOWS_CLOUD_URL}&utm_content=${utmContent}`;
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

const useCases = [
  {
    icon: GitPullRequest,
    tag: 'Software factory',
    title: 'Ticket → merged PR',
    body:
      'Plan the change, implement it on an isolated branch, run the tests inside the runtime, and let an adversarial reviewer on a different model try to sink it. Only then open the PR through the native GitHub integration.',
  },
  {
    icon: FileSearch,
    tag: 'Code review',
    title: 'Multi-lens PR review',
    body:
      'Security, correctness, and performance reviewers run in parallel — each gated on writing findings, not on chat prose. A reconciler resolves disagreements before a human ever looks.',
  },
  {
    icon: Headphones,
    tag: 'Customer success',
    title: 'Support triage with humans in the loop',
    body:
      'Classify the message, draft the reply, wait for a Slack approval, send it. The runtime enforces the HIPAA boundary — any step that touches PII cuts off network access downstream.',
  },
  {
    icon: MessagesSquare,
    tag: 'Content ops',
    title: 'Research → draft → fact-check → publish',
    body:
      'The fact-checker gates on writing a marker file, not on saying "looks good." A confidently wrong writer fails closed instead of quietly shipping.',
  },
  {
    icon: GitBranch,
    tag: 'Fleet-wide',
    title: 'Migration bot across N repos',
    body:
      'Fan out the same refactor across every repo, gate each on tests + CI passing, and open PRs through the built-in integration. Journal-backed so a retry doesn\'t double-open.',
  },
  {
    icon: Voicemail,
    tag: 'Voice ops',
    title: 'Voicemail → callback',
    body:
      'Transcribe, classify urgency, draft the callback, wait for a human okay, dial out. The six copy-paste steps between six humans collapse into one script with one approval.',
  },
  {
    icon: FlaskConical,
    tag: 'Research',
    title: 'Multi-model research report',
    body:
      'Different researchers on different models, a synthesis pass, and a citation verifier that fails the run when a URL doesn\'t resolve. No hallucinated sources survive.',
  },
  {
    icon: ShieldCheck,
    tag: 'Compliance',
    title: 'Data-privacy pipelines',
    body:
      'Once a step touches sensitive data, the runtime revokes network access for every downstream agent. The boundary is enforced by the pipeline, not trusted to the model.',
  },
];

const integrations = [
  'GitHub',
  'Linear',
  'Slack',
  'Jira',
  'Notion',
  'Stripe',
  'HubSpot',
  'Intercom',
  'Postgres',
  'Redis',
  'S3',
  'Cloudflare',
  'Sendgrid',
  'Mailgun',
  'Gmail',
  'Google Calendar',
  'Segment',
  'PostHog',
];

export default function FlowsPage() {
  const navGetStartedLink = (
    <a href={flowsCloudHref('nav')} className={`${home.ctaPrimary} ${home.homeNavAction}`}>
      Get Started
    </a>
  );
  const mobileGetStartedLink = (
    <a href={flowsCloudHref('mobile_nav')} className={`${home.ctaPrimary} ${home.homeNavAction}`}>
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
              <span className={s.headlineLine}>Stop babysitting your agents.</span>{' '}
              <span className={s.headlineLine}>Script them.</span>
            </h1>
            <p className={s.heroLead}>
              Relayflows is the runtime for agentic features. Multi-agent pipelines with hard gates on real
              artifacts, native integrations, and human approval where judgment actually matters. Runs on
              our infrastructure so your product can call it per user request.
            </p>
            <div className={s.ctaRow}>
              <a href={flowsCloudHref('hero')} className={s.ctaPrimary}>
                Get Started
                <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
              </a>
              <Link href="#use-cases" className={s.ctaSecondary}>
                See what teams build
              </Link>
            </div>
          </div>
        </section>

        <WaveBreak />

        <section id="use-cases" className={`${s.sectionBand} ${s.bandCases}`}>
          <div className={s.sectionIntro}>
            <h2>What teams build with Flows.</h2>
            <p>
              Anywhere a pipeline of agents (and sometimes humans) has to run in order, with checks that
              actually enforce the plan, a Flow replaces the copy-paste, the mega-prompt, and the
              hope-and-pray.
            </p>
          </div>

          <div className={s.useCaseGrid}>
            {useCases.map((c) => {
              const Icon = c.icon;
              return (
                <article className={s.useCaseCard} key={c.title}>
                  <Icon aria-hidden="true" size={22} strokeWidth={1.8} />
                  <span className={s.useCaseTag}>{c.tag}</span>
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <WaveBreak tone="orange" />

        <section className={`${s.sectionBand} ${s.bandCode}`}>
          <div className={s.codeSection}>
            <div className={s.codeCopy}>
              <h2>A Flow is a script your agents run.</h2>
              <p>
                Written in TypeScript. Each step names its agent, its model, and the file it must produce.
                Every gate is a check the runtime performs — against the filesystem, against the exit code
                of a real command, against an external side-effect that either happened or didn&apos;t.
              </p>
              <p>
                Agents do the judgment work. Helpers do the determined work. The runtime keeps the two
                honest.
              </p>
            </div>

            <div className={s.codeBlock}>
              <div className={s.codeHeader}>
                <div className={s.codeChrome}>
                  <span />
                  <span />
                  <span />
                </div>
                <span>software-factory.flow.ts</span>
              </div>
              <pre className={s.codePre}>
{`export default `}<span className={s.codeFn}>flow</span>{`<TicketInput>(
  `}<span className={s.codeStr}>&quot;software-factory&quot;</span>{`,
  { budget: `}<span className={s.codeStr}>&quot;$8/run&quot;</span>{` },
  `}<span className={s.codeKw}>async</span>{` (f, input) => {
    `}<span className={s.codeKw}>await</span>{` f
      .`}<span className={s.codeFn}>agent</span>{`(`}<span className={s.codeStr}>&quot;planner&quot;</span>{`, { model: `}<span className={s.codeStr}>&quot;claude-sonnet-5&quot;</span>{`, task: ... })
      .`}<span className={s.codeFn}>gate</span>{`((r) => r.artifacts.includes(`}<span className={s.codeStr}>&quot;plan/plan.md&quot;</span>{`));

    `}<span className={s.codeKw}>await</span>{` f
      .`}<span className={s.codeFn}>agent</span>{`(`}<span className={s.codeStr}>&quot;implementer&quot;</span>{`, { model: `}<span className={s.codeStr}>&quot;claude-opus-5&quot;</span>{`, task: ... })
      .`}<span className={s.codeFn}>gate</span>{`((r) => r.artifacts.includes(`}<span className={s.codeStr}>&quot;impl/branch.txt&quot;</span>{`));

    `}<span className={s.codeCmt}>{`// The runtime runs the tests. The agent cannot lie about the exit code.`}</span>{`
    `}<span className={s.codeKw}>await</span>{` f
      .`}<span className={s.codeFn}>run</span>{`(`}<span className={s.codeStr}>{`\`git checkout $(cat impl/branch.txt) && npm test\``}</span>{`)
      .`}<span className={s.codeFn}>gate</span>{`((out) => /failed:\\s*0/.test(out));

    `}<span className={s.codeCmt}>{`// Different model. Its only job is to break the PR.`}</span>{`
    `}<span className={s.codeKw}>await</span>{` f
      .`}<span className={s.codeFn}>agent</span>{`(`}<span className={s.codeStr}>&quot;adversary&quot;</span>{`, { model: `}<span className={s.codeStr}>&quot;gpt-5&quot;</span>{`, task: ... })
      .`}<span className={s.codeFn}>gate</span>{`((r) => r.artifacts.includes(`}<span className={s.codeStr}>&quot;adversary/clean&quot;</span>{`));

    `}<span className={s.codeCmt}>{`// Deterministic step, not an agent decision. Journal-backed.`}</span>{`
    `}<span className={s.codeKw}>await</span>{` f.github.`}<span className={s.codeFn}>createPullRequest</span>{`({
      repo: input.repo,
      head: `}<span className={s.codeStr}>{`\`feat/\${input.ticketId}\``}</span>{`,
      base: input.baseBranch,
      bodyPath: `}<span className={s.codeStr}>&quot;impl/summary.md&quot;</span>{`,
    });

    f.`}<span className={s.codeFn}>done</span>{`(`}<span className={s.codeStr}>&quot;success&quot;</span>{`);
  },
);`}
              </pre>
            </div>
          </div>
        </section>

        <WaveBreak />

        <section className={`${s.sectionBand} ${s.bandGate}`}>
          <div className={s.sectionIntro}>
            <h2>Gates check files, not prose.</h2>
            <p>
              Every other framework gates on the model&apos;s own output — a JSON schema, a substring, a
              prose &ldquo;expected output.&rdquo; That&apos;s the model grading its own paper. Flows gates
              on side-effects the runtime observed.
            </p>
          </div>

          <div className={s.gateStrip}>
            <article className={`${s.gateCard} ${s.gateBad}`}>
              <h3>Soft gate (elsewhere)</h3>
              <p>
                &ldquo;If every claim is supported, respond with PASSED.&rdquo; The reviewer says PASSED
                and the pipeline continues. An agent that hallucinates confidence passes.
              </p>
            </article>
            <article className={`${s.gateCard} ${s.gateGood}`}>
              <h3>Hard gate (Flows)</h3>
              <p>
                &ldquo;If every claim is supported, write <code>drafts/fact-check.passed</code>.&rdquo; The
                runtime checks whether the file exists. No file, no continue. Prose cannot fake it.
              </p>
            </article>
            <article className={`${s.gateCard} ${s.gateBad}`}>
              <h3>Soft gate (elsewhere)</h3>
              <p>
                &ldquo;Run the tests and confirm they pass.&rdquo; The agent reports pass. On retry the
                same lie is repeated.
              </p>
            </article>
            <article className={`${s.gateCard} ${s.gateGood}`}>
              <h3>Hard gate (Flows)</h3>
              <p>
                <code>f.run(&quot;npm test&quot;).gate((out) =&gt; /failed:\s*0/.test(out))</code>. The
                runtime runs the tests. The agent never sees the exit code. Nothing to lie about.
              </p>
            </article>
          </div>
        </section>

        <section className={`${s.sectionBand} ${s.bandIntegrations}`}>
          <div className={s.sectionIntro}>
            <h2>Native integrations for the determined work.</h2>
            <p>
              Opening a PR isn&apos;t a judgment call — it&apos;s a determined side-effect on an external
              system. Flows ships built-in, journal-backed helpers for the systems your product already
              lives in. No shell-outs, no raw tokens in the sandbox, idempotent on retry.
            </p>
          </div>

          <div className={s.integrationsRow}>
            {integrations.map((name) => (
              <span key={name} className={s.integrationChip}>
                {name}
              </span>
            ))}
          </div>
        </section>

        <section className={`${s.finalCta} ${s.sectionBand} ${s.bandFinal}`}>
          <div>
            <Workflow aria-hidden="true" size={26} strokeWidth={1.8} />
            <h2>Now taking paid design partners.</h2>
            <p className={s.finalCtaLead}>
              We&apos;re working directly with a small number of teams shipping agentic features to build
              their pipelines on Flows. If that&apos;s you, book a call and let&apos;s see if it&apos;s a
              fit.
            </p>
          </div>
          <a
            href="https://agentrelay.com/meet-with-khaliq"
            className={s.ctaPrimary}
          >
            Book a call
            <ArrowRight aria-hidden="true" size={17} strokeWidth={2} />
          </a>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
