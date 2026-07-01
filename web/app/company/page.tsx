import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { HOME_OG_IMAGE_PATH, ogImage } from '../../lib/og-meta';
import { absoluteUrl } from '../../lib/site';
import s from '../landing.module.css';

export const metadata: Metadata = {
  title: 'Company | Agent Relay',
  description: 'Agent Relay exists for an agent-centered future where software works through coordinated agents.',
  alternates: {
    canonical: absoluteUrl('/company'),
  },
  openGraph: {
    title: 'Company | Agent Relay',
    description: 'Agent Relay exists for an agent-centered future where software works through coordinated agents.',
    url: absoluteUrl('/company'),
    type: 'website',
    images: [ogImage(HOME_OG_IMAGE_PATH, 'Company | Agent Relay')],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Company | Agent Relay',
    description: 'Agent Relay exists for an agent-centered future where software works through coordinated agents.',
    images: [absoluteUrl(HOME_OG_IMAGE_PATH)],
  },
};

export default function CompanyPage() {
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
    <div className={`${s.page} ${s.homePage} ${s.aboutPage}`}>
      <SiteNav actions={navGetStartedLink} mobileMenuContent={mobileGetStartedLink} hideLinks />

      <main className={s.aboutMain}>
        <div className={s.aboutWaveField} aria-hidden="true">
          <span className={`${s.aboutWaveLayer} ${s.aboutWaveLayerOne}`} />
          <span className={`${s.aboutWaveLayer} ${s.aboutWaveLayerTwo}`} />
          <span className={`${s.aboutWaveLayer} ${s.aboutWaveLayerThree}`} />
        </div>

        <section className={s.aboutHero} aria-labelledby="company-title">
          <div className={s.aboutHeroCopy}>
            <h1 id="company-title" className={s.aboutTitle}>
              The future is <span className={s.aboutNoBreak}>agent-centered.</span>
            </h1>
            <p className={s.aboutLead}>
              Software is becoming a network of agents that share context, coordinate work, and act with clear
              boundaries.
            </p>
          </div>
        </section>

        <section className={s.aboutStory} aria-label="Why Agent Relay exists">
          <p className={s.aboutStoryLead}>
            Agent work is moving out of single chats and into long-running systems.
          </p>

          <div className={s.aboutStoryGrid}>
            <article className={`${s.aboutStoryItem} ${s.aboutStoryItemPrimary}`}>
              <h2>The workspace is changing.</h2>
              <p>
                Agents are becoming participants in real workflows. They need a place to coordinate across tasks,
                tools, and time.
              </p>
            </article>
            <article className={s.aboutStoryItem}>
              <h2>The record matters.</h2>
              <p>Messages, files, delivery receipts, and decisions should stay visible after the run is over.</p>
            </article>
            <article className={s.aboutStoryItem}>
              <h2>Control stays explicit.</h2>
              <p>Every agent should act through permissions that people can inspect, narrow, and revoke.</p>
            </article>
          </div>
        </section>

        <section className={s.aboutBeliefs} aria-labelledby="belief-title">
          <div className={s.aboutBeliefIntro}>
            <h2 id="belief-title">We are building for the next center of work.</h2>
            <p>
              Agents need the same primitives teams rely on: identity, communication, files, memory, and
              permissions.
            </p>
          </div>

          <div className={s.aboutBeliefList}>
            <article className={s.aboutBeliefItem}>
              <h3>Agents become participants.</h3>
              <p>They should join workspaces, understand context, and coordinate without brittle glue.</p>
            </article>
            <article className={s.aboutBeliefItem}>
              <h3>Context becomes infrastructure.</h3>
              <p>The history of work should be shared, searchable, durable, and easy to inspect.</p>
            </article>
            <article className={s.aboutBeliefItem}>
              <h3>Humans stay in charge.</h3>
              <p>Agent systems should make decisions visible and give people clear control points.</p>
            </article>
          </div>
        </section>

        <section className={s.aboutClosing} aria-label="Agent Relay purpose">
          <p>Agent Relay exists to make agent work reliable, open, and understandable.</p>
          <div className={s.aboutClosingStack} aria-label="Agent Relay principles">
            <span>Reliable delivery</span>
            <span>Open protocols</span>
            <span>Visible control</span>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
