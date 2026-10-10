import type { Metadata } from 'next';

import { GitHubStarsBadge } from '../../../components/GitHubStars';
import { SiteFooter } from '../../../components/SiteFooter';
import { SiteNav } from '../../../components/SiteNav';
import { absoluteUrl, SITE_NAME } from '../../../lib/site';
import { PluginsGallery } from './PluginsGallery';

const title = 'Flow plugins — Catalog and release status';
const description =
  'A curated catalog of schema-2 flow extensions with pinned artifacts, runtime provenance, trust tiers, and fail-closed activation gates.';

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
