import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { HOME_OG_IMAGE_PATH, ogImage } from '../../lib/og-meta';
import { absoluteUrl } from '../../lib/site';
import s from '../landing.module.css';

export const metadata: Metadata = {
  title: 'Reflex',
  description: 'A blank Agent Relay page for the next homepage concept.',
  alternates: {
    canonical: absoluteUrl('/reflex'),
  },
  openGraph: {
    title: 'Reflex',
    description: 'A blank Agent Relay page for the next homepage concept.',
    url: absoluteUrl('/reflex'),
    type: 'website',
    images: [ogImage(HOME_OG_IMAGE_PATH, 'Reflex')],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reflex',
    description: 'A blank Agent Relay page for the next homepage concept.',
    images: [absoluteUrl(HOME_OG_IMAGE_PATH)],
  },
};

export default function ReflexPage() {
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
