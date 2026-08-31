import type { Metadata } from 'next';
import Image from 'next/image';

import { SiteNav } from '../../components/SiteNav';
import { DEFAULT_OG_IMAGE_PATH, ogImage } from '../../lib/og-meta';
import { absoluteUrl } from '../../lib/site';
import { SkipWorkstreamDemo } from './SkipWorkstreamDemo';
import s from './skip.module.css';

const description =
  'Skip assigns engineering backlog tasks across coding agents, coordinates their work, reviews the output, and returns pull requests for human approval.';
const skipOgImage = ogImage(DEFAULT_OG_IMAGE_PATH, 'Skip by Agent Relay');

export const metadata: Metadata = {
  title: { absolute: 'Skip by Agent Relay | An engineering manager for coding agents' },
  description,
  alternates: { canonical: absoluteUrl('/skip') },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Skip by Agent Relay | An engineering manager for coding agents',
    description,
    url: absoluteUrl('/skip'),
    type: 'website',
    images: [skipOgImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Skip by Agent Relay | An engineering manager for coding agents',
    description,
    images: [skipOgImage.url],
  },
};

export default function SkipPage() {
  return (
    <div className={s.page}>
      <SiteNav />

      <main>
        <section className={s.hero}>
          <div className={s.heroInner}>
            <div className={s.heroCopy}>
              <h1>Give your coding agents a manager.</h1>
              <p className={s.lead}>
                Skip works with you to plan the backlog, coordinate coding agents, and surface the decisions that need your input.
              </p>
              <a className={s.cta} href="https://agentrelay.com/will">
                Join Waitlist
              </a>
            </div>

            <div
              className={s.glanceFlow}
              role="img"
              aria-label="You work with Skip to turn your existing backlog into coordinated agent work and approved pull requests."
            >
              <div className={s.flowYou}>
                <span>You</span>
                <strong>Priorities + approvals</strong>
              </div>

              <div className={s.flowMain} aria-hidden="true">
                <div className={s.flowEndpoint}>
                  <span>Backlog</span>
                  <div className={s.flowRows}><i /><i /><i /></div>
                </div>

                <span className={s.flowConnector} />

                <div className={s.flowSkip}>
                  <strong>Skip</strong>
                  <span>Works with you</span>
                </div>

                <span className={s.flowConnector} />

                <div className={s.flowEndpoint}>
                  <span>Pull requests</span>
                  <div className={s.flowRows}><i /><i /></div>
                </div>
              </div>

              <p className={s.flowAccess}>Any agent stack. Inspect and steer at any time.</p>
            </div>
          </div>
        </section>

        <section className={s.process} aria-labelledby="process-title">
          <div className={s.processInner}>
            <header className={s.processHeader}>
              <h2 id="process-title">How you work with Skip</h2>
              <p>Keep your backlog and agent stack. Skip helps turn both into coordinated work without hiding the process.</p>
            </header>

            <div className={s.processSteps}>
              <article className={s.processStep}>
                <div className={s.processCopy}>
                  <span className={s.processMarker} aria-hidden="true" />
                  <div>
                    <h3>Keep the backlog where it lives</h3>
                    <p>Build and prioritize work in Linear, GitHub Issues, or whatever your team already uses. Skip works from there.</p>
                  </div>
                </div>
                <div className={s.integrationPanel} aria-label="GitHub, Linear, and Jira backlogs connected to Skip">
                  <div className={s.panelHeader}>Connected backlog</div>
                  <div className={s.integrationStage}>
                    <div className={s.sourceList}>
                      <div className={s.sourceNode}>
                        <Image src="/integration-logos/github.svg" alt="" width={34} height={34} />
                        <span>GitHub</span>
                        <i className={s.sourceLine}><b /></i>
                      </div>
                      <div className={s.sourceNode}>
                        <Image src="/integration-logos/linear.svg" alt="" width={34} height={34} />
                        <span>Linear</span>
                        <i className={s.sourceLine}><b /></i>
                      </div>
                      <div className={s.sourceNode}>
                        <Image src="/integration-logos/jira.svg" alt="" width={34} height={34} />
                        <span>Jira</span>
                        <i className={s.sourceLine}><b /></i>
                      </div>
                    </div>

                    <div className={s.integrationSkip}>
                      <strong>Skip</strong>
                      <span>Watching the backlog</span>
                    </div>
                  </div>
                </div>
              </article>

              <article className={s.processStep}>
                <div className={s.processCopy}>
                  <span className={s.processMarker} aria-hidden="true" />
                  <div>
                    <h3>Plan and launch the work together</h3>
                    <p>Work with Skip to break down tasks and choose the right coding agents. Each agent can use any harness, tool, or factory.</p>
                  </div>
                </div>
                <SkipWorkstreamDemo />
              </article>

              <article className={s.processStep}>
                <div className={s.processCopy}>
                  <span className={s.processMarker} aria-hidden="true" />
                  <div>
                    <h3>Steer whenever it matters</h3>
                    <p>As the plan and implementation move forward, jump into any agent or terminal, or wait for Skip to ask when your judgment would help.</p>
                  </div>
                </div>
                <div className={s.reviewPanel} aria-label="Skip requesting useful human input while direct agent controls remain available">
                  <div className={s.panelHeader}>Your controls</div>
                  <div className={s.reviewBody}>
                    <span>Input requested</span>
                    <strong>Choose the authentication boundary</strong>
                    <p>Skip thinks your judgment would help here.</p>
                  </div>
                  <div className={s.reviewActions}><span>Jump in anytime</span><span>Let Skip ask</span></div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className={s.control}>
          <div className={s.controlInner}>
            <h2>Stay involved at the right level.</h2>
            <p>
              Follow every agent when you want to. When you do not, Skip keeps the work moving and asks for input when it is useful.
            </p>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <p>Skip is built by Agent Relay.</p>
      </footer>
    </div>
  );
}
