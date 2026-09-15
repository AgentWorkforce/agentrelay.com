import type { Metadata } from 'next';

import { MessagingLandingPage } from '../components/home/MessagingLandingPage';
import { HOME_HERO_DESCRIPTION, HOME_HERO_TITLE } from '../lib/home-copy';
import { HOME_OG_ALT, HOME_OG_IMAGE_PATH, ogImage } from '../lib/og-meta';
import { absoluteUrl, SITE_NAME } from '../lib/site';

export const metadata: Metadata = {
  title: HOME_HERO_TITLE,
  description: HOME_HERO_DESCRIPTION,
  alternates: {
    canonical: absoluteUrl('/'),
  },
  openGraph: {
    siteName: SITE_NAME,
    title: HOME_HERO_TITLE,
    description: HOME_HERO_DESCRIPTION,
    url: absoluteUrl('/'),
    type: 'website',
    images: [ogImage(HOME_OG_IMAGE_PATH, HOME_OG_ALT)],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_HERO_TITLE,
    description: HOME_HERO_DESCRIPTION,
    images: [absoluteUrl(HOME_OG_IMAGE_PATH)],
  },
};

export default function HomePage() {
  return <MessagingLandingPage showInvestors />;
}
