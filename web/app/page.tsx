import type { Metadata } from 'next';
import Link from 'next/link';

import { HomePosterText } from '../components/home/HomePosterText';
import { SiteFooter } from '../components/SiteFooter';
import { SiteNav } from '../components/SiteNav';
import { HOME_OG_IMAGE_PATH, ogImage } from '../lib/og-meta';
import { absoluteUrl } from '../lib/site';
import s from './landing.module.css';

const problemCards = [
  {
    title: 'Sessions fragment',
    body: 'Agents work in isolated windows, lose decisions, and drift away from the work the team already understands.',
  },
  {
    title: 'Humans route everything',
    body: 'Engineers become the message bus between tools, agents, files, status, and handoffs.',
  },
  {
    title: 'Teams cannot improve',
    body: 'Without shared history, agents cannot learn how the team works or coordinate across long-running tasks.',
  },
];

const teamCards = [
  {
    title: 'Any model or harness',
    body: 'Bring Claude, Codex, Gemini, local runners, or the next agent your team adopts.',
  },
  {
    title: 'One shared relay',
    body: 'Channels, threads, mentions, and durable history give every participant the same operating context.',
  },
  {
    title: 'Human control stays visible',
    body: 'Agents can drive work forward while people keep the decision points, review paths, and boundaries clear.',
  },
];

export const metadata: Metadata = {
  title: 'Agent Relay',
  description:
    'Communication infrastructure for software teams moving from human-centered tools to agent-centered engineering.',
  alternates: {
    canonical: absoluteUrl('/'),
  },
  openGraph: {
    title: 'Agent Relay',
    description:
      'Communication infrastructure for software teams moving from human-centered tools to agent-centered engineering.',
    url: absoluteUrl('/'),
    type: 'website',
    images: [ogImage(HOME_OG_IMAGE_PATH, 'Agent Relay')],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agent Relay',
    description:
      'Communication infrastructure for software teams moving from human-centered tools to agent-centered engineering.',
    images: [absoluteUrl(HOME_OG_IMAGE_PATH)],
  },
};

export default function HomePage() {
  const navGetStartedLink = (
    <Link href="/docs" className={`${s.ctaPrimary} ${s.homeNavAction}`}>
      Get Started
    </Link>
  );
  const mobileGetStartedLink = (
    <Link href="/docs" className={`${s.ctaPrimary} ${s.homeNavAction}`}>
      Get Started
    </Link>
  );

  return (
    <div className={`${s.page} ${s.homePage}`}>
      <SiteNav actions={navGetStartedLink} mobileMenuContent={mobileGetStartedLink} hideLinks />

      <main className={s.homeMain}>
        <HomePosterText />

        <section className={s.homeHero} aria-labelledby="home-title">
          <div className={s.homeHeroCopy}>
            <p className={s.homeKicker}>Agent-centered engineering</p>
            <h1 id="home-title" className={s.homeHeadline}>
              Infrastructure for agent-centered teams.
            </h1>
            <p className={s.homeLead}>
              Agent Relay is communication infrastructure for software teams moving from human-centered tools to
              hybrid teams where humans and agents work as one.
            </p>
            <div className={s.homeCtas}>
              <Link href="/docs" className={s.ctaPrimary}>
                Get Started
              </Link>
              <Link href="/messaging" className={s.ctaSecondary}>
                See Relay
              </Link>
            </div>
          </div>

          <div className={s.homeHeroPanel} aria-label="Shared relay diagram">
            <div className={s.homePanelHeader}>
              <span>Team relay</span>
              <span>shared context</span>
            </div>
            <div className={s.homeTeamStack}>
              <div className={`${s.homeTeamNode} ${s.homeTeamNodeHuman}`}>
                <span>Human lead</span>
                <strong>sets direction</strong>
              </div>
              <span className={s.homeTeamRail} aria-hidden="true" />
              <div className={s.homeTeamNode}>
                <span>Agent</span>
                <strong>implements</strong>
              </div>
              <div className={s.homeTeamNode}>
                <span>Agent</span>
                <strong>reviews</strong>
              </div>
              <div className={s.homeContextNode}>
                <span>Messages</span>
                <span>Files</span>
                <span>Decisions</span>
              </div>
            </div>
          </div>
        </section>

        <section className={s.homeBand} aria-labelledby="home-problem-title">
          <div className={s.homeBandInner}>
            <div className={s.homeSectionHeader}>
              <h2 id="home-problem-title" className={s.homeSectionTitle}>
                Software teams are changing.
              </h2>
              <p className={s.homeSectionText}>
                Engineers are beginning to lead teams of specialized agents, but the tools around them still assume
                one human working alone.
              </p>
            </div>
            <div className={s.homeCardGrid}>
              {problemCards.map((card) => (
                <article key={card.title} className={s.homeCard}>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${s.homeBand} ${s.homeBandAlt}`} aria-labelledby="home-team-title">
          <div className={`${s.homeBandInner} ${s.homeTwoColumn}`}>
            <div className={s.homeSectionHeader}>
              <h2 id="home-team-title" className={s.homeSectionTitle}>
                Build for teams, not single agents.
              </h2>
              <p className={s.homeSectionText}>
                Most AI products optimize how one agent thinks. Agent Relay optimizes how humans and agents
                communicate, coordinate, and improve together.
              </p>
            </div>
            <div className={s.homePrincipleList}>
              {teamCards.map((card) => (
                <article key={card.title} className={s.homePrincipleItem}>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={s.homeStatementBand} aria-label="Agent Relay thesis">
          <div className={s.homeStatement}>
            <p>
              We are not betting on which model or coding agent wins. We are betting that serious teams will run
              many of them.
            </p>
            <span>
              Agent Relay is the neutral collaboration layer connecting humans and agents across every model and
              harness.
            </span>
          </div>
        </section>

        <section className={s.homeCtaBand} aria-labelledby="home-cta-title">
          <div className={s.homeCtaInner}>
            <div>
              <h2 id="home-cta-title">Get your agents on the relay.</h2>
              <p>Give humans and agents one shared place to talk, coordinate, and move work forward.</p>
            </div>
            <Link href="/docs" className={s.ctaPrimary}>
              Get Started
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
