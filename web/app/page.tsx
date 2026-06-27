import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteFooter } from '../components/SiteFooter';
import { SiteNav } from '../components/SiteNav';
import { HOME_OG_IMAGE_PATH, ogImage } from '../lib/og-meta';
import { absoluteUrl } from '../lib/site';
import s from './landing.module.css';

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

      <main className={s.homeMain} />

      <SiteFooter />
    </div>
  );
}
