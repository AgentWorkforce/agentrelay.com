import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteFooter } from '../components/SiteFooter';
import { SiteNav } from '../components/SiteNav';
import { HOME_OG_IMAGE_PATH, ogImage } from '../lib/og-meta';
import { absoluteUrl } from '../lib/site';
import s from './landing.module.css';

const HOME_POSTER_LINES = ['UNLEASH', 'YOUR', 'TEAM'];
const HOME_POSTER_SHADOW_STEPS = Array.from({ length: 260 }, (_, index) => index + 1);
const HOME_POSTER_LINE_START = 236;
const HOME_POSTER_LINE_HEIGHT = 194;
const HOME_POSTER_SHADOW_STEP_SIZE = 2.3;

export const metadata: Metadata = {
  title: 'Agent Relay',
  description:
    'Infrastructure for AI agents that need shared context, reliable delivery, tools, files, schedules, and human handoffs.',
  alternates: {
    canonical: absoluteUrl('/'),
  },
  openGraph: {
    title: 'Agent Relay',
    description:
      'Infrastructure for AI agents that need shared context, reliable delivery, tools, files, schedules, and human handoffs.',
    url: absoluteUrl('/'),
    type: 'website',
    images: [ogImage(HOME_OG_IMAGE_PATH, 'Agent Relay')],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agent Relay',
    description:
      'Infrastructure for AI agents that need shared context, reliable delivery, tools, files, schedules, and human handoffs.',
    images: [absoluteUrl(HOME_OG_IMAGE_PATH)],
  },
};

function HomePosterText({ lines = HOME_POSTER_LINES }: { lines?: string[] }) {
  const title = lines.join(' ');

  return (
    <section className={s.homePosterHero} aria-label={title}>
      <svg
        className={s.homePosterSvg}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMinYMin meet"
        role="img"
      >
        <title>{title}</title>
        <g aria-hidden="true">
          {HOME_POSTER_SHADOW_STEPS.map((step) => (
            <g
              key={step}
              transform={`translate(${step * HOME_POSTER_SHADOW_STEP_SIZE} ${
                step * HOME_POSTER_SHADOW_STEP_SIZE
              })`}
            >
              {lines.map((line, index) => (
                <text
                  key={`${step}-${line}-${index}`}
                  className={s.homePosterShadowLine}
                  x="34"
                  y={HOME_POSTER_LINE_START + index * HOME_POSTER_LINE_HEIGHT}
                >
                  {line}
                </text>
              ))}
            </g>
          ))}
        </g>
        <g>
          {lines.map((line, index) => (
            <text
              key={`${line}-${index}`}
              className={s.homePosterTextLine}
              x="34"
              y={HOME_POSTER_LINE_START + index * HOME_POSTER_LINE_HEIGHT}
            >
              {line}
            </text>
          ))}
        </g>
      </svg>
    </section>
  );
}

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
      </main>

      <SiteFooter />
    </div>
  );
}
