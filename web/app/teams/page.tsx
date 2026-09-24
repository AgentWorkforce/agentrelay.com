import { ContextCapabilities } from '../../components/home/ContextCapabilities';
import type { Metadata } from 'next';
import Image from 'next/image';
import dashboardConcept from '../../public/teams/teams-dashboard-concept.webp';
import sessionConcept from '../../public/teams/teams-session-overview-concept.webp';
import { HeroTerminalMarquee } from '../../components/home/HeroTerminalMarquee';
import { DeploymentCall } from '../../components/home/DeploymentCall';
import { MessagingFeature } from '../../components/home/MessagingFeature';
import { DurableWorkflowFeature } from '../../components/home/DeliveryFeature';
import { InvestorStrip } from '../../components/InvestorStrip';
import { GitHubIcon, WaveDivider } from '../../components/home/icons';
import { SiteNav } from '../../components/SiteNav';
import { SiteFooter } from '../../components/SiteFooter';
import { TEAMS_OG_ALT, TEAMS_OG_IMAGE_PATH, ogImage } from '../../lib/og-meta';
import { absoluteUrl } from '../../lib/site';
import { teamsCloudUrl } from '../../lib/teams-cloud';
import { AgentSignup } from '../../components/AgentSignup';
import home from '../landing.module.css';
import flows from '../flows/flows.module.css';
import { IntegrationMarquee } from '../flows/IntegrationMarquee';
import s from './teams-landing.module.css';

export const metadata: Metadata = {
  title: 'Agent Relay Teams | Your team’s coding sessions',
  description: 'Connect your computer to Agent Relay and bring your team’s coding sessions into one shared history.',
  alternates: { canonical: absoluteUrl('/teams') },
  openGraph: {
    title: 'Agent Relay Teams | Your team’s coding sessions',
    description: 'See what every agent is doing. Follow the work. Share what works.',
    url: absoluteUrl('/teams'),
    type: 'website',
    images: [ogImage(TEAMS_OG_IMAGE_PATH, TEAMS_OG_ALT)],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agent Relay Teams | Your team’s coding sessions',
    description: 'See what every agent is doing. Follow the work. Share what works.',
    images: [absoluteUrl(TEAMS_OG_IMAGE_PATH)],
  },
};

export default function TeamsPage() {
  const signupHref = teamsCloudUrl('/api/auth/google/start?next=%2Fteams%2Fconnect');
  const signupLabel = 'Sign up for free';
  const setupLink = (
    <a className={`${home.ctaPrimary} ${home.homeNavAction}`} href={signupHref}>
      {signupLabel}
    </a>
  );

  return (
    <div className={`${flows.page} ${home.messagingPage} ${s.page}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteNav hideLinks actions={setupLink} mobileMenuContent={setupLink} />

      <main id="main">
        <div className={home.heroSection}>
          <section className={home.heroCenter}>
            <div className={home.heroCenterColumn}>
              <h1 className={`${home.headline} ${home.heroCenterHeadline}`}>
                <span className={flows.headlineLine}>See what every agent on your team is doing</span>
              </h1>
              <p className={`${home.subtitle} ${home.heroCenterSubtitle}`}>
                Share your coding agent sessions with your team, find overlapping work, and discover whats working for everyone.
              </p>
              <div className={`${home.heroCenterCtas} ${s.signupCtas}`}>
                <a className={home.ctaPrimary} href={signupHref}>
                  {signupLabel}
                </a>
                <AgentSignup product="teams" />
                <p className={s.signupNote}>No credit card required</p>
              </div>
            </div>
          </section>

          <InvestorStrip />
          <HeroTerminalMarquee showAvatars />
        </div>

        <div className={flows.main}>

          <div className={flows.capabilityWaveBreak}><WaveDivider variant="capability" /></div>

          <section id="how-it-works" className={`${flows.sectionBand} ${flows.bandCode} ${s.activitySection}`} aria-labelledby="teams-setup-heading">
            <div className={s.activityIntro}>
              <h2 id="teams-setup-heading">Your whole team's coding agents, under one roof</h2>
              <p>Work like you normally would. Agent sessions get shared automatically. Get a bird’s-eye view of all the work happening across the team.</p>
            </div>
            <figure className={s.productScreenshot}>
              <a href={dashboardConcept.src} target="_blank" rel="noreferrer" aria-label="View the full dashboard concept">
                <Image
                  src={dashboardConcept}
                  width={1585}
                  height={992}
                  sizes="(max-width: 960px) 100vw, 950px"
                  unoptimized
                  alt="Dashboard concept: eight coding sessions grouped under Will, Maya, and Alex, with coding tools, Working, Idle, and Finished statuses, and pull request links on finished sessions."
                />
              </a>
            </figure>
          </section>

          <div className={flows.capabilityWaveBreak}><WaveDivider variant="capability" /></div>

          <section id="session-overview" className={`${flows.sectionBand} ${s.sessionSection}`} aria-labelledby="session-overview-heading">
            <div className={s.sessionIntro}>
              <h2 id="session-overview-heading">Dig in when you need to</h2>
              <p>Open any agent session to see what it’s working toward, the constraints it’s following, and how long it’s been running. Read the conversation, or replay it from the start.</p>
            </div>
            <figure className={s.sessionScreenshot}>
              <a href={sessionConcept.src} target="_blank" rel="noreferrer" aria-label="View the full session detail concept (opens in a new tab)">
                <Image
                  src={sessionConcept}
                  sizes="(max-width: 960px) 100vw, 950px"
                  unoptimized
                  alt="Session detail concept for Add Google sign-in: an intent and constraints overview, Working status, running time of 18 minutes 42 seconds, a Replay conversation button, and the rendered conversation between Will Washburn and Claude Code."
                />
              </a>
            </figure>
          </section>

          <div className={flows.capabilityWaveBreak}><WaveDivider variant="capability" /></div>

          <section id="teams-durable-workflows" className={flows.workflowSection} aria-label="Find the shared bottlenecks. Fix with workflows.">
            <DurableWorkflowFeature
              title="Find the shared bottlenecks. Fix with workflows."
              showCapabilities={false}
              items={[
                'Turn recurring reviews, handoffs, and follow-ups into workflows your whole team can reuse.',
                'Bring agents, scripts, and human approvals together in a clear sequence of steps.',
                'Run workflows on a schedule or when work changes in your connected tools.',
                'See where work gets stuck, improve the process, and share what works across the team.',
              ]}
            />
          </section>

          <div className={flows.capabilityWaveBreak}><WaveDivider variant="capability" /></div>

          <section id="teams-agent-workflows" className={flows.workflowSection} aria-label="Let your agents talk. Directly.">
            <MessagingFeature intro="Work together on the intents and constraints, but let the agents collaborate themselves when it’s time to do the work." />
          </section>

          <section id="how-it-works-more" aria-label="Agents on the Relay have everything they need to collaborate">
            <ContextCapabilities title="Agents on the Relay have everything they need to collaborate" />
          </section>

          <section className={`${flows.sectionBand} ${flows.openSourceSection}`} aria-labelledby="teams-open-source">
            <div className={flows.sectionIntro}>
              <h2 id="teams-open-source">Open source.<br />Run it anywhere.</h2>
              <p>
                Your laptop, your servers, or our cloud. Agent Relay runs where your work lives,
                with the source code in your hands.
              </p>
              <div className={flows.ctaRow}>
                <a href="https://github.com/agentworkforce/relay" className={flows.ctaSecondary}>
                  <GitHubIcon />
                  Github
                </a>
              </div>
            </div>
          </section>

          <div className={flows.capabilityWaveBreak}><WaveDivider variant="capability" /></div>

          <section className={`${flows.sectionBand} ${flows.bandIntegrations} ${s.integrationsSection}`}>
            <div className={flows.sectionIntro}>
              <h2>Connect the tools you already use.</h2>
              <p>
                Give all the agents on the relay controlled access to the tools they need through a virtual file system.
              </p>
            </div>

            <IntegrationMarquee />
          </section>

          <DeploymentCall
            title="Scope your Agent Relay deployment"
            example="agent"
            description="We're actively looking for design partners who are looking to level their engineering team's process up. You'll have direct access to our team and great discounts on all paid plans."
            topics={[
              'Walk through how to get your team and their agents on the relay.',
              'Discover where you can level up your agents and workflows',
              'Identify team wide bottlenecks and discover proactive workflows to run on the relay',
              'Review hosted, private cloud, or self-managed options',
              'Leave with a clear path from discovery to production',
            ]}
            contact={{ name: 'Will Washburn', role: 'Co-founder, CEO', image: '/authors/will-128.webp', href: '/will' }} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
