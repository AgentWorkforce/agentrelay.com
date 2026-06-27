import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { HOME_OG_IMAGE_PATH, ogImage } from '../../lib/og-meta';
import { absoluteUrl } from '../../lib/site';
import s from '../landing.module.css';

export const metadata: Metadata = {
  title: 'About Agent Relay',
  description: 'Agent Relay exists for an agent-centered future where software works through coordinated agents.',
  alternates: {
    canonical: absoluteUrl('/about'),
  },
  openGraph: {
    title: 'About Agent Relay',
    description: 'Agent Relay exists for an agent-centered future where software works through coordinated agents.',
    url: absoluteUrl('/about'),
    type: 'website',
    images: [ogImage(HOME_OG_IMAGE_PATH, 'About Agent Relay')],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Agent Relay',
    description: 'Agent Relay exists for an agent-centered future where software works through coordinated agents.',
    images: [absoluteUrl(HOME_OG_IMAGE_PATH)],
  },
};

export default function AboutPage() {
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
        <section className={s.aboutHero} aria-labelledby="about-title">
          <div className={s.aboutHeroCopy}>
            <h1 id="about-title" className={s.aboutTitle}>
              The future is <span className={s.aboutNoBreak}>agent-centered.</span>
            </h1>
            <p className={s.aboutLead}>
              Software is becoming a network of agents that work with people, share context, and move work
              forward.
            </p>
          </div>

          <div className={s.aboutOrbit} role="img" aria-label="Agent Relay at the center of agent work">
            <span className={`${s.aboutOrbitRing} ${s.aboutOrbitRingOuter}`} />
            <span className={`${s.aboutOrbitRing} ${s.aboutOrbitRingInner}`} />
            <span className={`${s.aboutOrbitNode} ${s.aboutOrbitNodeTop}`}>People</span>
            <span className={`${s.aboutOrbitNode} ${s.aboutOrbitNodeRight}`}>Tools</span>
            <span className={`${s.aboutOrbitNode} ${s.aboutOrbitNodeBottom}`}>Memory</span>
            <span className={`${s.aboutOrbitNode} ${s.aboutOrbitNodeLeft}`}>Files</span>
            <span className={s.aboutOrbitCore}>
              <img src="/brand-kit/agent-relay-mark-transparent.png" alt="" className={s.aboutOrbitMark} />
            </span>
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
          <p>Agent Relay exists to make that future reliable, open, and understandable.</p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
