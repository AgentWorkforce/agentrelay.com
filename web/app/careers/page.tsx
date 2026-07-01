import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { HOME_OG_IMAGE_PATH, ogImage } from '../../lib/og-meta';
import { absoluteUrl } from '../../lib/site';
import s from '../landing.module.css';

export const metadata: Metadata = {
  title: 'Careers',
  description: 'Careers at Agent Relay.',
  alternates: {
    canonical: absoluteUrl('/careers'),
  },
  openGraph: {
    title: 'Careers',
    description: 'Careers at Agent Relay.',
    url: absoluteUrl('/careers'),
    type: 'website',
    images: [ogImage(HOME_OG_IMAGE_PATH, 'Careers')],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Careers',
    description: 'Careers at Agent Relay.',
    images: [absoluteUrl(HOME_OG_IMAGE_PATH)],
  },
};

export default function CareersPage() {
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

      <main className={`${s.homeMain} ${s.careersMain}`}>
        <section className={s.careersCallout} aria-label="Careers contact">
          <p>
            We're still figuring out the path to product market fit. As such, we don't have any open roles we're actively hiring for. However, we're always searching for strong partners and anyone who sees the same future full of Agents. If that's you, we'd love to hear from you and find the win-win.
          </p>
          <a href="mailto:hi@agentrelay.com" className={`${s.ctaPrimary} ${s.careersEmailButton}`}>
            Email us
          </a>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
