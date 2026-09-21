import type { Metadata } from 'next';

import { GitHubStarsBadge } from '../../../components/GitHubStars';
import { SiteFooter } from '../../../components/SiteFooter';
import { SiteNav } from '../../../components/SiteNav';
import { absoluteUrl, SITE_NAME } from '../../../lib/site';
import { PluginsGallery } from './PluginsGallery';

const title = 'Flow plugins — Install onto a base flow';
const description =
  'A curated catalog of schema-2 flow extensions. Install Babysitter onto Software Garden with a pinned sha, digest, and trust tier.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: absoluteUrl('/flows/plugins'),
  },
  openGraph: {
    siteName: SITE_NAME,
    title,
    description,
    url: absoluteUrl('/flows/plugins'),
  },
};

export default function FlowPluginsPage() {
  return (
    <>
      <SiteNav actions={<GitHubStarsBadge />} />
      <PluginsGallery />
      <SiteFooter />
    </>
  );
}
