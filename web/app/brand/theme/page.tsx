import type { Metadata } from 'next';

import { SiteFooter } from '../../../components/SiteFooter';
import { SiteNav } from '../../../components/SiteNav';
import { SiteNavActions } from '../../../components/SiteNavActions';
import { defaultOgImage } from '../../../lib/og-meta';
import { absoluteUrl, SITE_NAME } from '../../../lib/site';
import { ThemeShowcase } from './ThemeShowcase';

const title = 'Web Theme';
const description =
  'The Agent Relay web theme: full color palette, semantic tokens, type scale, button states, and ready-to-paste CSS snippet.';

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    'Agent Relay theme',
    'Agent Relay color palette',
    'Agent Relay design system',
    'Agent Relay CSS tokens',
    'Agent Relay semantic colors',
  ],
  alternates: {
    canonical: absoluteUrl('/brand/theme'),
  },
  openGraph: {
    siteName: SITE_NAME,
    title: `${title} · Agent Relay`,
    description,
    url: absoluteUrl('/brand/theme'),
    type: 'website',
    images: [defaultOgImage()],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} · Agent Relay`,
    description,
    images: [defaultOgImage().url],
  },
};

export default function BrandThemePage() {
  return (
    <>
      <SiteNav hideLinks singleAction actions={<SiteNavActions />} />
      <ThemeShowcase />
      <SiteFooter />
    </>
  );
}
